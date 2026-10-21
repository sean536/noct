import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {BUILDING_LAYER,BUILDING_SOURCE} from '../lib/buildings';
import {imageryConfig} from '../lib/imagery';
import {buildingLayerWithFacades} from '../lib/facade-state';
import {facadeImage,installFacadeMaterials,FACADE_PATTERN} from '../lib/facade-materials';
import type {Map as GLMap} from 'maplibre-gl';

test('every native building has a resident procedural material without selection, height suppression or a facade zoom cutoff',()=>{
 const original=JSON.stringify(BUILDING_LAYER),layer=buildingLayerWithFacades(BUILDING_LAYER),aerial=imageryConfig().style;
 assert.deepEqual(validateStyleMin({...aerial,sources:{...aerial.sources,buildings:BUILDING_SOURCE},layers:[...aerial.layers,layer]}),[]);
 assert.equal(JSON.stringify(BUILDING_LAYER),original);assert.equal(layer.minzoom,14);
 assert.deepEqual(layer.paint?.['fill-extrusion-height'],['get','render_height']);
 assert.deepEqual(layer.paint?.['fill-extrusion-pattern'],FACADE_PATTERN);
 assert.equal(layer.paint?.['fill-extrusion-opacity'],1);
 assert.equal(JSON.stringify(layer).includes('feature-state'),false);
});
test('eight deterministic generated materials are registered once and contain wall, frame, glass and warm pixels',()=>{
 const images=new Map<string,unknown>();const map={hasImage:(id:string)=>images.has(id),addImage:(id:string,value:unknown)=>images.set(id,value)} as unknown as GLMap;
 installFacadeMaterials(map);installFacadeMaterials(map);assert.equal(images.size,8);
 const variants=new Set<string>();for(let i=0;i<8;i++){
  const a=facadeImage(i),b=facadeImage(i);assert.deepEqual(a.data,b.data);assert.equal(a.data.length,a.width*a.height*4);
  const colors=new Set<string>();for(let j=0;j<a.data.length;j+=4)colors.add([...a.data.subarray(j,j+3)].join(','));assert.ok(colors.size>8);variants.add([...a.data.subarray(0,3)].join(','));
 }assert.equal(variants.size,8);
});
