import type {CustomLayerInterface,CustomRenderMethodInput,Map as GLMap,MapSourceDataEvent} from 'maplibre-gl';
import {TrafficBudget,TRAFFIC_ORIGIN,localPoint,footprints,trafficRoutes,vehicleAt,type TrafficRoute,type TrafficFeature} from './traffic';
import type {RenderProfile} from './rendering';

const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 a_vertex;
layout(location=1) in vec3 a_normal;
layout(location=2) in float a_glass;
layout(location=3) in vec4 a_pose;
layout(location=4) in vec4 a_color;
uniform mat4 u_matrix;
uniform float u_fade;
out vec4 v_color;
void main(){
 vec2 f=a_pose.zw;vec2 right=vec2(-f.y,f.x);
 vec2 point=a_pose.xy+f*a_vertex.x+right*a_vertex.y;
 vec3 normal=vec3(f*a_normal.x+right*a_normal.y,a_normal.z);
 float light=.68+.32*max(dot(normal,normalize(vec3(-.4,-.6,1.))),0.);
 float alpha=a_color.a*u_fade;
 vec3 color=mix(a_color.rgb,vec3(.15,.2,.25),a_glass)*light;
 v_color=vec4(color*alpha,alpha);
 gl_Position=u_matrix*vec4(point,a_vertex.z,1.);
}`;
const fragment=`#version 300 es
precision mediump float;
in vec4 v_color;out vec4 fragColor;
void main(){if(v_color.a<.02)discard;fragColor=v_color;}`;
function vehicleMesh(){
 const data:number[]=[];
 const box=(x:number,y:number,z0:number,z1:number,glass:number)=>{
  const p=[[-x,-y,z0],[x,-y,z0],[x,y,z0],[-x,y,z0],[-x,-y,z1],[x,-y,z1],[x,y,z1],[-x,y,z1]];
  const faces:[number[],number[]][]=[[[4,5,6,7],[0,0,1]],[[0,1,5,4],[0,-1,0]],[[1,2,6,5],[1,0,0]],[[2,3,7,6],[0,1,0]],[[3,0,4,7],[-1,0,0]],[[0,3,2,1],[0,0,-1]]];
  for(const [face,normal] of faces)for(const i of [0,1,2,0,2,3])data.push(...p[face[i]],...normal,glass);
 };
 box(2.15,.88,.12,.88,0);box(1.05,.73,.88,1.42,1);return new Float32Array(data);
}
const mesh=vehicleMesh();
const colors=[[.82,.79,.72],[.18,.23,.29],[.46,.5,.52],[.48,.27,.24],[.72,.73,.72]];
/** One shared two-box mesh and one instanced draw. MapLibre restores its GL state after custom layers. */
export class TrafficLayer implements CustomLayerInterface {
 readonly id='simulated-road-traffic';readonly type='custom' as const;readonly renderingMode='3d' as const;
 private map:GLMap|undefined;private gl:WebGL2RenderingContext|undefined;private program:WebGLProgram|undefined;
 private vao:WebGLVertexArrayObject|null=null;private geometry:WebGLBuffer|null=null;private instances:WebGLBuffer|null=null;
 private matrixLocation:WebGLUniformLocation|null=null;private fadeLocation:WebGLUniformLocation|null=null;
 private budget:TrafficBudget;private routes:TrafficRoute[]=[];private enabled=true;private disposed=false;
 private updateTimer:ReturnType<typeof setTimeout>|undefined;private repaintTimer:ReturnType<typeof setTimeout>|undefined;
 private refreshGap=2400;private failed=false;private lastRefresh=0;private previousFrame=0;private previousUpdate=-Infinity;private count=0;
 private data:Float32Array;private matrix=new Float32Array(16);private lastCpu=0;private frames=0;private totalCpu=0;
 private origin={x:(TRAFFIC_ORIGIN[0]+180)/360,y:(1-Math.asinh(Math.tan(TRAFFIC_ORIGIN[1]*Math.PI/180))/Math.PI)/2};
 private units=1/(40075016.68557849*Math.cos(TRAFFIC_ORIGIN[1]*Math.PI/180));
 constructor(private profile:RenderProfile,private diagnostics:(text:string)=>void){const maximum=profile.tier==='economy'?10:profile.tier==='quality'?48:24;this.budget=new TrafficBudget(maximum);this.data=new Float32Array(maximum*8)}
 private sourceData=(event:MapSourceDataEvent)=>{
  if(event.sourceId==='buildings'&&event.tile?.state==='loaded')this.scheduleRefresh();
 };
 private lost=()=>{this.failed=true;this.enabled=false;this.cancelTimers();this.routes=[]};
 private restored=()=>{this.diagnostics('Verkehrssimulation nach WebGL-Kontextverlust deaktiviert.');};
 private visibility=()=>{if(document.hidden)this.cancelTimers();else if(this.enabled)this.map?.triggerRepaint()};
 private scheduleRefresh(){
  if(this.disposed||!this.enabled||this.updateTimer||!this.gl||document.hidden)return;
  this.updateTimer=setTimeout(()=>{this.updateTimer=undefined;this.refresh()},Math.max(250,this.refreshGap-(performance.now()-this.lastRefresh)));
 }
 private refresh(){
  if(!this.map||!this.enabled||this.disposed||document.hidden||this.map.getZoom()<14.8||this.budget.limit===0)return;
  this.lastRefresh=performance.now();
  // Queries reuse raw data in already loaded tiles; no new traffic source or network requests.
  try{
   const here=this.map.getCenter(),center=localPoint([here.lng,here.lat]);
   const buildings=footprints(this.map.querySourceFeatures('buildings',{sourceLayer:'building'}) as TrafficFeature[],center);
   const roads=this.map.querySourceFeatures('buildings',{sourceLayer:'transportation',filter:['in','class','primary','secondary','tertiary','minor','service']}) as TrafficFeature[];
   const next=trafficRoutes(roads,buildings,center,Math.max(10,this.data.length/8));
   const previous=new Map(this.routes.map(route=>[route.id,route]));this.routes=next.map(route=>previous.get(route.id)??route);
   const cpu=performance.now()-this.lastRefresh;
   if(cpu>16){this.budget.reduce();this.refreshGap=Math.min(8000,this.refreshGap+1200)}
   this.diagnostics(`Verkehr: Simulation, ${this.routes.length} geprüfte Straßenrouten, Limit ${this.budget.limit}, Routenaufbau ${cpu.toFixed(1)} ms, Fahrzeug-Update/Drawing-Aufruf Ø ${this.stats().meanCpuMs.toFixed(2)} ms (CPU, keine GPU-Zeit).`);
   this.map.triggerRepaint();
  }catch{this.routes=[];this.diagnostics('Verkehr: Simulation ohne nutzbare Straßendaten ausgeblendet.')}
 }
 onAdd(map:GLMap,context:WebGLRenderingContext|WebGL2RenderingContext){
  this.map=map;
  if(!('drawArraysInstanced' in context)){this.diagnostics('Verkehrssimulation: Instancing nicht verfügbar.');return;}
  const gl=context as WebGL2RenderingContext;this.gl=gl;
  const previousVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject|null,previousBuffer=gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer|null;
  const shaders:WebGLShader[]=[];
  try{
   const compile=(kind:number,source:string)=>{const shader=gl.createShader(kind)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Vehicle shader unavailable')}shaders.push(shader);return shader};
   const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);shaders.length=0;
   if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw Error('Vehicle program unavailable')}
   this.program=program;this.matrixLocation=gl.getUniformLocation(program,'u_matrix');this.fadeLocation=gl.getUniformLocation(program,'u_fade');
   this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
   this.geometry=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.geometry);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
   for(const [location,size,offset] of [[0,3,0],[1,3,12],[2,1,24]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,28,offset)}
   this.instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);
   for(const [location,offset] of [[3,0],[4,16]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,4,gl.FLOAT,false,32,offset);gl.vertexAttribDivisor(location,1)}
   gl.bindVertexArray(null);
   map.on('sourcedata',this.sourceData);map.on('moveend',this.scheduleMoveRefresh);map.on('webglcontextlost',this.lost);map.on('webglcontextrestored',this.restored);document.addEventListener('visibilitychange',this.visibility);
   this.scheduleRefresh();
  }catch{for(const shader of shaders)gl.deleteShader(shader);this.failed=true;this.releaseGL();this.diagnostics('Verkehrssimulation: GPU-Prototyp auf diesem Gerät nicht verfügbar.')}
  finally{gl.bindVertexArray(previousVAO);gl.bindBuffer(gl.ARRAY_BUFFER,previousBuffer)}
 }
 private scheduleMoveRefresh=()=>this.scheduleRefresh();
 setActive(active:boolean){if(this.failed)active=false;if(this.enabled===active)return;this.enabled=active;if(!active)this.cancelTimers();else{this.previousFrame=0;this.scheduleRefresh();this.map?.triggerRepaint()}}
 private cancelTimers(){if(this.updateTimer)clearTimeout(this.updateTimer);if(this.repaintTimer)clearTimeout(this.repaintTimer);this.updateTimer=undefined;this.repaintTimer=undefined}
 render(_context:WebGLRenderingContext|WebGL2RenderingContext,options:CustomRenderMethodInput){
  const gl=this.gl,map=this.map;if(!gl||!map||!this.program||!this.enabled||this.disposed||document.hidden||options.defaultProjectionData.projectionTransition>0)return;
  const zoom=map.getZoom(),fade=Math.max(0,Math.min(1,(zoom-14.8)/.7));if(fade<=0)return;
  const now=performance.now(),interval=now-this.previousFrame;this.previousFrame=now;
  const started=performance.now();
  if(now-this.previousUpdate>=1000/30){
   this.previousUpdate=now;const center=localPoint([map.getCenter().lng,map.getCenter().lat]);let count=0;
   for(const route of this.routes){
    if(count>=this.budget.limit)break;const car=vehicleAt(route,now/1000);if(car.alpha<=.01||Math.hypot(car.x-center[0],car.y-center[1])>1100)continue;
    const color=colors[Math.floor(route.seed*colors.length)];this.data.set([car.x,car.y,car.dx,car.dy,...color,car.alpha],count*8);count++;
   }
   this.count=count;gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,count*8));
  }
  if(this.count){
   const input=options.defaultProjectionData.mainMatrix;
   for(let row=0;row<4;row++){this.matrix[row]=input[row]*this.units;this.matrix[4+row]=input[4+row]*this.units;this.matrix[8+row]=input[8+row]*this.units;this.matrix[12+row]=input[row]*this.origin.x+input[4+row]*this.origin.y+input[12+row]}
   gl.useProgram(this.program);gl.uniformMatrix4fv(this.matrixLocation,false,this.matrix);gl.uniform1f(this.fadeLocation,fade);gl.bindVertexArray(this.vao);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.length/7,this.count);gl.bindVertexArray(null);
  }
  this.lastCpu=performance.now()-started;this.totalCpu+=this.lastCpu;this.frames++;
  // Only sample frames driven by a camera/gesture. Our own idle 30Hz cadence is not GPU pressure.
  if(map.isMoving()&&interval>0&&interval<200)this.budget.sample(now,interval,this.lastCpu);
  if(!map.isMoving()&&this.routes.length&&this.budget.limit>0&&!this.repaintTimer)this.repaintTimer=setTimeout(()=>{this.repaintTimer=undefined;if(this.enabled&&!this.disposed)map.triggerRepaint()},1000/30);
 }
 stats(){return {simulation:true,routes:this.routes.length,vehicleLimit:this.budget.limit,drawCalls:this.enabled&&this.count?1:0,verticesPerVehicle:mesh.length/7,instanceBytes:this.data.byteLength,meanCpuMs:this.frames?this.totalCpu/this.frames:0}}
 private releaseGL(){const gl=this.gl;if(!gl)return;if(this.vao)gl.deleteVertexArray(this.vao);if(this.geometry)gl.deleteBuffer(this.geometry);if(this.instances)gl.deleteBuffer(this.instances);if(this.program)gl.deleteProgram(this.program);this.vao=null;this.geometry=null;this.instances=null;this.program=undefined}
 onRemove(){this.disposed=true;this.cancelTimers();this.map?.off('sourcedata',this.sourceData);this.map?.off('moveend',this.scheduleMoveRefresh);this.map?.off('webglcontextlost',this.lost);this.map?.off('webglcontextrestored',this.restored);document.removeEventListener('visibilitychange',this.visibility);this.routes=[];this.releaseGL();this.map=undefined}
}
