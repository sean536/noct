import {locationById} from './locations';
export type Genre='Techno'|'House'|'Afrobeat'|'Hip-Hop'|'Rooftop'|'Bars'|'Dates';
export interface NightEvent {
 id:string;locationId:string;name:string;venue:string;district:string;genre:Genre|null;tags:string[];
 startsAt:string;endsAt:string|null;date:string;time:string;price:number|null;currency:'EUR'|null;coords:[number,number];
 sourceUrl:string;officialUrl:string;lastVerifiedAt:string;verification:'manual-official-calendar'|'structured-source';
 confirmedFields:string[];scope:'owner-private'|'public';
}
export const NO_EVENTS='Aktuell keine bestätigten Events gefunden.';
export const MAX_VERIFICATION_AGE_MS=48*60*60*1000;
/** Empty bootstrap, never a fictional fallback. */
export const events:NightEvent[]=[];
export const priceLabel=(price:number|null)=>price===null?'Eintritt nicht bestätigt':price===0?'Eintritt frei':`${price} €`;
export const dateLabel=(date:string)=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Berlin'}).format(new Date(date+'T12:00:00Z'));
export const berlinDate=(instant:number|string)=>new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(instant));
export const berlinTime=(instant:string)=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Berlin'}).format(new Date(instant));
export const isCurrentEvent=(event:NightEvent,now=Date.now())=>!!locationById(event.locationId)&&Date.parse(event.startsAt)>now&&Date.parse(event.lastVerifiedAt)<=now+60_000&&Date.parse(event.lastVerifiedAt)>now-MAX_VERIFICATION_AGE_MS;
function iso(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))return false;
 const [y,m,d]=value.slice(0,10).split('-').map(Number),check=new Date(Date.UTC(y,m-1,d));
 return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d&&+value.slice(11,13)<24&&+value.slice(14,16)<60&&(!value.slice(17,19).match(/^\d\d$/)||+value.slice(17,19)<60)&&(/Z$/.test(value)||((+value.slice(-5,-3)<14||+value.slice(-5,-3)===14&&+value.slice(-2)===0)&&+value.slice(-2)<60));
}
export function officialURL(value:unknown,locationId:string):value is string{
 if(typeof value!=='string')return false;const location=locationById(locationId);if(!location)return false;
 try{const url=new URL(value),site=new URL(location.website);return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname===site.hostname&&!url.port;}catch{return false;}
}
/** Shared strict boundary; venue, coordinates and local date/time are derived, never trusted from input. */
export function validateEvent(record:unknown,now=Date.now(),audience:'owner-private'|'public'='public'):NightEvent|null{
 if(!record||typeof record!=='object')return null;
 const r=record as Record<string,unknown>,location=typeof r.locationId==='string'&&locationById(r.locationId);
 if(!location||typeof r.id!=='string'||!new RegExp(`^event:${location.id}:[a-f0-9]{24}$`).test(r.id)||r.demo!==undefined)return null;
 if(typeof r.name!=='string'||!r.name.trim()||r.name.length>180||/[<>\u0000-\u001f]/.test(r.name))return null;
 if(!iso(r.startsAt)||!iso(r.lastVerifiedAt)||r.endsAt!==null&&(!iso(r.endsAt)||Date.parse(r.endsAt)<=Date.parse(r.startsAt)))return null;
 if(!officialURL(r.sourceUrl,location.id)||!officialURL(r.officialUrl,location.id))return null;
 if(!['manual-official-calendar','structured-source'].includes(String(r.verification)))return null;
 if(!['public','owner-private'].includes(String(r.scope))||r.scope==='owner-private'&&audience!=='owner-private')return null;
 if(!Array.isArray(r.confirmedFields))return null;const fields=r.confirmedFields as unknown[];
 if(!['name','startsAt'].every(field=>fields.includes(field))||fields.some(field=>typeof field!=='string'))return null;
 if(r.endsAt!==null&&!fields.includes('endsAt'))return null;
 if(r.price!==null&&(typeof r.price!=='number'||!Number.isFinite(r.price)||r.price<0||r.price>10000||r.currency!=='EUR'||!fields.includes('price')))return null;
 if(r.price===null&&r.currency!==null)return null;
 const genres:Genre[]=['Techno','House','Afrobeat','Hip-Hop'];
 if(r.genre!==null&&(!genres.includes(r.genre as Genre)||!fields.includes('genre')))return null;
 if(!Array.isArray(r.tags)||r.tags.some(tag=>typeof tag!=='string'||tag.length>40)||r.tags.length>15||r.tags.length>0&&!fields.includes('genre'))return null;
 const event:NightEvent={id:r.id,locationId:location.id,name:r.name.trim(),venue:location.name,district:location.district,coords:location.coords,genre:r.genre as Genre|null,tags:r.tags as string[],startsAt:r.startsAt,endsAt:r.endsAt as string|null,date:berlinDate(r.startsAt),time:berlinTime(r.startsAt),price:r.price as number|null,currency:r.price===null?null:'EUR',sourceUrl:r.sourceUrl,officialUrl:r.officialUrl,lastVerifiedAt:r.lastVerifiedAt,verification:r.verification as NightEvent['verification'],confirmedFields:fields as string[],scope:r.scope as NightEvent['scope']};
 return isCurrentEvent(event,now)?event:null;
}
export function readEventSnapshot(snapshot:unknown,now=Date.now(),audience:'owner-private'|'public'='public'):NightEvent[]{
 if(!snapshot||typeof snapshot!=='object'||(snapshot as {version?:unknown}).version!==1||!Array.isArray((snapshot as {events?:unknown}).events))return [];
 if((snapshot as {events:unknown[]}).events.length>1000)return [];
 const result=new Map<string,NightEvent>(),ids=new Map<string,string>(),conflicts=new Set<string>();
 for(const raw of (snapshot as {events:unknown[]}).events){
  const event=validateEvent(raw,now,audience);if(!event)continue;
  const key=`${event.locationId}|${Date.parse(event.startsAt)}|${event.name.toLocaleLowerCase('de-DE').normalize('NFKC').replace(/\s+/g,' ')}`;
  const previous=ids.get(event.id);if(previous&&previous!==key){conflicts.add(previous);conflicts.add(key);continue;}ids.set(event.id,key);
  const prior=result.get(key);if(prior&&Date.parse(prior.lastVerifiedAt)===Date.parse(event.lastVerifiedAt)&&JSON.stringify([prior.endsAt,prior.genre,prior.tags,prior.price])!==JSON.stringify([event.endsAt,event.genre,event.tags,event.price])){conflicts.add(key);continue;}
  if(!result.has(key)||Date.parse(result.get(key)!.lastVerifiedAt)<Date.parse(event.lastVerifiedAt))result.set(key,event);
 }
 return [...result.entries()].filter(([key])=>!conflicts.has(key)).map(([,event])=>event).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
}
