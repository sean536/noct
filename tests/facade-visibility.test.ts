import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {BuildingFeature,Point} from '../prototypes/facades/data';
import {selectBuildings} from '../prototypes/facades/data';
const selectFacadeSurfaces=(features:BuildingFeature[],origin:Point,limit:number)=>selectBuildings(features,origin,limit,{surfaceOverlay:true});
import {createFacadeScene} from '../prototypes/facades/mesh';

const berlin=JSON.parse(readFileSync(new URL('./fixtures/berlin-weekend.json',import.meta.url),'utf8'));
const origin:Point=[13.41642,52.5229];
// Replay the documented provider encoding: same-height footprints grouped in a MultiPolygon,
// only render_height/min_height, no invented building-use or material tags.
const packet:BuildingFeature[]=Object.values(Object.groupBy(berlin.features as BuildingFeature[],f=>String(Math.ceil(Number(f.properties.height))))).map((group,i)=>({
 type:'Feature',id:900000+i*10,properties:{render_height:Math.ceil(Number(group![0].properties.height)),render_min_height:0},
 geometry:{type:'MultiPolygon',coordinates:group!.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates])}
}));

test('real Berlin provider-shaped MultiPolygons yield bounded facade surfaces at the existing event location',()=>{
 const result=selectFacadeSurfaces(packet,origin,20);
 assert.ok(result.buildings.length>=8,`Only ${result.buildings.length} real buildings accepted`);
 assert.ok(result.buildings.length<=20);
 assert.ok(result.buildings.every(b=>b.height>=4&&b.height<=150));
 const model=createFacadeScene(result.buildings,origin,true,{surfaceOverlay:true});
 assert.equal(model.walls.material.uniforms.uDetail.value,1);
 assert.equal(model.walls.material.polygonOffset,true);
 assert.ok(model.walls.material.polygonOffsetFactor<0);
 assert.equal(model.roofs.visible,false,'MapLibre roofs remain the occluding fallback, not a second roof');
 assert.ok(model.metrics.geometryBytes<3*1024*1024);
 model.dispose();
});
test('a limited selection never requires suppressing the rest of a merged source feature',()=>{
 const result=selectFacadeSurfaces(packet,origin,3);
 assert.equal(result.buildings.length,3);
 assert.ok(packet.length<berlin.features.length);
 assert.deepEqual(selectFacadeSurfaces([...packet].reverse(),origin,3).buildings.map(b=>b.id),result.buildings.map(b=>b.id));
});
test('missing feature IDs and repeated tile geometry still produce one geographically stable surface',()=>{
 const f=structuredClone(packet[0]);delete f.id;
 const first=selectFacadeSurfaces([f],origin,20);
 assert.ok(first.buildings.length>0);
 assert.deepEqual(selectFacadeSurfaces([f,f],origin,20).buildings.map(b=>b.id),first.buildings.map(b=>b.id));
});
