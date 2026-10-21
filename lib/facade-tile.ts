import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import earcut from 'earcut';
import {roofStyle} from './roof-material';

export interface CityTile {z:number;x:number;y:number}
export interface TileMesh extends CityTile {vertices:Float32Array;indices:Uint32Array;buildings:number;invalid:number;bytes:number}
type P=[number,number];
const EARTH=40075016.68557849,METER=1/(EARTH*Math.cos(52.505*Math.PI/180));
export const TILE_VERTEX_SIZE=18;
const EMPTY_ROOF=[0,0,0,0,0,0,0,0];
// Stable Berlin-local metric origin avoids float precision loss and texture swimming.
const ROOF_ORIGIN=[(13.4+180)/360,(1-Math.asinh(Math.tan(52.5*Math.PI/180))/Math.PI)/2];
export const tileKey=({z,x,y}:CityTile)=>`${z}/${x}/${y}`;
function signed(r:P[]){let a=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1];}return a*.5;}
function clean(r:{x:number;y:number}[],extent:number):P[]{
 const out:P[]=[];for(const p of r){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Invalid coordinate');const last=out[out.length-1];if(!last||last[0]!==p.x||last[1]!==p.y)out.push([p.x,p.y]);}
 if(out.length>1&&out[0][0]===out[out.length-1][0]&&out[0][1]===out[out.length-1][1])out.pop();
 if(out.length<3||!Number.isFinite(signed(out))||Math.abs(signed(out))<.01)throw Error('Degenerate ring');
 if(out.some(p=>Math.abs(p[0])>extent*4||Math.abs(p[1])>extent*4))throw Error('Invalid tile bounds');return out;
}
/** Clip only the real wall segment. Do not create a wall along a tile's cut line. */
function segment(a:P,b:P,e:number):[number,number]|null{
 let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1];
 for(const [p,q] of [[-dx,a[0]],[dx,e-a[0]],[-dy,a[1]],[dy,e-a[1]]]){
  if(p===0){if(q<0)return null;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>=hi)return null;}
 }
 if((a[0]<=0&&b[0]<=0)||(a[0]>=e&&b[0]>=e)||(a[1]<=0&&b[1]<=0)||(a[1]>=e&&b[1]>=e))return null;
 return [lo,hi];
}
function clipTriangle(points:P[],e:number){
 let poly=points;
 for(const [axis,bound,lower] of [[0,0,true],[0,e,false],[1,0,true],[1,e,false]] as const){
  const out:P[]=[];for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],ia=lower?a[axis]>=bound:a[axis]<=bound,ib=lower?b[axis]>=bound:b[axis]<=bound;
   if(ia)out.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }poly=out;if(!poly.length)break;
 }return poly;
}
/** Complete native MVT tile, no building count/radius/zoom selection. Runs off the UI thread. */
export function buildFacadeTile(bytes:ArrayBuffer,tile:CityTile):TileMesh{
 const vt=new VectorTile(new Pbf(new Uint8Array(bytes))),layer=vt.layers.building,values:number[]=[],indices:number[]=[];let buildings=0,invalid=0;
 if(!layer)return {...tile,vertices:new Float32Array(),indices:new Uint32Array(),buildings,invalid,bytes:0};
 const n=2**tile.z,span=1/n,meters=span/METER;
 const push=(p:P,z:number,nx:number,ny:number,roof:number,u:number,seed:number,material:number,extent:number,v=z,roofData?:number[])=>{
  const index=values.length/TILE_VERTEX_SIZE;values.push(Math.max(0,Math.min(1,p[0]/extent)),Math.max(0,Math.min(1,p[1]/extent)),z,nx,ny,roof,u,v,seed,material,...(roofData??EMPTY_ROOF));return index;
 };
 for(let fi=0;fi<layer.length;fi++){
  const feature=layer.feature(fi),p=feature.properties,height=Number(p.render_height),base=Number(p.render_min_height??0);
  if(feature.type!==3||!Number.isFinite(height)||!Number.isFinite(base)||height<=0||base<0||height<=base||p.hide_3d===true||p.hide_3d==='true'||p.hide_3d===1)continue;
  const extent=feature.extent;let raw;try{raw=feature.loadGeometry();}catch{invalid++;continue;}
  // MVT rings encode outer/hole orientation; successive outer rings are independent buildings.
  let polygon:P[][]=[];let outerSign=0;
  const emit=()=>{
   if(!polygon.length)return;const component=polygon;polygon=[];
   const outer=component[0];let area=Math.abs(signed(outer));for(const hole of component.slice(1))area-=Math.abs(signed(hole));if(!(area>0)){invalid++;return;}
   let emitted=false;
   for(let ri=0;ri<component.length;ri++){
    const ring=component[ri],orientation=Math.sign(signed(ring));
    for(let i=0;i<ring.length;i++){
     const a=ring[i],b=ring[(i+1)%ring.length],range=segment(a,b,extent);if(!range)continue;
     const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.001)continue;
     const normalSign=(ri===0?orientation:-orientation),nx=dy/len*normalSign,ny=-dx/len*normalSign;
     const aa:P=[a[0]+dx*range[0],a[1]+dy*range[0]],bb:P=[a[0]+dx*range[1],a[1]+dy*range[1]];
     let tx=dx/len,ty=dy/len;if(tx<0||tx===0&&ty<0){tx=-tx;ty=-ty;}
     // World-anchored wall plane and window phase remain identical on both sides of a tile boundary.
     const worldX=(tile.x+a[0]/extent)*meters,worldY=(tile.y+a[1]/extent)*meters;
     const plane=Math.round((worldX*-ty+worldY*tx)*.5),seed=((Math.imul(plane,31)+Math.round(height*41)+Math.round(base*17))>>>0)%1024/1024;
     const u0=((worldX*tx+worldY*ty)%1024+1024)%1024,du=(dx*tx+dy*ty)/extent*meters;
     const ua=u0+du*range[0],ub=u0+du*range[1],material=p.colour&&String(p.colour).match(/(brown|red|brick)/i)?1:seed>.76?1:0;
     const k=push(aa,base,nx,ny,0,ua,seed,material,extent);
     push(bb,base,nx,ny,0,ub,seed,material,extent);push(bb,height,nx,ny,0,ub,seed,material,extent);push(aa,height,nx,ny,0,ua,seed,material,extent);
     indices.push(k,k+1,k+2,k,k+2,k+3);emitted=true;
    }
   }
   const coords:number[]=[],holes:number[]=[];for(let r=0;r<component.length;r++){if(r)holes.push(coords.length/2);for(const point of component[r])coords.push(...point);}
   let faces:number[];try{faces=earcut(coords,holes,2);}catch{invalid++;return;}
   const cut=outer.some(point=>point[0]<=0||point[0]>=extent||point[1]<=0||point[1]>=extent);
   const mean:P=[0,0];let longest=0,heading=0;
   for(let j=0;j<outer.length;j++){
    const a=outer[j],b=outer[(j+1)%outer.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;mean[0]+=a[0]/outer.length;mean[1]+=a[1]/outer.length;
    if(!cut&&length>longest){longest=length;heading=(Math.atan2(dy,dx)+Math.PI)%Math.PI;}
   }
   const roofUv=(point:P):P=>[((tile.x+point[0]/extent)/n-ROOF_ORIGIN[0])/METER,((tile.y+point[1]/extent)/n-ROOF_ORIGIN[1])/METER];
   const center=roofUv(mean),identity=String(p.osm_id??p['@id']??(cut?'boundary':`${Math.round(center[0])}/${Math.round(center[1])}`))+`/${height}/${base}`;
   const roof=roofStyle(p,identity);
   // Largest triangle incircle: the complete decorative patch stays inside the actual roof,
   // including concave footprints and courtyard holes. Cut components omit accents to avoid duplication.
   let anchor=mean,radius=0;
   if(!cut&&roof.flatDetails)for(let i=0;i<faces.length;i+=3){
    const a:P=[coords[faces[i]*2],coords[faces[i]*2+1]],b:P=[coords[faces[i+1]*2],coords[faces[i+1]*2+1]],c:P=[coords[faces[i+2]*2],coords[faces[i+2]*2+1]];
    const la=Math.hypot(b[0]-c[0],b[1]-c[1]),lb=Math.hypot(a[0]-c[0],a[1]-c[1]),lc=Math.hypot(a[0]-b[0],a[1]-b[1]),perimeter=la+lb+lc;
    const r=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/(perimeter||1);
    if(r>radius){radius=r;anchor=[(la*a[0]+lb*b[0]+lc*c[0])/perimeter,(la*a[1]+lb*b[1]+lc*c[1])/perimeter];}
   }
   const safeRadius=Math.min(6,radius*meters/extent*.80),uvAnchor=roofUv(anchor);
   const accent=safeRadius<1.25?0:roof.seed<.38?1:roof.seed<.70?2:roof.seed<.94||safeRadius<3?3:4;
   const roofData=[...roof.color,roof.kind,uvAnchor[0],uvAnchor[1],safeRadius,accent];
   for(let i=0;i<faces.length;i+=3){
    const tri=faces.slice(i,i+3).map(j=>[coords[j*2],coords[j*2+1]] as P),clipped=clipTriangle(tri,extent);if(clipped.length<3)continue;
    const start=values.length/TILE_VERTEX_SIZE;for(const point of clipped){const uv=roofUv(point);push(point,height,0,0,1,uv[0],roof.seed,heading,extent,uv[1],roofData);}
    for(let j=1;j<clipped.length-1;j++)indices.push(start,start+j,start+j+1);emitted=true;
   }
   if(emitted)buildings++;
  };
  for(const r of raw){
   let ring:P[];try{ring=clean(r,extent);}catch{invalid++;continue;}
   const sign=Math.sign(signed(ring));if(!outerSign)outerSign=sign;
   if(sign===outerSign){emit();polygon=[ring];}else if(polygon.length)polygon.push(ring);else invalid++;
  }emit();
 }
 const vertices=new Float32Array(values),index=new Uint32Array(indices);
 return {...tile,vertices,indices:index,buildings,invalid,bytes:vertices.byteLength+index.byteLength};
}
