import {AmbientLight,Camera,DirectionalLight,Group,LoadingManager,Matrix4,Scene,WebGLRenderer,NoToneMapping} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {CustomLayerInterface,CustomRenderMethodInput,Map as GLMap} from 'maplibre-gl';
import type {BuildingManifest} from './contract';import {inspectGlb,type AssetBudget} from './glb';
import {disposeScene,modelMatrix,validateScene} from './model';

/** One scene/renderer per imported asset. Uses MapLibre's context; never loses that shared context. */
export class BuildingModelLayer implements CustomLayerInterface {
 readonly id='lab-textured-building';readonly type='custom' as const;readonly renderingMode='3d' as const;
 private renderer?:WebGLRenderer;private readonly scene=new Scene();private readonly camera=new Camera();private readonly transform:Matrix4;
 private disposed=false;private failed=false;private first=true;
 readonly metrics:{triangles:number;geometryBytes:number;textureBytes:number};
 onFrame?:(calls:number,triangles:number,first:boolean)=>void;
 onFailure?:(error:Error)=>void;
 constructor(private readonly model:Group,manifest:BuildingManifest,budget:AssetBudget){
  this.metrics=validateScene(model,budget);this.transform=modelMatrix(manifest);this.scene.add(model,new AmbientLight(0xffffff,1.7));
  const sun=new DirectionalLight(0xffffff,1.4);sun.position.set(-60,140,100);this.scene.add(sun);
 }
 onAdd(map:GLMap,context:WebGLRenderingContext|WebGL2RenderingContext):void{
  if(!('createVertexArray' in context))throw Error('Der Modell-Prototyp benötigt WebGL 2.');
  this.renderer=new WebGLRenderer({canvas:map.getCanvas(),context:context as WebGL2RenderingContext});this.renderer.autoClear=false;this.renderer.toneMapping=NoToneMapping;
  this.renderer.debug.onShaderError=()=>{this.failed=true;this.onFailure?.(Error('GPU-Shader des Modells konnte nicht erstellt werden.'));};
 }
 render(context:WebGLRenderingContext|WebGL2RenderingContext,input:CustomRenderMethodInput):void{
  if(this.disposed||this.failed||!this.renderer)return;
  try{
   this.camera.projectionMatrix.fromArray(input.defaultProjectionData.mainMatrix).multiply(this.transform);
   this.renderer.resetState();this.renderer.setViewport(0,0,context.drawingBufferWidth,context.drawingBufferHeight);this.renderer.render(this.scene,this.camera);
   this.onFrame?.(this.renderer.info.render.calls,this.renderer.info.render.triangles,this.first);this.first=false;
  }catch(error){this.failed=true;this.onFailure?.(error instanceof Error?error:Error(String(error)));}
 }
 dispose():void{if(this.disposed)return;this.disposed=true;disposeScene(this.model);this.renderer?.dispose();this.renderer=undefined;this.scene.clear();}
 onRemove():void{this.dispose();}
}

export async function prepareBuildingModel(bytes:ArrayBuffer,manifest:BuildingManifest,budget:AssetBudget):Promise<BuildingModelLayer>{
 inspectGlb(bytes,budget);
 const manager=new LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('blob:'))throw Error('Externe Modellressourcen sind gesperrt.');return url;});
 const gltf=await new GLTFLoader(manager).parseAsync(bytes,'');
 try{return new BuildingModelLayer(gltf.scene,manifest,budget);}catch(error){disposeScene(gltf.scene);throw error;}
}
