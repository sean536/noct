import {Matrix4} from 'three';
import {MercatorCoordinate} from 'maplibre-gl';
import type {Feature,Polygon,MultiPolygon} from 'geojson';

export type BuildingFeature=Feature<Polygon|MultiPolygon,Record<string,unknown>>;
export type Point=[number,number];
export interface FacadeBuilding {
 id:string;sourceId:string|number|null;geometry:Polygon;
 rings:Point[][];height:number;base:number;area:number;center:Point;
 seed:number;residential:boolean;commercial:boolean;industrial:boolean;
 material:'brick'|'plaster';roof:'flat'|'gabled';roofHeight:number;
}
export function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function random(seed:number,salt:number){return hash(`${seed}:${salt}`)/4294967296;}
export function geographicFrame(origin:Point){
 const o=MercatorCoordinate.fromLngLat(origin),s=o.meterInMercatorCoordinateUnits();
 // Local right-handed east / up / south meters, same frame as the existing GLB lab.
 return new Matrix4().set(s,0,0,o.x,0,0,s,o.y,0,s,0,0,0,0,0,1);
}
export function localPoint(point:Point,origin:Point):Point{
 const o=MercatorCoordinate.fromLngLat(origin),p=MercatorCoordinate.fromLngLat(point),s=o.meterInMercatorCoordinateUnits();
 return [(p.x-o.x)/s,(p.y-o.y)/s];
}
function signedArea(ring:Point[]){return ring.reduce((a,p,i)=>{const n=ring[(i+1)%ring.length];return a+p[0]*n[1]-n[0]*p[1];},0)/2;}
function canonicalRing(input:number[][]):Point[]{
 if(input.length<4||input.length>129)throw Error('Footprint vertex budget');
 let ring=input.map(p=>{
  if(p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>85)throw Error('Coordinate');
  return [Number(p[0].toFixed(7)),Number(p[1].toFixed(7))] as Point;
 });
 if(JSON.stringify(ring[0])!==JSON.stringify(ring[ring.length-1]))throw Error('Unclosed footprint');
 ring=ring.slice(0,-1).filter((p,i,a)=>i===0||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
 if(ring.length<3)throw Error('Degenerate footprint');
 const rotate=(r:Point[])=>{let k=0;for(let i=1;i<r.length;i++)if(r[i][0]<r[k][0]||(r[i][0]===r[k][0]&&r[i][1]<r[k][1]))k=i;return [...r.slice(k),...r.slice(0,k)];};
 const a=rotate(ring),b=rotate([...ring].reverse());return JSON.stringify(a)<JSON.stringify(b)?a:b;
}
function numeric(value:unknown){if(typeof value!=='number'&&typeof value!=='string')return NaN;return Number(value);}
function normalize(feature:BuildingFeature,origin:Point):FacadeBuilding{
 if(feature.geometry.type!=='Polygon'||feature.geometry.coordinates.length>8)throw Error('Multipart needs complete source geometry');
 const p=feature.properties??{},height=numeric(p.render_height??p.height),base=numeric(p.render_min_height??p.min_height??0);
 if(!(height>=4&&height<=150)||base!==0||p.hide_3d===true||p.hide_3d==='true'||p.hide_3d===1)throw Error('Unsupported height/part');
 const canonical=feature.geometry.coordinates.map(canonicalRing);
 canonical.splice(1,canonical.length-1,...canonical.slice(1).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 const geometry:Polygon={type:'Polygon',coordinates:canonical.map(r=>[...r,r[0]])};
 const rings=canonical.map((r,i)=>{let local=r.map(p=>localPoint(p,origin));if((signedArea(local)>0)!==(i===0))local=[...local].reverse();return local;});
 const outer=rings[0],center:Point=[outer.reduce((s,p)=>s+p[0],0)/outer.length,outer.reduce((s,p)=>s+p[1],0)/outer.length];
 const area=Math.abs(signedArea(outer))-rings.slice(1).reduce((s,r)=>s+Math.abs(signedArea(r)),0);
 if(area<35||area>18000||Math.hypot(...center)>480||outer.some(p=>Math.hypot(p[0]-center[0],p[1]-center[1])>180))throw Error('Prototype area budget');
 const sourceId=typeof feature.id==='number'||typeof feature.id==='string'?feature.id:null;
 const stable=p.osm_id??sourceId;
 const id=stable!==null&&stable!==undefined?`osm:${String(stable).slice(0,120)}`:`footprint:${hash(JSON.stringify(geometry))}`;
 const seed=hash(id),usage=String(p.building??p.class??'').toLowerCase();
 const residential=['apartments','residential','house','terrace','detached'].includes(usage);
 const commercial=['retail','commercial','shop'].includes(usage);
 const industrial=['industrial','warehouse','shed','garage','garages'].includes(usage);
 const roofShape=String(p['roof:shape']??p.roof_shape??'flat');
 // Only supported, explicitly tagged rectangular roofs; no guessed roof shape on irregular blocks.
 const u=outer[1].map((n,i)=>n-outer[0][i]),v=outer[3]?.map((n,i)=>n-outer[0][i]);
 const rectangle=outer.length===4&&rings.length===1&&v&&Math.abs(u[0]*v[0]+u[1]*v[1])<.02*Math.hypot(...u)*Math.hypot(...v)
  &&Math.hypot(outer[2][0]-outer[1][0]-outer[3][0]+outer[0][0],outer[2][1]-outer[1][1]-outer[3][1]+outer[0][1])<.1;
 const roof=rectangle&&roofShape==='gabled'?'gabled':'flat';
 const taggedRoof=numeric(p['roof:height']??p.roof_height);
 const roofHeight=roof==='gabled'?Math.min(height*.22,Number.isFinite(taggedRoof)&&taggedRoof>0?taggedRoof:2.6):0;
 return {id,sourceId,geometry,rings,height,base,area,center,seed,residential,commercial,industrial,material:String(p['building:material']??p.material)==='brick'||random(seed,1)>.74?'brick':'plaster',roof,roofHeight};
}
export function selectBuildings(features:BuildingFeature[],origin:Point,limit=16){
 const byId=new Map<string,FacadeBuilding>(),conflicts=new Set<string>();let rejected=0;
 for(const f of features.slice(0,4096)){
  try{const b=normalize(f,origin),previous=byId.get(b.id);
   if(previous&&JSON.stringify(previous.geometry)!==JSON.stringify(b.geometry)){conflicts.add(b.id);rejected++;}
   else if(!previous)byId.set(b.id,b);
  }catch{rejected++;}
 }
 const geometryOwners=new Map<string,string>();
 for(const b of byId.values()){
  const key=JSON.stringify(b.geometry),owner=geometryOwners.get(key);
  if(owner&&owner!==b.id){conflicts.add(owner);conflicts.add(b.id);}else geometryOwners.set(key,b.id);
 }
 const buildings=[...byId.values()].filter(b=>!conflicts.has(b.id)).sort((a,b)=>Math.hypot(...a.center)-Math.hypot(...b.center)||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(20,limit)));
 return {buildings,rejected:rejected+conflicts.size};
}
export function facadeLod(zoom:number,distance:number,balconyZoom=17){return {visible:zoom>=14&&distance<900,windows:zoom>=15.4&&distance<650,balconies:zoom>=balconyZoom&&distance<260};}

/** Explicitly synthetic QA geometry, never used as a silent Berlin data fallback. */
export function fixtureBuildings(origin:Point):BuildingFeature[]{
 const o=MercatorCoordinate.fromLngLat(origin),s=o.meterInMercatorCoordinateUnits();
 const coordinate=(x:number,z:number)=>{const p=new MercatorCoordinate(o.x+x*s,o.y+z*s).toLngLat();return [p.lng,p.lat];};
 return Array.from({length:16},(_,i)=>{
  const x=(i%4-1.5)*52,z=(Math.floor(i/4)-1.5)*55,w=25+i%3*3,d=20+i%2*5;
  const ring=[[x,z],[x+w,z],[x+w,z+d],[x,z+d],[x,z]].map(p=>coordinate(p[0],p[1]));
  const coordinates=[ring];if(i===5)coordinates.push([[x+7,z+6],[x+7,z+d-6],[x+w-7,z+d-6],[x+w-7,z+6],[x+7,z+6]].map(p=>coordinate(p[0],p[1])));
  return {type:'Feature',id:`qa-${i}`,properties:{render_height:14+(i%5)*3.5,building:i===2?'retail':i===8?'industrial':'apartments','roof:shape':i%3===0?'gabled':'flat','roof:height':2.4},geometry:{type:'Polygon',coordinates}};
 });
}
