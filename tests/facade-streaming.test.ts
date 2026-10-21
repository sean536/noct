import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Map as GLMap} from 'maplibre-gl';
import {FacadeMap} from '../lib/facade-map';
const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));
function harness(useDefault=false){
 const listeners=new Map<string,Set<Function>>(),images=new Set<string>(),requests:string[]=[],layers=new Map<string,any>();let zoom=14.4,terminated=false;
 let tiles=Array.from({length:30},(_,x)=>({canonical:{z:14,x:8800+x,y:5300}}));
 const map={on:(name:string,fn:Function)=>{const set=listeners.get(name)??new Set();set.add(fn);listeners.set(name,set);},off:(name:string,fn:Function)=>listeners.get(name)?.delete(fn),getZoom:()=>zoom,getCenter:()=>({lng:13.41642,lat:52.5229}),getSource:()=>({tiles:['https://tiles.openfreemap.org/qa/{z}/{x}/{y}.pbf'],maxzoom:14,tileSize:512}),coveringTiles:()=>tiles,addLayer:(l:any)=>layers.set(l.id,l),getLayer:(id:string)=>layers.get(id),removeLayer:(id:string)=>{layers.get(id)?.dispose();layers.delete(id);},hasImage:(id:string)=>images.has(id),addImage:(id:string)=>images.add(id),triggerRepaint(){}} as unknown as GLMap;
 const worker={onmessage:null as ((event:MessageEvent)=>void)|null,onerror:null as ((event:ErrorEvent)=>void)|null,postMessage(value:any){queueMicrotask(()=>worker.onmessage?.({data:{id:value.id,mesh:{...value.tile,vertices:new Float32Array(),indices:new Uint32Array(),bytes:0,buildings:7,invalid:0}}} as MessageEvent));},terminate(){terminated=true;}};
 const request=async(input:RequestInfo|URL)=>{requests.push(String(input));return new Response(new ArrayBuffer(0));};
 const stream=new FacadeMap(map,{mobile:true,worker:()=>worker,...(useDefault?{}:{request:request as typeof fetch})});
 return {stream,requests,listeners,images,set zoom(z:number){zoom=z},set tiles(next:typeof tiles){tiles=next},get terminated(){return terminated},move(){for(const fn of listeners.get('move')??[])fn();}};
}
test('all visible tiles stream below zoom15.4 with two requests, caching and no move debounce',async()=>{
 const h=harness();for(let i=0;i<80;i++)await flush();const stats=h.stream.stats();
 assert.equal(stats.activeTiles,30);assert.equal(stats.readyTiles,30);assert.equal(stats.buildings,210);assert.equal(h.images.size,8);
 const total=h.requests.length;h.move();for(let i=0;i<10;i++)await flush();assert.equal(h.requests.length,total);
 h.tiles=[{canonical:{z:14,x:9000,y:5400}}];h.move();assert.ok(h.requests.some(u=>u.endsWith('/14/9000/5400.pbf')),'New visible tile must be requested in the movement turn');
 h.stream.destroy();assert.equal(h.terminated,true);assert.ok([...h.listeners.values()].every(s=>s.size===0));
});
test('unavailable geometry keeps native facade materials and destruction cancels the pipeline',async()=>{
 const h=harness();h.stream.destroy();await flush();assert.equal(h.images.size,8);assert.equal(h.terminated,true);assert.equal(h.stream.stats().activeTiles,30);
 const count=h.requests.length;h.move();await flush();assert.equal(h.requests.length,count);
});

test('the browser fetch default keeps its Window/global receiver',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',function(this:unknown){assert.equal(this,globalThis);calls++;return Promise.resolve(new Response(new ArrayBuffer(0)));});
 const h=harness(true);for(let i=0;i<80;i++)await flush();assert.ok(calls>=30);assert.equal(h.stream.stats().readyTiles,30);h.stream.destroy();
});
