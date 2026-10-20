import {Camera,Matrix4,Scene,WebGLRenderer,NoToneMapping} from 'three';
import type {CustomLayerInterface,CustomRenderMethodInput,Map as GLMap} from 'maplibre-gl';
import {facadeLod,geographicFrame,localPoint,type FacadeBuilding,type Point} from './data';
import {createFacadeScene,type FacadeScene} from './mesh';

export class FacadeLayer implements CustomLayerInterface {
 readonly id:string;readonly type='custom' as const;readonly renderingMode='3d' as const;
 private renderer?:WebGLRenderer;private readonly scene=new Scene();private readonly camera=new Camera();
 private frame:Matrix4;private model:FacadeScene;private map?:GLMap;private disposed=false;private failed=false;private shown=true;private night=true;
 private frames=0;private cpuTotal=0;private first=true;private pressure=0;private previous=0;private reduced=false;
 onFailure?:(error:Error)=>void;onFirstFrame?:()=>void;
 constructor(public buildings:FacadeBuilding[],public origin:Point,readonly mobile:boolean,private readonly options:{id?:string;balconyZoom?:number;surfaceOverlay?:boolean}={}){
  this.id=options.id??'lab-procedural-facades';
  this.frame=geographicFrame(origin);this.model=createFacadeScene(buildings,origin,mobile,options);this.scene.add(this.model.group);
 }
 onAdd(map:GLMap,context:WebGLRenderingContext|WebGL2RenderingContext){
  this.map=map;this.renderer=new WebGLRenderer({canvas:map.getCanvas(),context:context as WebGL2RenderingContext});
  this.renderer.autoClear=false;this.renderer.toneMapping=NoToneMapping;
  this.renderer.debug.onShaderError=()=>this.fail(Error('Fassaden-Shader konnte auf diesem Gerät nicht kompiliert werden.'));
 }
 private fail(error:Error){if(this.failed||this.disposed)return;this.failed=true;this.onFailure?.(error);}
 setShown(shown:boolean){this.shown=shown;this.previous=0;this.map?.triggerRepaint();}
 setNight(night:boolean){this.night=night;this.model.setNight(night);this.map?.triggerRepaint();}
 /** Bounded synchronous preparation: Three's shared programs stay cached; no uncancellable polling timer. */
 prepare(){
  if(!this.renderer||this.disposed||this.failed)throw Error('Fassaden-Renderer nicht verfügbar.');
  try{this.renderer.resetState();this.renderer.compile(this.scene,this.camera);if(this.failed)throw Error('Fassaden-Shader nicht verfügbar.');}
  finally{this.renderer.resetState();}
 }
 updateBuildings(buildings:FacadeBuilding[],origin:Point){
  if(!this.renderer||this.disposed||this.failed)throw Error('Fassaden-Renderer nicht verfügbar.');
  const next=createFacadeScene(buildings,origin,this.mobile,this.options),candidate=new Scene();next.setNight(this.night);candidate.add(next.group);
  try{
   this.renderer.resetState();this.renderer.compile(candidate,this.camera);if(this.failed)throw Error('Fassaden-Shader nicht verfügbar.');
   const previous=this.model;this.scene.remove(previous.group);this.model=next;this.scene.add(next.group);
   this.buildings=buildings;this.origin=origin;this.frame=geographicFrame(origin);this.first=true;previous.dispose();
  }catch(error){next.dispose();throw error;}
  finally{candidate.clear();this.renderer.resetState();}
 }
 resetCounters(){this.frames=0;this.cpuTotal=0;this.previous=0;}
 render(context:WebGLRenderingContext|WebGL2RenderingContext,input:CustomRenderMethodInput){
  const map=this.map,renderer=this.renderer;
  if(!map||!renderer||!this.shown||this.failed||this.disposed||document.hidden||input.defaultProjectionData.projectionTransition>0)return;
  const center=localPoint([map.getCenter().lng,map.getCenter().lat],this.origin),distance=Math.hypot(...center),lod=facadeLod(map.getZoom(),distance,this.options.balconyZoom);
  if(!lod.visible){this.previous=0;return;}
  const now=performance.now(),dt=now-this.previous;this.previous=now;
  if(map.isMoving()&&dt>0&&dt<250){this.pressure=dt>38?this.pressure+1:Math.max(0,this.pressure-1);if(this.pressure>=18)this.reduced=true;}
  this.model.setDetail(lod.windows,lod.balconies&&!this.reduced);
  try{
   const start=performance.now();
   this.camera.projectionMatrix.fromArray(input.defaultProjectionData.mainMatrix).multiply(this.frame);
   renderer.resetState();renderer.setViewport(0,0,context.drawingBufferWidth,context.drawingBufferHeight);renderer.render(this.scene,this.camera);
   this.cpuTotal+=performance.now()-start;this.frames++;
   if(this.first&&!this.failed){this.first=false;this.onFirstFrame?.();}
  }catch(error){this.fail(error instanceof Error?error:Error(String(error)));}
  // No continuous repaint: only camera/gesture/style changes drive frames.
 }
 stats(){return {...this.model.metrics,balconies:this.model.balconyCount,reduced:this.reduced,
  calls:this.shown&&!this.failed?(this.renderer?.info.render.calls??0):0,
  meanCpuMs:this.frames?this.cpuTotal/this.frames:0,geometries:this.renderer?.info.memory.geometries??0,
  textures:this.renderer?.info.memory.textures??0,ready:!this.first&&!this.failed};}
 dispose(){if(this.disposed)return;this.disposed=true;this.model.dispose();this.scene.clear();this.renderer?.dispose();this.renderer=undefined;this.map=undefined;}
 onRemove(){this.dispose();}
}
