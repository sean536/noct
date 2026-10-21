import type {Map as GLMap,MapSourceDataEvent,VectorTileSource} from 'maplibre-gl';
import {FacadeTileLayer} from './facade-tile-layer';
import {tileKey,type CityTile,type TileMesh} from './facade-tile';
import {tileFor} from './tile-prefetch';
import type {NearFacadeDetails} from './facade-near';
import {events} from './events';
import {FACADE_WORKER_URL} from './facade-worker-entry.generated';
import {installFacadeMaterials} from './facade-materials';

interface WorkerLike {postMessage:(value:unknown,transfer:Transferable[])=>void;terminate:()=>void;onmessage:((event:MessageEvent)=>void)|null;onerror:((event:ErrorEvent)=>void)|null}
interface Options {mobile:boolean;worker?:()=>WorkerLike;request?:typeof fetch}
interface Pending {tile:CityTile;abort:AbortController;id:number;stage:'fetch'|'mesh';timer?:ReturnType<typeof setTimeout>}
/** Complete visible native tiles; geometry/material preparation is independent of camera timing. */
export class FacadeMap {
 private readonly layer:FacadeTileLayer;private worker?:WorkerLike;private request:typeof fetch;private disposed=false;
 private near?:NearFacadeDetails;private nearLoading=false;
 private active:CityTile[]=[];private queue:CityTile[]=[];private pending=new Map<string,Pending>();private ids=new Map<number,string>();
 private warmTiles:CityTile[]=[];
 private failures=new Map<string,number>();private counter=0;private template='';private warmed=false;private hidden=false;
 constructor(private readonly map:GLMap,private readonly options:Options){
  this.hidden=typeof document!=='undefined'&&document.hidden;this.layer=new FacadeTileLayer(options.mobile);this.request=options.request??fetch.bind(globalThis);
  installFacadeMaterials(map);
  this.layer.onFailure=()=>queueMicrotask(()=>this.destroy());map.addLayer(this.layer);
  try{
   this.worker=options.worker?.()??new Worker(FACADE_WORKER_URL,{type:'module'});
   this.worker.onmessage=this.completed;this.worker.onerror=()=>this.destroy();
  }catch{this.destroy();return;}
  map.on('move',this.refresh);map.on('sourcedata',this.sourceData);map.on('webglcontextlost',this.lost);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.visibility);
  this.refresh();
 }
 private sourceData=(event:MapSourceDataEvent)=>{if(event.sourceId==='buildings')this.refresh();};
 private lost=()=>this.destroy();
 private visibility=()=>{this.hidden=typeof document!=='undefined'&&document.hidden;if(this.hidden){for(const p of this.pending.values())p.abort.abort();this.queue=[];}else this.refresh();};
 private source(){return this.map.getSource('buildings') as VectorTileSource|undefined;}
 private refresh=()=>{
  if(this.disposed||this.hidden)return;const source=this.source();if(!source?.tiles?.[0])return;
  this.template=source.tiles[0];const zoom=Math.min(source.maxzoom,Math.max(14,Math.floor(this.map.getZoom())));
  // This matches the provider's first building-height zoom, not a facade detail cutoff.
  this.active=this.map.getZoom()<13.5?[]:this.map.coveringTiles({tileSize:source.tileSize||512,minzoom:zoom,maxzoom:zoom}).map(t=>t.canonical);
  this.layer.setActive(this.active);
  if(this.map.getZoom()>=16.5&&!this.near&&!this.nearLoading){this.nearLoading=true;void import('./facade-near').then(({NearFacadeDetails})=>{if(!this.disposed)this.near=new NearFacadeDetails(this.map,this.options.mobile);}).catch(()=>{});}
  const wanted=[...this.active];
  // A tiny, bounded event-area warm set, using the same provider and ordinary HTTP cache.
  // Existing camera plans and source prefetching remain untouched.
  if(!this.warmed&&this.map.getZoom()>=13.5){
   this.warmed=true;for(const e of events){const t=tileFor(e.coords,Math.min(14,source.maxzoom));this.warmTiles.push(t);}
  }
  wanted.push(...this.warmTiles);const wantedKeys=new Set(wanted.map(tileKey));for(const [key,p] of this.pending)if(p.stage==='fetch'&&!wantedKeys.has(key))p.abort.abort();
  const queued=new Set<string>();this.queue=wanted.filter(t=>{const k=tileKey(t);if(queued.has(k)||this.layer.has(k)||this.pending.has(k)||Date.now()-(this.failures.get(k)??-Infinity)<10000)return false;queued.add(k);return true;});
  this.pump();
 };
 private pump(){
  if(this.disposed||this.hidden||!this.worker)return;
  while(this.pending.size<2&&this.queue.length){
   const tile=this.queue.shift()!,key=tileKey(tile),abort=new AbortController(),id=++this.counter;
   const url=this.template.replaceAll('{z}',String(tile.z)).replaceAll('{x}',String(tile.x)).replaceAll('{y}',String(tile.y));
   if(/[{}]/.test(url))continue;
   const pending:Pending={tile,abort,id,stage:'fetch'};this.pending.set(key,pending);this.ids.set(id,key);
   const timeout=setTimeout(()=>abort.abort(),6000);pending.timer=timeout;
   const priority=this.active.some(t=>tileKey(t)===key)?'high':'low';
   void this.request(url,{signal:abort.signal,cache:'default',mode:'cors',credentials:'omit',priority})
    .then(async response=>{if(!response.ok)throw Error('Tile unavailable');const bytes=await response.arrayBuffer();if(this.disposed||abort.signal.aborted)throw Error('Tile cancelled');clearTimeout(timeout);pending.stage='mesh';pending.timer=setTimeout(()=>this.destroy(),10000);this.worker!.postMessage({id,bytes,tile},[bytes]);})
    .catch(()=>{clearTimeout(timeout);this.pending.delete(key);this.ids.delete(id);this.failures.set(key,Date.now());this.trimFailures();this.pump();});
  }
 }
 private completed=(event:MessageEvent)=>{
  const {id,mesh,error}=event.data as {id:number;mesh?:TileMesh;error?:string};const key=this.ids.get(id);if(!key||this.disposed)return;
  this.ids.delete(id);clearTimeout(this.pending.get(key)?.timer);this.pending.delete(key);
  if(mesh&&!error){this.layer.add(mesh);this.failures.delete(key);}else this.failures.set(key,Date.now());this.trimFailures();this.pump();
 };
 private trimFailures(){while(this.failures.size>256)this.failures.delete(this.failures.keys().next().value!);}
 stats(){return {...this.layer.stats(),pending:this.pending.size,queued:this.queue.length,failedTiles:this.failures.size};}
 destroy(){
  if(this.disposed)return;this.disposed=true;this.map.off('move',this.refresh);this.map.off('sourcedata',this.sourceData);this.map.off('webglcontextlost',this.lost);
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.visibility);
  for(const p of this.pending.values()){clearTimeout(p.timer);p.abort.abort();}this.pending.clear();this.ids.clear();this.queue=[];this.worker?.terminate();this.worker=undefined;this.near?.destroy();
  try{if(this.map.getLayer(this.layer.id))this.map.removeLayer(this.layer.id);else this.layer.dispose();}catch{this.layer.dispose();}
 }
}
