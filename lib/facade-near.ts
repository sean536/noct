import type {Map as GLMap,MapSourceDataEvent} from 'maplibre-gl';
import {FacadeLayer} from '../prototypes/facades/layer';
import {selectBuildings,type BuildingFeature,type Point} from '../prototypes/facades/data';
/** Only optional balcony geometry is proximity-limited. City wall materials are handled by complete tiles. */
export class NearFacadeDetails {
 private layer?:FacadeLayer;private signature='';private scheduled:number|undefined;private disposed=false;
 constructor(private map:GLMap,private mobile:boolean){map.on('moveend',this.schedule);map.on('sourcedata',this.data);this.schedule();}
 private data=(e:MapSourceDataEvent)=>{if(e.sourceId==='buildings'&&e.tile?.state==='loaded')this.schedule();};
 private schedule=()=>{if(this.disposed||this.scheduled!==undefined)return;this.scheduled=requestAnimationFrame(()=>{this.scheduled=undefined;this.refresh();});};
 private refresh(){
  if(this.disposed||document.hidden||this.map.getZoom()<16.5){this.layer?.setShown(false);return;}
  try{
   const c=this.map.getCenter(),origin:Point=[c.lng,c.lat];
   const features=(this.map.querySourceFeatures('buildings',{sourceLayer:'building'}) as BuildingFeature[]).filter(f=>['apartments','residential','house','terrace','detached'].includes(String(f.properties?.building??f.properties?.class??'')));
   const buildings=selectBuildings(features,origin,20,{surfaceOverlay:true}).buildings.filter(b=>Math.hypot(...b.center)<260);
   if(!buildings.length){this.layer?.setShown(false);return;}
   const signature=JSON.stringify(buildings.map(b=>[b.id,b.height]));
   if(signature!==this.signature){
    if(!this.layer){this.layer=new FacadeLayer(buildings,origin,this.mobile,{id:'noct-near-balconies',balconyZoom:16.5,surfaceOverlay:true,balconiesOnly:true});this.map.addLayer(this.layer);this.layer.prepare();}
    else this.layer.updateBuildings(buildings,origin);this.signature=signature;
   }this.layer?.setShown(true);
  }catch{this.destroy();}
 }
 destroy(){if(this.disposed)return;this.disposed=true;this.map.off('moveend',this.schedule);this.map.off('sourcedata',this.data);if(this.scheduled!==undefined)cancelAnimationFrame(this.scheduled);if(this.layer){try{if(this.map.getLayer(this.layer.id))this.map.removeLayer(this.layer.id);else this.layer.dispose();}catch{this.layer.dispose();}}}
}
