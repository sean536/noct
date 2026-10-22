/** Server/CLI-only: bounded, explicit structured facts; never infer dates, prices or genre from prose. */
import {eventID} from './event-id';
export {eventID} from './event-id';
import {icalEvents,weekendCalendarLinks} from './event-ical';
import {locations,locationById} from './locations';
import {officialURL,readEventSnapshot,type NightEvent,type Genre} from './events';
import {type EventSource,SOURCE_USER_AGENT} from './event-sources';
type Obj=Record<string,unknown>;
function objects(value:unknown,depth=0):Obj[]{
 if(depth>8||!value||typeof value!=='object')return [];
 if(Array.isArray(value))return value.slice(0,1000).flatMap(x=>objects(x,depth+1));
 const object=value as Obj;return [object,...objects(object['@graph'],depth+1),...objects(object.itemListElement,depth+1),...objects(object.item,depth+1)];
}
export function structuredEvents(html:string,source:EventSource,now=Date.now()):NightEvent[]{
 if(html.length>2_000_000||!officialURL(source.url,source.locationId))return [];
 const records:unknown[]=[];const blocks=[...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].slice(0,30);
 for(const block of blocks){let data:unknown;try{data=JSON.parse(block[1]);}catch{continue;}
 for(const raw of objects(data)){
  const types=Array.isArray(raw['@type'])?raw['@type']:[raw['@type']];if(!types.some(t=>t==='Event'||t==='MusicEvent'))continue;
  if(raw.eventStatus!==undefined&&!['https://schema.org/EventScheduled','http://schema.org/EventScheduled','EventScheduled'].includes(String(raw.eventStatus)))continue;
  if(typeof raw.name!=='string'||typeof raw.startDate!=='string'||!officialURL(raw.url,source.locationId))continue;
  // Do not publish an event at another venue merely because it is linked on this calendar.
  const location=raw.location as Obj|undefined;
  if(!location||!officialURL(location.url,source.locationId))continue;
  const canonicalVenue=locationById(source.locationId)!.website;
  const canonical=(value:string)=>{const u=new URL(value);u.hash='';return u.href.replace(/\/$/,'');};
  if(canonical(location.url)!==canonical(canonicalVenue))continue;
  const fields=['name','startsAt'];let end:string|null=null;
  if(raw.endDate!==undefined){if(typeof raw.endDate!=='string')continue;end=raw.endDate;fields.push('endsAt');}
  const accepted:Genre[]=['Techno','House','Afrobeat','Hip-Hop'];let genre:Genre|null=null;const tags:string[]=[];
  if(raw.genre!==undefined){const values=Array.isArray(raw.genre)?raw.genre:[raw.genre];for(const g of values)if(typeof g==='string'&&g.length<=40)tags.push(g);genre=tags.find(g=>accepted.includes(g as Genre)) as Genre||null;if(tags.length)fields.push('genre');}
  let price:number|null=null;const offers=Array.isArray(raw.offers)?raw.offers:[raw.offers];
  // A single explicitly priced EUR offer only; no minimum/estimated/"free entry" prose.
  if(offers.length===1&&offers[0]&&typeof offers[0]==='object'){
   const offer=offers[0] as Obj;if(offer.priceCurrency==='EUR'&&(typeof offer.price==='number'||typeof offer.price==='string'&&/^\d+(?:\.\d{1,2})?$/.test(offer.price))&&officialURL(offer.url,source.locationId)){price=Number(offer.price);fields.push('price');}
  }
  records.push({id:eventID(source.locationId,raw.name,raw.startDate),locationId:source.locationId,name:raw.name,startsAt:raw.startDate,endsAt:end,genre,tags,price,currency:price===null?null:'EUR',sourceUrl:source.url,officialUrl:raw.url,lastVerifiedAt:new Date(now).toISOString(),verification:'structured-source',confirmedFields:fields,scope:source.scope});
 }}
 return readEventSnapshot({version:1,events:records},now,source.scope);
}
/** Conservative robots subset: unknown directives or crawl delays require manual review, never bypass. */
export function robotsAllowed(text:string,path:string):boolean{
 if(text.length>100_000||/%(?![a-f0-9]{2})/i.test(path))return false;
 const normalized=(value:string)=>encodeURI(value).replace(/%25([a-f0-9]{2})/gi,'%$1').replace(/%([a-f0-9]{2})/gi,(all,hex:string)=>{const char=String.fromCharCode(parseInt(hex,16));return /[a-z0-9._~-]/i.test(char)?char:all.toUpperCase();});
 path=normalized(path);
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group:typeof groups[number]|undefined,hasRules=false;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.replace(/#.*/,'').trim();if(!line)continue;const i=line.indexOf(':');if(i<0)return false;
  const key=line.slice(0,i).trim().toLowerCase(),value=line.slice(i+1).trim();
  if(key==='user-agent'){if(!group||hasRules){group={agents:[],rules:[]};groups.push(group);hasRules=false;}group.agents.push(value.toLowerCase());}
  else if(key==='allow'||key==='disallow'){if(!group)return false;hasRules=true;if(value){if(/%(?![a-f0-9]{2})/i.test(value))return false;group.rules.push({allow:key==='allow',path:normalized(value)});}}
  else if(key!=='sitemap')return false;
 }
 const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&SOURCE_USER_AGENT.toLowerCase().includes(a))),selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const matches=selected.flatMap(g=>g.rules).filter(rule=>{const escaped=rule.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');return new RegExp('^'+escaped).test(path);}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return matches.length===0||matches[0].allow;
}
async function boundedGet(url:string,fetcher:typeof fetch):Promise<string>{
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(10_000),headers:{'User-Agent':SOURCE_USER_AGENT,'Accept':'text/html, text/calendar;q=0.9, text/plain;q=0.8'}});
 if(!response.ok)throw Error(`HTTP ${response.status}`);if(Number(response.headers.get('content-length')||0)>2_000_000)throw Error('Response too large');
 if(!response.body)return '';const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000)throw Error('Response too large');chunks.push(value);}}finally{await reader.cancel();}
 const buffer=new Uint8Array(size);let pos=0;for(const chunk of chunks){buffer.set(chunk,pos);pos+=chunk.length;}return new TextDecoder().decode(buffer);
}
export async function refreshSources(sources:EventSource[],now=Date.now(),fetcher:typeof fetch=fetch){
 const events:NightEvent[]=[],report:{locationId:string;status:string;count:number}[]=[];
 // Sequential and bounded. No persistent cache or bulk scraping; no stale fallback on failure.
 for(const source of sources.slice(0,locations.length)){
  if(!source.enabled||!source.rightsReviewed){report.push({locationId:source.locationId,status:'disabled-pending-permission',count:0});continue;}
  if(!officialURL(source.url,source.locationId)){report.push({locationId:source.locationId,status:'invalid-source',count:0});continue;}
  try{const url=new URL(source.url),robots=await boundedGet(url.origin+'/robots.txt',fetcher);if(!robotsAllowed(robots,url.pathname+url.search))throw Error('Robots policy does not permit this request');
   const html=await boundedGet(source.url,fetcher),data=structuredEvents(html,source,now);
   if(source.adapter==='weekend-calendar'||!source.adapter&&source.locationId==='weekend-club'){
    for(const link of weekendCalendarLinks(html,source)){const feed=new URL(link);if(!robotsAllowed(robots,feed.pathname+feed.search))continue;data.push(...icalEvents(await boundedGet(link,fetcher),{...source,url:link},now));}
   }
   events.push(...data);report.push({locationId:source.locationId,status:data.length?'verified-structured':'no-verified-structured-events',count:data.length});
  }catch(error){report.push({locationId:source.locationId,status:`unavailable: ${error instanceof Error?error.message:'request failed'}`,count:0});}
 }
 return {version:1,events:readEventSnapshot({version:1,events},now,'owner-private'),refresh:{mode:'prepared-not-active',dailyActive:false,attemptedAt:new Date(now).toISOString(),sources:report}};
}
