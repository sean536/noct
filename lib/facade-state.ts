import type {ExpressionSpecification,FillExtrusionLayerSpecification,Map as GLMap} from 'maplibre-gl';

export const FACADES_STATE='noct_facade_ready';

/** Feature-state changes paint buffers without rebuilding source tiles or changing camera state. */
export function buildingLayerWithFacades(original:FillExtrusionLayerSpecification):FillExtrusionLayerSpecification{
 const value=original.paint?.['fill-extrusion-height'];
 const height:number|ExpressionSpecification=typeof value==='number'||Array.isArray(value)?value:['get','render_height'];
 return {...original,paint:{...original.paint,
  'fill-extrusion-height':['case',['boolean',['feature-state',FACADES_STATE],false],0,height],
  'fill-extrusion-height-transition':{duration:0,delay:0}
 }};
}

/** Owns one state key only. Hover state, source filters, heights and unrelated buildings are untouched. */
export class FacadeState {
 private active=new Map<string,string|number>();
 constructor(private readonly map:GLMap){}
 replace(ids:(string|number)[]){
  const next=new Map(ids.map(id=>[String(id),id]));
  try{
   for(const [key,id] of next)if(!this.active.has(key)){
    this.map.setFeatureState({source:'buildings',sourceLayer:'building',id},{[FACADES_STATE]:true});this.active.set(key,id);
   }
   for(const [key,id] of this.active)if(!next.has(key)){
    this.map.removeFeatureState({source:'buildings',sourceLayer:'building',id},FACADES_STATE);this.active.delete(key);
   }
  }catch(error){this.clear();throw error;}
 }
 clear(){
  for(const id of this.active.values())try{this.map.removeFeatureState({source:'buildings',sourceLayer:'building',id},FACADES_STATE);}catch{/* Context loss discards the source state as well. */}
  this.active.clear();
 }
}
