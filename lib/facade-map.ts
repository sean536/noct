import type {CustomLayerInterface,Map as GLMap,MapSourceDataEvent} from 'maplibre-gl';
import {FacadeLayer} from '../prototypes/facades/layer';
import {selectBuildings,facadeLod,localPoint,type BuildingFeature,type FacadeBuilding,type Point} from '../prototypes/facades/data';
import {FacadeState} from './facade-state';

export interface FacadeRenderer extends CustomLayerInterface {
 readonly buildings:FacadeBuilding[];readonly origin:Point;
 prepare():void;updateBuildings(buildings:FacadeBuilding[],origin:Point):void;
 setShown(shown:boolean):void;dispose():void;onFailure?:(error:Error)=>void;
}
interface Options {
 mobile:boolean;limit?:number;
 createLayer?:(buildings:FacadeBuilding[],origin:Point)=>FacadeRenderer;
 hidden?:()=>boolean;
}
/** Ambiguous IDs cannot safely control feature-state across a tiled source. Keep them as OSM fallback. */
function safeFeatures(features:BuildingFeature[]){
 const raw=new Map<string,string>(),osm=new Map<string,string>(),bad=new Set<string>();
 const input=features.slice(0,4096).filter(f=>f.id!==undefined&&f.id!==null&&(typeof f.id==='string'||Number.isSafeInteger(f.id)));
 for(const f of input){
  const id=String(f.id),p=f.properties??{},geometry=JSON.stringify([f.geometry,p.render_height??p.height,p.render_min_height??p.min_height??0],(_key,v)=>typeof v==='number'?Math.round(v*1e7)/1e7:v);
  if(raw.has(id)&&raw.get(id)!==geometry)bad.add(id);else raw.set(id,geometry);
  if(p.osm_id!==undefined){const key=String(p.osm_id),previous=osm.get(key);if(previous!==undefined&&previous!==id){bad.add(previous);bad.add(id);}else osm.set(key,id);}
 }
 return input.filter(f=>!bad.has(String(f.id)));
}
function signature(buildings:FacadeBuilding[]){
 return JSON.stringify(buildings.map(b=>[b.id,b.sourceId,b.geometry,b.height,b.material,b.roof,b.roofHeight,b.residential,b.commercial,b.industrial]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
}

/** One bounded renderer for the live map. Never moves the camera or creates another tile source. */
export class FacadeMap {
 private readonly state:FacadeState;private renderer?:FacadeRenderer;private timer?:ReturnType<typeof setTimeout>;
 private disposed=false;private currentSignature='';private displayed=false;
 private readonly hidden:()=>boolean;private readonly createLayer:NonNullable<Options['createLayer']>;
 constructor(private readonly map:GLMap,private readonly options:Options){
  this.state=new FacadeState(map);this.hidden=options.hidden??(()=>typeof document!=='undefined'&&document.hidden);
  this.createLayer=options.createLayer??((buildings,origin)=>new FacadeLayer(buildings,origin,options.mobile,{id:'noct-procedural-facades',balconyZoom:16.5}));
  map.on('move',this.moved);map.on('sourcedata',this.sourceData);map.on('webglcontextlost',this.lost);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.visibility);
  this.schedule(0);
 }
 private sourceData=(event:MapSourceDataEvent)=>{if(event.sourceId==='buildings')this.schedule();};
 private moved=()=>{this.syncVisibility();this.schedule();};
 private visibility=()=>{this.syncVisibility();if(this.hidden())this.cancel();else this.schedule(0);};
 private lost=()=>this.destroy();
 private cancel(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
 private schedule(delay=750){if(this.disposed||this.hidden()||this.timer!==undefined)return;this.timer=setTimeout(()=>{this.timer=undefined;this.refresh();},delay);}
 private syncVisibility(){
  if(!this.renderer||this.disposed)return;
  const c=this.map.getCenter(),distance=Math.hypot(...localPoint([c.lng,c.lat],this.renderer.origin));
  const enabled=!this.hidden()&&this.map.getZoom()>=15.4&&facadeLod(this.map.getZoom(),distance).visible;
  if(enabled===this.displayed)return;
  try{
   this.state.replace(enabled?this.renderer.buildings.map(b=>b.sourceId!):[]);
   this.renderer.setShown(enabled);this.displayed=enabled;
  }catch{this.destroy();}
 }
 private refresh(){
  if(this.disposed||this.hidden()||this.map.getZoom()<15.4||!this.map.getLayer('real-buildings')||!this.map.getSource('buildings'))return;
  try{
   const center=this.map.getCenter(),origin:Point=[center.lng,center.lat];
   const input=this.map.querySourceFeatures('buildings',{sourceLayer:'building'}) as BuildingFeature[];
   const buildings=selectBuildings(safeFeatures(input),origin,this.options.limit??(this.options.mobile?12:20)).buildings;
   if(!buildings.length){this.state.clear();this.renderer?.setShown(false);this.displayed=false;return;}
   const next=signature(buildings);
   if(next===this.currentSignature){this.syncVisibility();return;}
   if(!this.renderer){
    const layer=this.createLayer(buildings,origin);this.renderer=layer;
    layer.setShown(false);
    layer.onFailure=()=>queueMicrotask(()=>{if(!this.disposed)this.destroy();});
    this.map.addLayer(layer);layer.prepare();
   }else this.renderer.updateBuildings(buildings,origin);
   // Same JS turn: prepared geometry and replacement IDs change together, before the next map draw.
   this.state.replace(buildings.map(b=>b.sourceId!));this.renderer.setShown(true);this.displayed=true;this.currentSignature=next;
  }catch{this.destroy();}
 }
 destroy(){
  if(this.disposed)return;this.disposed=true;this.cancel();
  this.map.off('move',this.moved);this.map.off('sourcedata',this.sourceData);this.map.off('webglcontextlost',this.lost);
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.visibility);
  this.state.clear();
  let removed=false;
  try{if(this.renderer&&this.map.getLayer(this.renderer.id)){this.map.removeLayer(this.renderer.id);removed=true;}}catch{/* Style may already be destroyed after context loss. */}
  if(!removed)this.renderer?.dispose();this.renderer=undefined;this.displayed=false;
 }
}
