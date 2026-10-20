import {BoxGeometry,BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group,InstancedMesh,Matrix4,Mesh,Quaternion,ShaderMaterial,ShapeUtils,Vector2,Vector3} from 'three';
import {random,type FacadeBuilding,type Point} from './data';

const vertex=`
 attribute float aSeed;
 attribute vec4 aSurface;
 varying vec2 vMeters;
 varying vec4 vSurface;
 varying float vSeed;
 varying vec3 vNormal;
 void main(){
  vMeters=uv;vSurface=aSurface;vSeed=aSeed;vNormal=normal;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
 }`;
const fragment=`
 precision highp float;
 uniform float uNight;
 uniform float uDetail;
 varying vec2 vMeters;
 varying vec4 vSurface;
 varying float vSeed;
 varying vec3 vNormal;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+vSeed*230.0)*43758.5453);}
 float box(vec2 p,vec2 halfSize){vec2 edge=halfSize-abs(p);vec2 aa=max(fwidth(p)*1.1,vec2(.008));return smoothstep(-aa.x,aa.x,edge.x)*smoothstep(-aa.y,aa.y,edge.y);}
 void main(){
  float palette=floor(vSeed*5.0);
  vec3 plaster=palette<1.0?vec3(.64,.58,.49):palette<2.0?vec3(.70,.68,.62):palette<3.0?vec3(.53,.57,.56):palette<4.0?vec3(.65,.60,.55):vec3(.48,.47,.43);
  float brick=step(.5,vSurface.z),industrial=step(1.5,vSurface.w);
  vec3 base=mix(plaster,vec3(.39,.21,.15),brick);
  float grain=hash(floor(vMeters*9.0));
  base*=.975+.045*grain;
  // Subtle mortar, fades naturally when its projected frequency exceeds the pixel budget.
  vec2 brickUV=vec2(vMeters.x/.3+mod(floor(vMeters.y/.09),2.0)*.5,vMeters.y/.09);
  float mortar=step(.93,fract(brickUV.x))+step(.87,fract(brickUV.y));
  float brickLod=1.0-smoothstep(.3,1.0,max(fwidth(brickUV.x),fwidth(brickUV.y)));
  base=mix(base,base*1.22,clamp(mortar,0.0,1.0)*brick*.24*brickLod*uDetail);
  float floors=max(1.0,floor(vSurface.y/3.25));
  float storey=vSurface.y/floors;
  float bay=max(2.4,vSurface.x/max(1.0,floor(vSurface.x/(industrial>.5?4.8:3.0+vSeed*.45))));
  vec2 cell=vec2(floor(vMeters.x/bay),floor(vMeters.y/storey));
  vec2 p=vec2(mod(vMeters.x,bay)-bay*.5,mod(vMeters.y,storey)-storey*.52);
  vec2 windowSize=vec2(industrial>.5?1.0:.65,industrial>.5?.65:.86);
  float window=box(p,windowSize),frame=box(p,windowSize+vec2(.09))-window;
  float lit=step(.72,hash(cell+vec2(21.0,7.0)))*uNight;
  vec3 glass=mix(vec3(.075,.115,.15),vec3(1.0,.66,.29),lit*.9);
  float mullion=1.0-smoothstep(.018,.045,abs(p.x));
  glass=mix(glass,vec3(.23,.24,.23),mullion*.7);
  base=mix(base,base*.55,frame*.75*uDetail);
  base=mix(base,glass,window*uDetail);
  float ground=1.0-step(storey,vMeters.y);
  float entry=ground*step(.86,hash(vec2(cell.x,33.0)))*box(vec2(p.x,vMeters.y-1.18),vec2(.63,1.16));
  float shop=ground*(1.0-industrial)*step(.5,vSurface.w)*box(vec2(p.x,vMeters.y-1.3),vec2(bay*.36,1.1));
  base=mix(base,vec3(.10,.13,.14),max(entry,shop)*uDetail);
  float sill=box(vec2(p.x,p.y+windowSize.y+.10),vec2(windowSize.x+.14,.06));
  base=mix(base,plaster*.82,sill*uDetail);
  float cornice=1.0-smoothstep(.035,.09,abs(mod(vMeters.y,storey)-.12));
  base*=1.0-cornice*.1*uDetail;
  float corner=min(vMeters.x,vSurface.x-vMeters.x);
  base*=mix(.8,1.0,smoothstep(0.0,.22,corner));
  float sun=max(0.0,dot(normalize(vNormal),normalize(vec3(-.6,.75,.35))));
  base*=mix(.68+sun*.32,.43+sun*.25,uNight);
  base+=vec3(1.0,.55,.20)*lit*window*.22*uDetail;
  gl_FragColor=vec4(base,1.0);
  #include <colorspace_fragment>
 }`;
