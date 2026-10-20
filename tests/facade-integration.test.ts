import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import type {Map as GLMap} from 'maplibre-gl';
import {BUILDING_LAYER,BUILDING_SOURCE} from '../lib/buildings';
import {imageryConfig} from '../lib/imagery';
import {FACADES_STATE,FacadeState,buildingLayerWithFacades} from '../lib/facade-state';
import {FacadeMap,type FacadeRenderer} from '../lib/facade-map';
import {fixtureBuildings,type FacadeBuilding,type Point} from '../prototypes/facades/data';

const origin:Point=[13.44508,52.49922];
test('integrated paint uses supported feature-state, retaining provider heights and the original style',()=>{
 const original=JSON.stringify(BUILDING_LAYER),layer=buildingLayerWithFacades(BUILDING_LAYER),aerial=imageryConfig().style;
 assert.deepEqual(validateStyleMin({...aerial,sources:{...aerial.sources,buildings:BUILDING_SOURCE},layers:[...aerial.layers,layer]}),[]);
 assert.equal(JSON.stringify(BUILDING_LAYER),original);assert.deepEqual(layer.filter,BUILDING_LAYER.filter);
 assert.deepEqual(layer.paint?.['fill-extrusion-height'],['case',['boolean',['feature-state',FACADES_STATE],false],0,['get','render_height']]);
 assert.equal(layer.paint?.['fill-extrusion-opacity'],1);
});
test('feature-state replaces only prepared IDs and clears only its own state on rollback',()=>{
 const states=new Map<string,boolean>(),changes:string[]=[];
 const map={setFeatureState:(target:{id:string|number},state:Record<string,boolean>)=>{states.set(String(target.id),state[FACADES_STATE]);changes.push('set:'+target.id);},removeFeatureState:(target:{id:string|number},key:string)=>{assert.equal(key,FACADES_STATE);states.delete(String(target.id));changes.push('clear:'+target.id);}} as unknown as GLMap;
 const state=new FacadeState(map);state.replace([1,2]);state.replace([2,3]);assert.deepEqual([...states.keys()].sort(),['2','3']);
 assert.equal(changes.filter(v=>v==='set:2').length,1);state.clear();assert.equal(states.size,0);
});
function harness(t:TestContext){
 t.mock.timers.enable({apis:['setTimeout']});
 const listeners=new Map<string,Set<(...args:never[])=>void>>(),masked=new Set<string>();
 let features=fixtureBuildings(origin),center=origin,zoom=16.6,draws=0,created=0,prepared=0,updates=0,disposed=0,failed=false;
 let renderer:FacadeRenderer|undefined,shown=false;
 const map={on:(event:string,fn:(...args:never[])=>void)=>{const set=listeners.get(event)??new Set();set.add(fn);listeners.set(event,set);},off:(event:string,fn:(...args:never[])=>void)=>listeners.get(event)?.delete(fn),getCenter:()=>({lng:center[0],lat:center[1]}),getZoom:()=>zoom,getLayer:(id:string)=>id==='real-buildings'?{}:id==='noct-procedural-facades'?renderer:undefined,getSource:()=>({type:'vector'}),querySourceFeatures:()=>features,addLayer:(value:FacadeRenderer)=>{renderer=value;},removeLayer:()=>{renderer?.dispose();renderer=undefined;},triggerRepaint:()=>{draws++;},setFeatureState:(target:{id:string|number})=>{masked.add(String(target.id));},removeFeatureState:(target:{id:string|number},key:string)=>{assert.equal(key,FACADES_STATE);masked.delete(String(target.id));}} as unknown as GLMap;
 const factory=(buildings:FacadeBuilding[],anchor:Point):FacadeRenderer=>{
  created++;let b=buildings,o=anchor;
  return {id:'noct-procedural-facades',type:'custom',renderingMode:'3d',render(){},get buildings(){return b},get origin(){return o},prepare(){prepared++;if(failed)throw Error('GPU unavailable');},updateBuildings(next,nextOrigin){updates++;if(failed)throw Error('Geometry unavailable');b=next;o=nextOrigin;},setShown(value){shown=value;},dispose(){disposed++;}};
 };
 const controller=new FacadeMap(map,{mobile:true,limit:12,createLayer:factory,hidden:()=>false});
 return {controller,masked,listeners,get created(){return created},get prepared(){return prepared},get buildingCount(){return renderer?.buildings.length??0},get shown(){return shown},get updates(){return updates},get disposed(){return disposed},get draws(){return draws},set features(value:typeof features){features=value},set center(value:Point){center=value},set zoom(value:number){zoom=value},set failed(value:boolean){failed=value},emit(event:string){for(const fn of listeners.get(event)??[])fn();}};
}
test('real source adapter reuses one renderer and does not rebuild unchanged buildings during flights',t=>{
 const h=harness(t);t.mock.timers.tick(1000);assert.equal(h.created,1);assert.equal(h.masked.size,0);assert.equal(h.buildingCount,12);
 for(let i=0;i<5;i++){h.emit('move');t.mock.timers.tick(1000);}
 assert.equal(h.created,1);assert.equal(h.updates,0);assert.equal(h.prepared,1);
 h.features=fixtureBuildings(origin).map((f,i)=>({...f,id:9000+i}));h.emit('move');t.mock.timers.tick(1000);
 assert.equal(h.updates,0,'A provider group-ID change must not rebuild identical wall surfaces');
 h.center=[13.45,52.50];h.features=fixtureBuildings([13.45,52.50]);h.emit('move');t.mock.timers.tick(1000);
 assert.equal(h.created,1);assert.equal(h.updates,1);h.controller.destroy();assert.equal(h.masked.size,0);assert.equal(h.disposed,1);
 assert.ok([...h.listeners.values()].every(set=>set.size===0));const before=h.draws;t.mock.timers.tick(60000);assert.equal(h.draws,before);
});
test('missing data, low zoom and GPU failure leave the existing OSM buildings visible',t=>{
 const h=harness(t);h.features=[];t.mock.timers.tick(1000);assert.equal(h.created,0);assert.equal(h.masked.size,0);
 h.features=fixtureBuildings(origin);h.zoom=13;h.emit('move');t.mock.timers.tick(1000);assert.equal(h.masked.size,0);
 h.zoom=16.6;h.failed=true;h.emit('move');t.mock.timers.tick(1000);assert.equal(h.masked.size,0);h.controller.destroy();
});
test('shared vector IDs can detail distinct surfaces without suppressing any original geometry',t=>{
 const h=harness(t),items=fixtureBuildings(origin);h.features=[{...items[0],id:1,properties:{...items[0].properties,osm_id:100}},{...items[1],id:1,properties:{...items[1].properties,osm_id:101}}];
 t.mock.timers.tick(1000);assert.equal(h.created,1);assert.equal(h.buildingCount,2);assert.equal(h.masked.size,0);h.controller.destroy();
});
test('zooming away hides surfaces and returning reuses the renderer; fallback remains throughout',t=>{
 const h=harness(t);t.mock.timers.tick(1000);assert.equal(h.masked.size,0);assert.equal(h.buildingCount,12);
 h.zoom=13;h.emit('move');assert.equal(h.masked.size,0);assert.equal(h.shown,false);t.mock.timers.tick(1000);
 h.zoom=16.6;h.emit('move');assert.equal(h.masked.size,0);assert.equal(h.buildingCount,12);assert.equal(h.shown,true);assert.equal(h.created,1);h.controller.destroy();
});
test('failed replacement restores every old building and does not keep scheduling retries',t=>{
 const h=harness(t);t.mock.timers.tick(1000);assert.equal(h.masked.size,0);assert.equal(h.buildingCount,12);
 h.center=[13.45,52.5];h.features=fixtureBuildings([13.45,52.5]);h.failed=true;h.emit('move');t.mock.timers.tick(1000);
 assert.equal(h.masked.size,0);assert.equal(h.disposed,1);const count=h.updates;t.mock.timers.tick(60000);assert.equal(h.updates,count);
});
test('partial feature-state failure rolls back all replacement state',()=>{
 const ids=new Set<number>();const map={setFeatureState:(target:{id:number})=>{if(target.id===2)throw Error('source lost');ids.add(target.id);},removeFeatureState:(target:{id:number})=>ids.delete(target.id)} as unknown as GLMap;
 const state=new FacadeState(map);assert.throws(()=>state.replace([1,2]),/source lost/);assert.equal(ids.size,0);
});
