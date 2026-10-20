export function tileFor(coords:[number,number],zoom:number){const z=Math.max(0,Math.min(22,Math.round(zoom))),n=2**z,lat=Math.max(-85.05112878,Math.min(85.05112878,coords[1]))*Math.PI/180;return {z,x:Math.max(0,Math.min(n-1,Math.floor((coords[0]+180)/360*n))),y:Math.max(0,Math.min(n-1,Math.floor((1-Math.asinh(Math.tan(lat))/Math.PI)/2*n)))}}
export function tileURL(template:string,coords:[number,number],zoom:number):string|null{
 const {z,x,y}=tileFor(coords,zoom),n=2**z,resolution=(2*Math.PI*6378137/256)/n,half=Math.PI*6378137,inv=n-y-1;
 const bbox=[x*256*resolution-half,inv*256*resolution-half,(x+1)*256*resolution-half,(inv+1)*256*resolution-half].join(',');
 const url=template.replaceAll('{z}',String(z)).replaceAll('{x}',String(x)).replaceAll('{y}',String(y)).replaceAll('{bbox-epsg-3857}',bbox);
 return /[{}]/.test(url)?null:url;
}
/** A small focus neighborhood, central tiles first; never bulk/offline download. */
export function neighborhoodURLs(template:string,coords:[number,number],zoom:number,radiusMeters=220,limit=9){
 const z=tileFor(coords,zoom).z,latDelta=radiusMeters/111320,lonDelta=latDelta/Math.cos(coords[1]*Math.PI/180);
 const nw=tileFor([coords[0]-lonDelta,coords[1]+latDelta],z),se=tileFor([coords[0]+lonDelta,coords[1]-latDelta],z);
 const center=tileFor(coords,z),n=2**z,tiles:{x:number;y:number}[]=[];
 // Clamped to a 3x3 focus area, even for a very large viewport.
 for(let x=Math.max(nw.x,center.x-1);x<=Math.min(se.x,center.x+1);x++)for(let y=Math.max(nw.y,center.y-1);y<=Math.min(se.y,center.y+1);y++)tiles.push({x,y});
 return tiles.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y)).slice(0,limit).map(({x,y})=>{
  const point:[number,number]=[(x+.5)/n*360-180,Math.atan(Math.sinh(Math.PI*(1-2*(y+.5)/n)))*180/Math.PI];
  return tileURL(template,point,z);
 }).filter((url):url is string=>url!==null);
}
/** Target tile evidence, not metadata or errored-as-loaded global idle. No retained tile bodies. */
export class LoadedTargetTiles {
 private tiles=new Map<string,boolean>();
 record(event:{sourceId?:string;coord?:{canonical:{z:number;x:number;y:number}};tile?:{state?:string}}){
  if(!event.sourceId||!event.coord||!event.tile)return;
  const {z,x,y}=event.coord.canonical,key=`${event.sourceId}/${z}/${x}/${y}`;
  if(event.tile.state!=='loaded'){this.tiles.delete(key);return;}
  this.tiles.delete(key);this.tiles.set(key,true);
  if(this.tiles.size>512)this.tiles.delete(this.tiles.keys().next().value!);
 }
 hasRegion(source:string,coords:[number,number][],zoom:number){return coords.every(point=>this.has(source,point,zoom))}
 has(source:string,coords:[number,number],zoom:number){const {z,x,y}=tileFor(coords,zoom);return this.tiles.has(`${source}/${z}/${x}/${y}`)}
}
/** Two low-priority requests; replace stale queued neighborhoods, retry failures, obey HTTP TTLs. */
export class TilePrefetcher {
 private completed=new Map<string,number>();private pending:string[]=[];
 private active=new Map<string,AbortController>();private disposed=false;
 constructor(private request:typeof fetch=fetch,private now:()=>number=Date.now){}
 warm(urls:(string|null)[]){
  if(this.disposed)return;
  this.pending=[...new Set(urls.filter((url):url is string=>!!url))].slice(0,13).filter(url=>!this.active.has(url)&&this.now()-(this.completed.get(url)??-Infinity)>30000);
  this.pump();
 }
 ready(urls:string[]){return urls.length>0&&urls.every(url=>this.now()-(this.completed.get(url)??-Infinity)<30000)}
 private pump(){
  while(!this.disposed&&this.active.size<2&&this.pending.length){
   const url=this.pending.shift()!,abort=new AbortController();this.active.set(url,abort);
   const timeout=setTimeout(()=>abort.abort(),2500);
   abort.signal.addEventListener('abort',()=>clearTimeout(timeout),{once:true});
   void this.request(url,{signal:abort.signal,cache:'default',mode:'cors',credentials:'omit',priority:'low'})
    .then(async response=>{if(!response.ok)return;await response.arrayBuffer();if(abort.signal.aborted||this.disposed)return;this.completed.delete(url);this.completed.set(url,this.now());if(this.completed.size>64)this.completed.delete(this.completed.keys().next().value!)})
    .catch(()=>{}).finally(()=>{clearTimeout(timeout);this.active.delete(url);this.pump()});
  }
 }
 destroy(){this.disposed=true;this.pending=[];for(const abort of this.active.values())abort.abort();this.completed.clear();}
}
