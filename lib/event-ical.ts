import {eventID} from './event-id';import {officialURL,readEventSnapshot,type NightEvent,type Genre} from './events';import type {EventSource} from './event-sources';
type Property={params:string;value:string};
const decode=(value:string)=>value.replace(/\\([nN,;\\])/g,(_all,char:string)=>char==='n'||char==='N'?'\n':char).trim();
/** No floating/all-day time, recurrence expansion or ambiguous DST guess. */
function instant(property:Property|undefined):string|null{
 if(!property)return null;const match=property.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);if(!match)return null;
 const [,y,m,d,h,min,s,z]=match;const local=`${y}-${m}-${d}T${h}:${min}:${s}`;
 if(z&&(!property.params||property.params===';VALUE=DATE-TIME'))return local+'Z';
 if(z||!/^;TZID="?Europe\/Berlin"?$/.test(property.params))return null;
 const wall=Date.UTC(+y,+m-1,+d,+h,+min,+s),format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
 const candidates=[60,120].map(offset=>new Date(wall-offset*60_000)).filter(date=>format.format(date).replace(' ','T')===local);
 return candidates.length===1?candidates[0].toISOString():null;
}
export function icalEvents(text:string,source:EventSource,now=Date.now()):NightEvent[]{
 if(source.locationId!=='weekend-club'||!officialURL(source.url,source.locationId)||text.length>2_000_000)return [];
 const lines=text.replace(/\r\n[ \t]|\n[ \t]/g,'').split(/\r?\n/);if(lines[0]!=='BEGIN:VCALENDAR'||!lines.includes('VERSION:2.0')||lines.some(line=>/^METHOD(?:;|:)/i.test(line)&&line.slice(line.indexOf(':')+1).toUpperCase()!=='PUBLISH'))return [];
 const records:unknown[]=[];let properties:Map<string,Property>|null=null,bad=false,components=0;
 for(const line of lines){
  if(line==='BEGIN:VEVENT'){if(properties||++components>1000)return [];properties=new Map();bad=false;continue;}
  if(!properties)continue;
  if(line==='END:VEVENT'){
   if(!bad){const get=(key:string)=>properties!.get(key),start=instant(get('DTSTART')),end=get('DTEND')?instant(get('DTEND')):null;
    const name=decode(get('SUMMARY')?.value||''),url=decode(get('URL')?.value||''),place=decode(get('LOCATION')?.value||''),status=get('STATUS')?.value;
    const validPlace=/\bweekend club\b/i.test(place)&&/alexander(?:stra(?:ß|ss)e|str\.?)\s*7\b/i.test(place);
    const nonPublic=['PRIVATE','CONFIDENTIAL'].includes(get('CLASS')?.value.toUpperCase()||'');
    if(start&&(!get('DTEND')||end)&&name&&validPlace&&!nonPublic&&(!status||status==='CONFIRMED')&&officialURL(url,source.locationId)&&new URL(url).pathname.startsWith('/upcoming/')){
     const fields=['name','startsAt'];if(end)fields.push('endsAt');
     const genres:Genre[]=['Techno','House','Afrobeat','Hip-Hop'],tags=(get('CATEGORIES')?.value||'').split(',').map(decode).filter((value):value is Genre=>genres.includes(value as Genre));if(tags.length)fields.push('genre');
     records.push({id:eventID(source.locationId,name,start),locationId:source.locationId,name,startsAt:start,endsAt:end,genre:tags[0]||null,tags,price:null,currency:null,sourceUrl:source.url,officialUrl:url,lastVerifiedAt:new Date(now).toISOString(),verification:'structured-source',confirmedFields:fields,scope:source.scope});
    }
   }properties=null;continue;
  }
  if(line.startsWith('BEGIN:')||line.startsWith('END:')){bad=true;continue;}
  const colon=line.indexOf(':');if(colon<0){bad=true;continue;}const header=line.slice(0,colon),key=header.split(';')[0].toUpperCase(),params=header.slice(key.length);
  if(['RRULE','RDATE','EXDATE','RECURRENCE-ID'].includes(key))bad=true;
  if(properties.has(key)&&['SUMMARY','DTSTART','DTEND','URL','LOCATION','STATUS','CLASS','CATEGORIES'].includes(key))bad=true;
  properties.set(key,{params,value:line.slice(colon+1)});
 }
 if(properties||lines.at(-1)!=='END:VCALENDAR'&&lines.at(-2)!=='END:VCALENDAR')return [];
 return readEventSnapshot({version:1,events:records},now,source.scope);
}
/** Only actual linked ICS URLs, never synthesize a feed endpoint. */
export function weekendCalendarLinks(html:string,source:EventSource):string[]{
 if(source.locationId!=='weekend-club'||!officialURL(source.url,source.locationId))return [];
 const links=new Set<string>();for(const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)){
  try{const url=new URL(match[1].replace(/&amp;/g,'&'),source.url);if(officialURL(url.href,source.locationId)&&url.pathname.startsWith('/upcoming/')&&url.searchParams.get('format')==='ical')links.add(url.href);}catch{}
  if(links.size>=6)break;
 }return [...links];
}