const solidVertex=`
 varying vec3 vNormal;
 void main(){vec4 p=vec4(position,1.0);vNormal=normal;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;vNormal=normalize(mat3(instanceMatrix)*normal);
 #endif
 gl_Position=projectionMatrix*modelViewMatrix*p;}`;
const solidFragment=`
 uniform vec3 uColor;uniform float uNight;varying vec3 vNormal;
 void main(){float light=max(0.0,dot(normalize(vNormal),normalize(vec3(-.6,.75,.35))));
 gl_FragColor=vec4(uColor*mix(.65+light*.35,.37+light*.28,uNight),1.0);
 #include <colorspace_fragment>
 }`;
type Buffers={position:number[];normal:number[];uv:number[];aSeed:number[];aSurface:number[]};
const empty=():Buffers=>({position:[],normal:[],uv:[],aSeed:[],aSurface:[]});
function triangle(buffer:Buffers,points:Vector3[],normal:Vector3,uv:Point[],b:FacadeBuilding,width:number){
 for(let i=0;i<3;i++){
  buffer.position.push(...points[i].toArray());buffer.normal.push(...normal.toArray());buffer.uv.push(...uv[i]);
  buffer.aSeed.push(b.seed/4294967296);buffer.aSurface.push(width,b.height-b.roofHeight,b.material==='brick'?1:0,b.industrial?2:b.commercial?1:0);
 }
}
function geometry(buffer:Buffers){
 const result=new BufferGeometry();
 for(const [name,size] of [['position',3],['normal',3],['uv',2],['aSeed',1],['aSurface',4]] as const)result.setAttribute(name,new Float32BufferAttribute(buffer[name],size));
 result.computeBoundingBox();result.computeBoundingSphere();return result;
}
export interface FacadeScene {
 group:Group;walls:Mesh<BufferGeometry,ShaderMaterial>;roofs:Mesh<BufferGeometry,ShaderMaterial>;
 balconies:InstancedMesh<BoxGeometry,ShaderMaterial>;balconyCount:number;
 metrics:{triangles:number;geometryBytes:number;instanceBytes:number;buildings:number};
 setNight(night:boolean):void;setDetail(windows:boolean,balconies:boolean):void;dispose():void;
}
export function createFacadeScene(buildings:FacadeBuilding[],_origin:Point,mobile:boolean):FacadeScene{
 const group=new Group(),wallBuffer=empty(),roofBuffer=empty(),balconyTransforms:Matrix4[]=[];
 const balconyLimit=mobile?72:180;
 const box=(center:Vector3,scale:Vector3,rotation:number)=>{if(balconyTransforms.length<balconyLimit*5)balconyTransforms.push(new Matrix4().compose(center,new Quaternion().setFromAxisAngle(new Vector3(0,1,0),rotation),scale));};
 for(const b of buildings){
  const wallTop=b.height-b.roofHeight;
  for(const [ringIndex,ring] of b.rings.entries())for(let i=0;i<ring.length;i++){
   const a=ring[i],c=ring[(i+1)%ring.length],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz);
   if(length<.3)continue;
   const normal=new Vector3(dz/length,0,-dx/length);
   const points=[new Vector3(a[0],0,a[1]),new Vector3(c[0],0,c[1]),new Vector3(c[0],wallTop,c[1]),new Vector3(a[0],wallTop,a[1])];
   triangle(wallBuffer,[points[0],points[1],points[2]],normal,[[0,0],[length,0],[length,wallTop]],b,length);
   triangle(wallBuffer,[points[0],points[2],points[3]],normal,[[0,0],[length,wallTop],[0,wallTop]],b,length);
   const floors=Math.max(1,Math.floor(wallTop/3.25)),bay=length/Math.max(1,Math.floor(length/(3+b.seed/4294967296*.45)));
   // Only explicitly residential outer walls. No guessed balconies on factories/unknown usage.
   if(b.residential&&ringIndex===0&&length>9&&length<85&&random(b.seed,i+7)>.35){
    for(let f=1;f<floors;f++)for(let j=1;j<Math.floor(length/bay)-1;j++){
     if(random(b.seed,f*97+i*11+j)<.54||balconyTransforms.length>=balconyLimit*5)continue;
     const distance=(j+.5)*bay,y=f*wallTop/floors+.1,rotation=Math.atan2(-dz,dx),cx=a[0]+dx/length*distance+normal.x*.5,cz=a[1]+dz/length*distance+normal.z*.5;
     box(new Vector3(cx,y,cz),new Vector3(2.1,.14,1.0),rotation);
     box(new Vector3(cx+normal.x*.5,y+.62,cz+normal.z*.5),new Vector3(2.1,.95,.055),rotation);
     for(const sign of [-1,1])box(new Vector3(cx+dx/length*sign*1.02,y+.62,cz+dz/length*sign*1.02),new Vector3(.055,.95,1),rotation);
     box(new Vector3(cx+normal.x*.52,y+1.12,cz+normal.z*.52),new Vector3(2.15,.045,.08),rotation);
    }
   }
  }
  const contour=b.rings[0].map(p=>new Vector2(...p)),holes=b.rings.slice(1).map(r=>r.map(p=>new Vector2(...p)));
  const flat=b.rings.flat(),faces=ShapeUtils.triangulateShape(contour,holes);
  if(b.roof==='gabled'){
   // Normalization guarantees a rectangle. Ridge follows its longer edge, within the tagged total height.
   const r=b.rings[0],sideA=Math.hypot(r[1][0]-r[0][0],r[1][1]-r[0][1]),sideB=Math.hypot(r[3][0]-r[0][0],r[3][1]-r[0][1]);
   const ids=sideA>=sideB?[0,1,2,3]:[1,2,3,0],v=ids.map(i=>new Vector3(r[i][0],wallTop,r[i][1]));
   const m0=v[0].clone().add(v[3]).multiplyScalar(.5);m0.y=b.height;
   const m1=v[1].clone().add(v[2]).multiplyScalar(.5);m1.y=b.height;
   for(const tri of [[v[0],v[1],m1],[v[0],m1,m0],[m0,m1,v[2]],[m0,v[2],v[3]]]){
    const n=tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0])).normalize();if(n.y<0)n.negate();
    triangle(roofBuffer,tri,n,[[0,0],[0,0],[0,0]],b,0);
   }
   for(const [end,ridge] of [[[v[0],v[3]],m0],[[v[1],v[2]],m1]] as [Vector3[],Vector3][]){
    const n=end[1].clone().sub(end[0]).cross(ridge.clone().sub(end[0])).normalize();
    triangle(roofBuffer,[end[0],end[1],ridge],n,[[0,0],[0,0],[0,0]],b,0);
   }
  }else for(const face of faces)triangle(roofBuffer,face.map(i=>new Vector3(flat[i][0],b.height,flat[i][1])),new Vector3(0,1,0),[[0,0],[0,0],[0,0]],b,0);
 }
 const wallMaterial=new ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:DoubleSide,uniforms:{uNight:{value:1},uDetail:{value:1}}});
 const solid=(color:string)=>new ShaderMaterial({vertexShader:solidVertex,fragmentShader:solidFragment,side:DoubleSide,uniforms:{uColor:{value:new Color(color)},uNight:{value:1}}});
 const walls=new Mesh(geometry(wallBuffer),wallMaterial),roofs=new Mesh(geometry(roofBuffer),solid('#555c61'));
 const balconies=new InstancedMesh(new BoxGeometry(1,1,1),solid('#62645e'),Math.max(1,balconyTransforms.length));
 balconyTransforms.forEach((matrix,i)=>balconies.setMatrixAt(i,matrix));balconies.count=balconyTransforms.length;balconies.instanceMatrix.needsUpdate=true;
 // MapLibre supplies the projection. Its clipping differs from Three's world camera frustum.
 for(const mesh of [walls,roofs,balconies])mesh.frustumCulled=false;
 group.add(walls,roofs,balconies);
 const meshes=[walls,roofs,balconies],geometryBytes=meshes.reduce((sum,m)=>sum+Object.values(m.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(m.geometry.index?.array.byteLength??0),0);
 const metrics={buildings:buildings.length,triangles:wallBuffer.position.length/9+roofBuffer.position.length/9+balconyTransforms.length*12,geometryBytes,instanceBytes:balconies.instanceMatrix.array.byteLength};
 let disposed=false;
 return {group,walls,roofs,balconies,balconyCount:balconyTransforms.length/5,metrics,
  setNight(night){for(const m of meshes)m.material.uniforms.uNight.value=night?1:0;},
  setDetail(windows,balcony){wallMaterial.uniforms.uDetail.value=windows?1:0;balconies.visible=balcony&&balconyTransforms.length>0;},
  dispose(){if(disposed)return;disposed=true;for(const m of meshes){m.geometry.dispose();m.material.dispose();}balconies.dispose();group.clear();}
 };
}
