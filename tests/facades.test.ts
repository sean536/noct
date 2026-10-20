import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MercatorCoordinate} from 'maplibre-gl';
import {Vector3} from 'three';
import type {Polygon} from 'geojson';
import {selectBuildings, facadeLod, geographicFrame, type BuildingFeature} from '../prototypes/facades/data';
import {createFacadeScene} from '../prototypes/facades/mesh';

const origin:[number,number]=[13.44508,52.49922];
function feature(id:number,dx=0,properties:Record<string,unknown>={}):BuildingFeature&{geometry:Polygon}{
 const x=origin[0]+dx,y=origin[1];
 return {type:'Feature',id,properties:{render_height:20,building:'apartments',...properties},geometry:{type:'Polygon',coordinates:[[[x,y],[x+.0003,y],[x+.0003,y+.00015],[x,y+.00015],[x,y]]]}};
}
test('same geographic building is deterministic across tile order, ring start, and orientation',()=>{
 const a=feature(123),b=structuredClone(a),ring=b.geometry.type==='Polygon'?b.geometry.coordinates[0]:[];
 const opened=ring.slice(0,-1).reverse();b.geometry={type:'Polygon',coordinates:[[...opened.slice(2),...opened.slice(0,2),opened[2]]]};
 const one=selectBuildings([a,feature(124,.0008)],origin),two=selectBuildings([feature(124,.0008),b,a],origin);
 assert.equal(one.buildings.length,2);assert.deepEqual(one,two);
 const model=createFacadeScene(one.buildings,origin,true),other=createFacadeScene(two.buildings,origin,true);
 assert.deepEqual(model.walls.geometry.getAttribute('position').array,other.walls.geometry.getAttribute('position').array);
 assert.deepEqual(model.walls.geometry.getAttribute('aSeed').array,other.walls.geometry.getAttribute('aSeed').array);
 model.dispose();other.dispose();
});
test('missing heights, hidden buildings, floating parts and conflicting tile fragments remain fallback',()=>{
 const clipped=feature(10);clipped.geometry.coordinates[0][1][0]+=.0001;
 const result=selectBuildings([feature(1,0,{render_height:0}),feature(2,0,{hide_3d:true}),feature(3,0,{render_min_height:5}),feature(10),clipped,feature(11,.0007)],origin);
 assert.deepEqual(result.buildings.map(b=>b.id),['osm:11']);
 assert.ok(result.rejected>=5);
});
test('coincident footprints with different source IDs are kept out of the procedural scene',()=>{
 assert.equal(selectBuildings([feature(17),feature(18)],origin).buildings.length,0);
});
test('limits bound source work; untagged buildings never receive invented residential balconies',()=>{
 const input=Array.from({length:30},(_,i)=>feature(i,i*.00005,{building:undefined}));
 const result=selectBuildings(input,origin,16);
 assert.equal(result.buildings.length,16);assert.ok(result.buildings.every(b=>!b.residential));
 const model=createFacadeScene(result.buildings,origin,true);
 assert.equal(model.balconyCount,0);assert.ok(model.metrics.geometryBytes<3*1024*1024);
 assert.ok(model.metrics.triangles<50000);model.dispose();model.dispose();
});
test('courtyard rings survive normalization and roofs do not fill the courtyard',()=>{
 const f=feature(3),x=origin[0],y=origin[1];
 f.geometry={type:'Polygon',coordinates:[f.geometry.coordinates[0],[[x+.0001,y+.00005],[x+.0001,y+.0001],[x+.0002,y+.0001],[x+.0002,y+.00005],[x+.0001,y+.00005]]]};
 const b=selectBuildings([f],origin).buildings[0];assert.equal(b.rings.length,2);
 const model=createFacadeScene([b],origin,false),positions=model.roofs.geometry.getAttribute('position');
 // Roof area must equal outer footprint minus courtyard, not the outer bounding rectangle.
 let area=0;for(let i=0;i<positions.count;i+=3){const a=new Vector3().fromBufferAttribute(positions,i),b=new Vector3().fromBufferAttribute(positions,i+1),c=new Vector3().fromBufferAttribute(positions,i+2);area+=b.sub(a).cross(c.sub(a)).length()/2;}
 assert.ok(Math.abs(area-b.area)<.01);model.dispose();
});
test('east/up/south positions land at the exact Berlin origin in MapLibre Mercator',()=>{
 const m=geographicFrame(origin),o=MercatorCoordinate.fromLngLat(origin),s=o.meterInMercatorCoordinateUnits();
 const p=new Vector3(15,8,-25).applyMatrix4(m);
 assert.ok(Math.abs(p.x-o.x-15*s)<1e-12);assert.ok(Math.abs(p.y-o.y+25*s)<1e-12);assert.ok(Math.abs(p.z-8*s)<1e-12);
});
test('LOD has bounded close detail and drops balconies on distant views',()=>{
 assert.equal(facadeLod(17.5,80).balconies,true);assert.equal(facadeLod(16,80).balconies,false);
 assert.equal(facadeLod(17.5,700).windows,false);assert.equal(facadeLod(13.9,80).visible,false);
});
test('a tagged rectangular gable preserves total height; unknown roofs are not guessed',()=>{
 const tagged=selectBuildings([feature(5,0,{'roof:shape':'gabled','roof:height':2})],origin).buildings[0];
 const plain=selectBuildings([feature(6,.0008)],origin).buildings[0];
 assert.equal(tagged.roof,'gabled');assert.equal(plain.roof,'flat');
 const model=createFacadeScene([tagged],origin,true),positions=model.roofs.geometry.getAttribute('position');
 const ys=Array.from({length:positions.count},(_,i)=>positions.getY(i));
 assert.equal(Math.max(...ys),tagged.height);assert.equal(Math.min(...ys),tagged.height-2);model.dispose();
});
