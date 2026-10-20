import {test} from 'node:test';import assert from 'node:assert/strict';
import {TilePrefetcher,neighborhoodURLs,LoadedTargetTiles,tileFor} from '../lib/tile-prefetch';
import {berlinTileUrl} from '../lib/imagery';
const point:[number,number]=[13.44304,52.51117];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('preload covers a bounded native neighborhood, central tile first and without duplicate URLs',()=>{
 const vector=neighborhoodURLs('https://tiles.test/{z}/{x}/{y}.pbf',point,14,220,4),raster=neighborhoodURLs(berlinTileUrl(),point,17);
 const center=tileFor(point,14);assert.equal(vector[0],`https://tiles.test/14/${center.x}/${center.y}.pbf`);assert.ok(vector.length>=1&&vector.length<=4);assert.ok(raster.length>1&&raster.length<=9);assert.equal(new Set(raster).size,raster.length);assert.deepEqual(neighborhoodURLs('https://test/{unsupported}',point,17),[]);
});
test('preload queues neighbors within two slots, retries failures and replaces stale pending targets',async()=>{
 const calls:{url:string;options:RequestInit;resolve:(r:Response)=>void}[]=[];
 const request:typeof fetch=async(url,options)=>new Promise(resolve=>calls.push({url:String(url),options:options!,resolve}));
 const cache=new TilePrefetcher(request);cache.warm(['a','a','b','old-neighbor']);assert.equal(calls.length,2);
 cache.warm(['new-center','new-neighbor']);calls[0].resolve(new Response('no',{status:503}));await flush();assert.equal(calls[2].url,'new-center');
 calls[1].resolve(new Response('ok'));await flush();assert.equal(calls[3].url,'new-neighbor');
 calls[2].resolve(new Response('ok'));calls[3].resolve(new Response('ok'));await flush();
 cache.warm(['a','b','new-center']);assert.equal(calls.at(-1)?.url,'a');assert.equal(calls.length,5);assert.equal(calls[4].options.cache,'default');
 cache.destroy();assert.equal(calls[4].options.signal?.aborted,true);calls[4].resolve(new Response('ok'));await flush();cache.warm(['ignored']);assert.equal(calls.length,5);
});
test('deduplication expires; it never persists bodies or overrides provider cache freshness',async()=>{
 let now=0,calls=0;const request:typeof fetch=async()=>{calls++;return new Response('ok')};
 const cache=new TilePrefetcher(request,()=>now);cache.warm(['same']);await flush();cache.warm(['same']);assert.equal(calls,1);now=30001;cache.warm(['same']);await flush();assert.equal(calls,2);cache.destroy();
});
test('native target tile evidence ignores metadata and invalidates reloading/error tiles',()=>{
 const evidence=new LoadedTargetTiles(),tile=tileFor(point,14);
 evidence.record({sourceId:'buildings'});assert.equal(evidence.has('buildings',point,14),false);
 evidence.record({sourceId:'buildings',coord:{canonical:tile},tile:{state:'loaded'}});assert.equal(evidence.has('buildings',point,14),true);assert.equal(evidence.has('imagery',point,14),false);assert.equal(evidence.has('buildings',point,15),false);
 evidence.record({sourceId:'buildings',coord:{canonical:tile},tile:{state:'errored'}});assert.equal(evidence.has('buildings',point,14),false);
});
