import type {CustomLayerInterface,CustomRenderMethodInput,Map as GLMap} from 'maplibre-gl';
import {tileKey,type CityTile,type TileMesh,TILE_VERTEX_SIZE} from './facade-tile';
import {ROOF_SHADER} from './roof-shader';

const vertex=`#version 300 es
// NOCT_CITY_FACADES: one shared program for complete building tiles.
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec2 a_meters;
layout(location=3) in vec2 a_material;
layout(location=4) in vec4 a_roofMaterial;
layout(location=5) in vec4 a_roofDetail;
uniform mat4 u_matrix;
out vec3 v_normal;out vec2 v_meters;out vec2 v_material;out vec4 v_roofMaterial;out vec4 v_roofDetail;
void main(){v_normal=a_normal;v_meters=a_meters;v_material=a_material;v_roofMaterial=a_roofMaterial;v_roofDetail=a_roofDetail;gl_Position=u_matrix*vec4(a_position,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec3 v_normal;in vec2 v_meters;in vec2 v_material;in vec4 v_roofMaterial;in vec4 v_roofDetail;
uniform float u_quality;
out vec4 fragColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float box(vec2 p,vec2 size){vec2 d=size-abs(p),aa=max(fwidth(p)*.85,vec2(.015));return smoothstep(-aa.x,aa.x,d.x)*smoothstep(-aa.y,aa.y,d.y);}
${ROOF_SHADER}
void main(){
 float seed=v_material.x;vec3 n=normalize(v_normal);
 float light=.64+.36*max(0.,dot(n,normalize(vec3(-.4,-.6,1.))));
 if(v_normal.z>.5){
  vec3 roof=roofSurface(v_meters,seed,v_material.y,v_roofMaterial,v_roofDetail);
  fragColor=vec4(pow(max(roof*light,vec3(0.)),vec3(1./2.2)),1.);return;
 }
 float palette=floor(seed*6.);vec3 base=palette<1.?vec3(.47,.50,.49):palette<2.?vec3(.57,.54,.47):palette<3.?vec3(.36,.43,.46):palette<4.?vec3(.53,.45,.39):palette<5.?vec3(.39,.43,.35):vec3(.60,.58,.54);
 float brick=step(.5,v_material.y);base=mix(base,vec3(.40,.23,.17),brick*.85);
 float pixel=max(length(dFdx(v_meters)),length(dFdy(v_meters)));
 float detail=1.-smoothstep(1.3,4.5,pixel);
 vec2 cell=floor(v_meters/vec2(3.2,3.3)),p=mod(v_meters,vec2(3.2,3.3))-vec2(1.6,1.72);
 float window=box(p,vec2(.72,.96)),frame=max(0.,box(p,vec2(.83,1.06))-window);
 float lit=step(.73,hash(cell+seed*137.));
 vec3 glass=mix(vec3(.035,.065,.092),vec3(.95,.59,.23),lit*.90);
 float mullion=1.-smoothstep(.025,.065,abs(p.x));glass=mix(glass,vec3(.12,.14,.14),mullion*.55);
 base=mix(base,base*.39,frame*.75*detail);base=mix(base,glass,window*detail);
 float sill=box(p+vec2(0.,1.08),vec2(.87,.055));base=mix(base,base*.73,sill*detail);
 float band=1.-smoothstep(.025,max(.09,fwidth(v_meters.y)),abs(mod(v_meters.y,3.3)-.09));
 base*=1.-band*.11;
 vec2 brickUv=vec2(v_meters.x/.31+mod(floor(v_meters.y/.1),2.)*.5,v_meters.y/.1);
 float mortar=max(step(.94,fract(brickUv.x)),step(.89,fract(brickUv.y)));
 base*=1.+mortar*brick*.09*(1.-smoothstep(.3,1.,max(fwidth(brickUv.x),fwidth(brickUv.y))))*u_quality;
 base*=light;base+=vec3(.16,.075,.02)*lit*window*detail;
 fragColor=vec4(pow(max(base,vec3(0.)),vec3(1./2.2)),1.);
}`;
interface Gpu {vao:WebGLVertexArrayObject;vertex:WebGLBuffer;index:WebGLBuffer;count:number}
export interface TileEntry {mesh:TileMesh;gpu?:Gpu;used:number}
/** One material program, indexed geometry per cached tile, no per-building/window draw calls. */
export class FacadeTileLayer implements CustomLayerInterface {
 readonly id='noct-procedural-facades';readonly type='custom' as const;readonly renderingMode='3d' as const;
 readonly entries=new Map<string,TileEntry>();private active=new Set<string>();private gl?:WebGL2RenderingContext;private map?:GLMap;
 private program?:WebGLProgram;private matrixLocation:WebGLUniformLocation|null=null;private qualityLocation:WebGLUniformLocation|null=null;
 private matrix=new Float32Array(16);private disposed=false;private calls=0;private frames=0;private cpu=0;private pressure=0;private previous=0;private quality=1;
 onFailure?:(error:Error)=>void;
 constructor(private mobile:boolean){}
 onAdd(map:GLMap,context:WebGLRenderingContext|WebGL2RenderingContext){
  this.map=map;const gl=context as WebGL2RenderingContext;this.gl=gl;
  let vs:WebGLShader|null=null,fs:WebGLShader|null=null,program:WebGLProgram|null=null;
  try{
   if(!gl.createVertexArray)throw Error('WebGL2 required');
   const compile=(kind:number,source:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message||'Facade shader failed');}return s;};
   vs=compile(gl.VERTEX_SHADER,vertex);fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Facade link failed');
   this.program=program;this.matrixLocation=gl.getUniformLocation(program,'u_matrix');this.qualityLocation=gl.getUniformLocation(program,'u_quality');this.quality=this.mobile?.35:1;
  }catch(error){if(program)gl.deleteProgram(program);this.onFailure?.(error instanceof Error?error:Error(String(error)));}
  finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
 }
 setActive(tiles:CityTile[]){this.active=new Set(tiles.map(tileKey));for(const key of this.active){const entry=this.entries.get(key);if(entry)entry.used=performance.now();}this.evict();}
 has(key:string){return this.entries.has(key)}
 add(mesh:TileMesh){if(this.disposed)return;const key=tileKey(mesh),old=this.entries.get(key);if(old)this.release(old);this.entries.set(key,{mesh,used:performance.now()});this.evict();this.map?.triggerRepaint();}
 private evict(){
  const budget=(this.mobile?32:96)*1024*1024,maxTiles=this.mobile?64:192;let bytes=[...this.entries.values()].reduce((s,e)=>s+e.mesh.bytes*(e.gpu?2:1),0);
  for(const [key,e] of [...this.entries].sort((a,b)=>a[1].used-b[1].used)){if(bytes<=budget&&this.entries.size<=maxTiles)break;if(this.active.has(key))continue;bytes-=e.mesh.bytes*(e.gpu?2:1);this.release(e);this.entries.delete(key);}
 }
 private upload(e:TileEntry){
  const gl=this.gl!;const vao=gl.createVertexArray()!,vertex=gl.createBuffer()!,index=gl.createBuffer()!;
  if(!vao||!vertex||!index)throw Error('Facade GPU memory unavailable');
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,e.mesh.vertices,gl.STATIC_DRAW);
  for(const [location,size,offset] of [[0,3,0],[1,3,12],[2,2,24],[3,2,32],[4,4,40],[5,4,56]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,TILE_VERTEX_SIZE*4,offset);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,e.mesh.indices,gl.STATIC_DRAW);
  e.gpu={vao,vertex,index,count:e.mesh.indices.length};
 }
 render(_context:WebGLRenderingContext|WebGL2RenderingContext,input:CustomRenderMethodInput){
  const gl=this.gl,map=this.map;if(!gl||!map||!this.program||this.disposed||document.hidden||input.defaultProjectionData.projectionTransition>0)return;
  const start=performance.now(),dt=start-this.previous;this.previous=start;this.calls=0;
  if(map.isMoving()&&dt>0&&dt<200){this.pressure=dt>38?this.pressure+1:Math.max(0,this.pressure-1);if(this.pressure>18)this.quality=.15;}
  try{
   // Upload one predicted tile while the existing camera drives this frame.
   const warm=[...this.entries].find(([key,e])=>!this.active.has(key)&&!e.gpu&&e.mesh.indices.length);if(warm)this.upload(warm[1]);
   gl.useProgram(this.program);gl.uniform1f(this.qualityLocation,this.quality);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-1);
   const m=input.defaultProjectionData.mainMatrix,units=1/(40075016.68557849*Math.cos(map.getCenter().lat*Math.PI/180));
   for(const key of this.active){
    const e=this.entries.get(key);if(!e||!e.mesh.indices.length)continue;if(!e.gpu)this.upload(e);
    const tile=e.mesh,scale=1/2**tile.z,tx=tile.x*scale,ty=tile.y*scale;
    for(let row=0;row<4;row++){this.matrix[row]=m[row]*scale;this.matrix[4+row]=m[4+row]*scale;this.matrix[8+row]=m[8+row]*units;this.matrix[12+row]=m[row]*tx+m[4+row]*ty+m[12+row];}
    gl.uniformMatrix4fv(this.matrixLocation,false,this.matrix);gl.bindVertexArray(e.gpu!.vao);gl.drawElements(gl.TRIANGLES,e.gpu!.count,gl.UNSIGNED_INT,0);this.calls++;
   }
  }catch(error){this.onFailure?.(error instanceof Error?error:Error(String(error)));}
  finally{gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindVertexArray(null);this.frames++;this.cpu+=performance.now()-start;}
 }
 stats(){const all=[...this.entries.values()],visible=[...this.active].map(k=>this.entries.get(k)).filter((e):e is TileEntry=>!!e);return {activeTiles:this.active.size,readyTiles:visible.length,residentTiles:all.length,gpuTiles:all.filter(e=>!!e.gpu).length,buildings:visible.reduce((s,e)=>s+e.mesh.buildings,0),geometryBytes:all.reduce((s,e)=>s+e.mesh.bytes,0),calls:this.calls,quality:this.quality,meanCpuMs:this.frames?this.cpu/this.frames:0,materialsReady:!!this.program};}
 private release(e:TileEntry){const gl=this.gl;if(!gl||!e.gpu)return;gl.deleteVertexArray(e.gpu.vao);gl.deleteBuffer(e.gpu.vertex);gl.deleteBuffer(e.gpu.index);e.gpu=undefined;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const e of this.entries.values())this.release(e);this.entries.clear();if(this.gl&&this.program)this.gl.deleteProgram(this.program);this.program=undefined;this.map=undefined;}
 onRemove(){this.dispose();}
}
