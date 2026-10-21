import type {ExpressionSpecification,FillExtrusionLayerSpecification,Map as GLMap} from 'maplibre-gl';

export const FACADE_PALETTE=[[140,146,143],[156,152,141],[117,132,139],[156,112,91],[128,135,116],[163,151,140],[111,116,123],[136,93,77]];
export const FACADE_PATTERN:ExpressionSpecification=['concat','noct-city-material-',['to-string',['%', ['floor',['/', ['abs',['to-number',['id'],['get','osm_id'],['*',['get','render_height'],137],0]],10]],8]]];
/** Resident fallback atlas: one shared, generated material per variant, never one image per building. */
export function facadeImage(variant:number){
 const size=128,data=new Uint8Array(size*size*4),color=FACADE_PALETTE[variant%8];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,bay=Math.floor(x/32),px=x%32;
  const glass=px>=9&&px<=23&&y>=29&&y<=91,frame=px>=7&&px<=25&&y>=26&&y<=94;
  const lit=((bay*17+variant*11)%7)<2;
  let c:number[]=glass?(lit?[244,184,107]:[38,55,66]):frame?[83,88,85]:color;
  const band=y<3||y>123?.81:1,grain=((x*13+y*7+variant)%9-4)*.45;
  for(let k=0;k<3;k++)data[i+k]=Math.max(0,Math.min(255,c[k]*band+grain));data[i+3]=255;
 }
 return {width:size,height:size,data};
}
export function installFacadeMaterials(map:GLMap){for(let i=0;i<8;i++){const id=`noct-city-material-${i}`;if(!map.hasImage(id))map.addImage(id,facadeImage(i),{pixelRatio:8});}}
export function facadeBuildingLayer(original:FillExtrusionLayerSpecification):FillExtrusionLayerSpecification{
 return {...original,paint:{...original.paint,'fill-extrusion-pattern':FACADE_PATTERN,'fill-extrusion-opacity':1,
  'fill-extrusion-height-transition':{duration:0,delay:0},'fill-extrusion-pattern-transition':{duration:0,delay:0}}};
}
