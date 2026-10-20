/** SIMULATION: procedural vehicles on loaded OSM roads. No live traffic positions. */
export type Point=[number,number];
export interface TrafficFeature {id?:string|number;properties?:Record<string,unknown>|null;geometry:{type:string;coordinates:unknown}}
export interface Footprint {rings:Point[][];bounds:[number,number,number,number]}
export interface TrafficRoute {id:string;points:Point[];lengths:number[];length:number;speed:number;direction:1|-1;seed:number}
export const TRAFFIC_ORIGIN:Point=[13.429,52.505];
const radius=6378137,rad=Math.PI/180,scale=1/Math.cos(TRAFFIC_ORIGIN[1]*rad);
const ox=TRAFFIC_ORIGIN[0]*rad*radius,oy=Math.log(Math.tan(Math.PI/4+TRAFFIC_ORIGIN[1]*rad/2))*radius;
export function localPoint(point:Point):Point{return [(point[0]*rad*radius-ox)/scale,(oy-Math.log(Math.tan(Math.PI/4+point[1]*rad/2))*radius)/scale]}
export function bounds(points:Point[]):[number,number,number,number]{let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity;for(const p of points){x=Math.min(x,p[0]);y=Math.min(y,p[1]);r=Math.max(r,p[0]);b=Math.max(b,p[1])}return [x,y,r,b]}
const finite=(p:unknown):p is Point=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85;
const overlap=(a:number[],b:number[],pad=0)=>a[0]-pad<=b[2]&&a[2]+pad>=b[0]&&a[1]-pad<=b[3]&&a[3]+pad>=b[1];
function inside(p:Point,ring:Point[]){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function pointSegment(p:Point,a:Point,b:Point){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function cross(a:Point,b:Point,c:Point){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function segmentDistance(a:Point,b:Point,c:Point,d:Point){
 if(Math.min(a[0],b[0])<=Math.max(c[0],d[0])&&Math.max(a[0],b[0])>=Math.min(c[0],d[0])&&Math.min(a[1],b[1])<=Math.max(c[1],d[1])&&Math.max(a[1],b[1])>=Math.min(c[1],d[1])&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return 0;
 return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
export function roadClear(points:Point[],buildings:Footprint[]){
 const box=bounds(points);
 for(const building of buildings){
  if(!overlap(box,building.bounds,4))continue;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   if((inside(a,building.rings[0])&&!building.rings.slice(1).some(r=>inside(a,r)))||(inside(b,building.rings[0])&&!building.rings.slice(1).some(r=>inside(b,r))))return false;
   for(const ring of building.rings)for(let j=1;j<ring.length;j++)if(segmentDistance(a,b,ring[j-1],ring[j])<4)return false;
  }
 }
 return true;
}
export function footprints(features:TrafficFeature[],center:Point):Footprint[]{
 const result:Footprint[]=[];
 if(features.length>8000)return []; // Conservative CPU bound: omit traffic rather than ignore unknown footprints.
 for(const feature of features){
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[];
  if(!Array.isArray(polygons))continue;
  for(const polygon of polygons){
   if(!Array.isArray(polygon)||!polygon.length)continue;
   const rings:Point[][]=[];
   for(const ring of polygon){if(!Array.isArray(ring)||ring.length<4||!ring.every(finite))return [];const projected=(ring as Point[]).map(localPoint);if(projected.length>1024){const b=bounds(projected);rings.push([[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]])}else rings.push(projected)}
   if(!rings.length)continue;const box=bounds(rings[0]);if(!overlap(box,[center[0]-1000,center[1]-1000,center[0]+1000,center[1]+1000]))continue;
   result.push({rings,bounds:box});
  }
 }
 return result;
}
class BuildingIndex {
 private cells=new Map<string,Set<Footprint>>();
 constructor(buildings:Footprint[],private center:Point){for(const building of buildings)for(const key of this.keys(building.bounds)){const cell=this.cells.get(key)??new Set<Footprint>();cell.add(building);this.cells.set(key,cell)}}
 private keys(box:number[]){const keys:string[]=[];for(let x=Math.floor(Math.max(box[0]-4,this.center[0]-1200)/80);x<=Math.floor(Math.min(box[2]+4,this.center[0]+1200)/80);x++)for(let y=Math.floor(Math.max(box[1]-4,this.center[1]-1200)/80);y<=Math.floor(Math.min(box[3]+4,this.center[1]+1200)/80);y++)keys.push(`${x}/${y}`);return keys}
 near(box:number[]){const result=new Set<Footprint>();for(const key of this.keys(box))for(const b of this.cells.get(key)??[])result.add(b);return [...result]}
}
function hash(value:string){let result=2166136261;for(let i=0;i<value.length;i++)result=Math.imul(result^value.charCodeAt(i),16777619);return (result>>>0)/4294967296}
export function trafficRoutes(roads:TrafficFeature[],buildings:Footprint[],center:Point,limit=80):TrafficRoute[]{
 if(!buildings.length)return []; // No known building data => no invented safe routes.
 const seen=new Set<string>(),result:TrafficRoute[]=[],index=new BuildingIndex(buildings,center);
 for(const road of roads.slice(0,1200)){
  const p=road.properties??{},kind=String(p.class??'');
  if(p.oneway!==undefined&&p.oneway!==null&&!['-1','0','1'].includes(String(p.oneway)))continue;
  if(!['primary','secondary','tertiary','minor','service'].includes(kind)||p.brunnel==='bridge'||p.brunnel==='tunnel'||Number(p.layer??0)!==0||Number(p.level??0)!==0||p.ramp===1||p.indoor===true||p.indoor===1||p.indoor==='yes'||['no','private'].includes(String(p.access))||['parking_aisle','driveway'].includes(String(p.service)))continue;
  const lines=road.geometry.type==='LineString'?[road.geometry.coordinates]:road.geometry.type==='MultiLineString'?road.geometry.coordinates:[];
  if(!Array.isArray(lines))continue;
  for(const line of lines){
   if(!Array.isArray(line)||line.length<2||line.length>180||!line.every(finite))continue;
   let points=(line as Point[]).map(localPoint).filter((point,i,all)=>i===0||Math.hypot(point[0]-all[i-1][0],point[1]-all[i-1][1])>.2);
   if(points.length<2||!overlap(bounds(points),[center[0]-850,center[1]-850,center[0]+850,center[1]+850]))continue;
   const id=JSON.stringify(line),seed=hash(id);if(seen.has(id))continue;seen.add(id);
   if(Number(p.oneway)===-1)points=points.reverse();
   const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
   const length=lengths.at(-1)!;if(length<45||length>4000)continue;
   if(!roadClear(points,index.near(bounds(points))))continue;
   result.push({id,points,lengths,length,speed:(kind==='primary'?8.5:kind==='service'?3.5:5.5)*(0.9+seed*.25),direction:Number(p.oneway)!==0&&p.oneway!==undefined?1:seed>.5?1:-1,seed});
   if(result.length>=limit)return result;
  }
 }
 return result;
}
/** Deterministic continuous travel; fade before tile-clipped endpoints, never connect unrelated roads. */
export function vehicleAt(route:TrafficRoute,seconds:number){
 const distance=((seconds*route.speed+route.seed*route.length)%route.length+route.length)%route.length;
 const d=route.direction===1?distance:route.length-distance;let low=1,high=route.lengths.length-1;
 while(low<high){const mid=(low+high)>>1;if(route.lengths[mid]<d)low=mid+1;else high=mid}
 const a=route.points[low-1],b=route.points[low],length=route.lengths[low]-route.lengths[low-1],t=(d-route.lengths[low-1])/length;
 const dx=(b[0]-a[0])/length*route.direction,dy=(b[1]-a[1])/length*route.direction;
 const fade=Math.max(0,Math.min(1,(Math.min(d,route.length-d)-4)/12));
 return {x:a[0]+(b[0]-a[0])*t-dy,y:a[1]+(b[1]-a[1])*t+dx,dx,dy,alpha:fade};
}
/** Bounded CPU/frame proxy, not a GPU measurement. Degrade first; recover slowly. */
export class TrafficBudget {
 private samples:number[]=[];private last=0;private count:number;
 constructor(private maximum:number){this.count=maximum}
 get limit(){return this.count}
 reduce(){this.count=this.count>6?Math.floor(this.count/2):0}
 sample(now:number,frameMs:number,cpuMs:number){
  this.samples.push(Math.max(frameMs,cpuMs>1.5?50:0));if(this.samples.length<40||now-this.last<3000)return;
  const values=this.samples.splice(0).sort((a,b)=>a-b),p75=values[Math.floor(values.length*.75)];this.last=now;
  if(p75>38)this.reduce();
  else if(p75<24&&this.count<this.maximum)this.count=Math.min(this.maximum,this.count+4);
 }
}
