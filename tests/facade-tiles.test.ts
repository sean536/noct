import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFacadeTile,TILE_VERTEX_SIZE} from '../lib/facade-tile';
import {tileFor} from '../lib/tile-prefetch';
import {fromGeojsonVt} from '@maplibre/vt-pbf';
import {GeoJSONVT} from '@maplibre/geojson-vt';
const data=JSON.parse(readFileSync(new URL('./fixtures/berlin-weekend.json',import.meta.url),'utf8'));
const features=data.features.map((f:GeoJSON.Feature,i:number)=>({...f,id:i+1,properties:{render_height:Number(f.properties?.height),render_min_height:0}}));
const index=new GeoJSONVT({type:'FeatureCollection',features},{maxZoom:14,indexMaxZoom:14,tolerance:0,extent:4096,buffer:64});
function mesh(x:number,y:number){const tile=index.getTile(14,x,y);const bytes=fromGeojsonVt(tile?{building:tile}:{},{extent:4096,version:2});return buildFacadeTile(Uint8Array.from(bytes).buffer,{z:14,x,y});}
test('all valid real Berlin components are tiled, including small footprints; no 12/20 limit',()=>{
 const tile=tileFor([13.41642,52.5229],14);let total=0,bytes=0;
 for(let x=tile.x-1;x<=tile.x+1;x++)for(let y=tile.y-1;y<=tile.y+1;y++){
  const result=mesh(x,y);total+=result.buildings;bytes+=result.bytes;
  for(let i=0;i<result.vertices.length;i+=TILE_VERTEX_SIZE){assert.ok(result.vertices[i]>=0&&result.vertices[i]<=1);assert.ok(result.vertices[i+1]>=0&&result.vertices[i+1]<=1);assert.ok(result.vertices[i+2]>=0&&result.vertices[i+2]<1000);}
  assert.ok([...result.indices].every(i=>i<result.vertices.length/TILE_VERTEX_SIZE));
 }
 assert.ok(total>=90,`Only ${total} of 95 real components were represented`);assert.ok(bytes<8*1024*1024);
});
test('tile mesh is deterministic, uses one indexed geometry and contains roofs and genuine wall elevations',()=>{
 const tile=tileFor([13.413,52.524],14),a=mesh(tile.x,tile.y),b=mesh(tile.x,tile.y);assert.ok(a.buildings>0);assert.deepEqual(a.vertices,b.vertices);assert.deepEqual(a.indices,b.indices);
 const elevations=new Set<number>();let walls=0,roofs=0;for(let i=0;i<a.vertices.length;i+=TILE_VERTEX_SIZE){elevations.add(a.vertices[i+2]);if(a.vertices[i+5]>.5)roofs++;else walls++;}
 assert.ok(walls>0&&roofs>0);assert.ok(elevations.size>2);
});
