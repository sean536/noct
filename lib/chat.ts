import {NO_EVENTS,isCurrentEvent,berlinDate,type NightEvent} from './events';
import {matchesFilters,type DiscoveryGenre,type EventFilters} from './event-filters';
export type Preferences=EventFilters;
export interface ChatResult {text:string;events:NightEvent[];preferences:Preferences;}
const addDay=(date:string,days:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function recommend(input:string,previous:Preferences={},available:NightEvent[]=[],now=Date.now()):ChatResult {
 const q=input.toLowerCase().trim(),preferences={...previous};
 const genres:[RegExp,DiscoveryGenre][]=[[/techno|rave|elektron/,'Techno'],[/afro|amapiano/,'Afrobeat'],[/hip.?hop|rap|r&b/,'Hip-Hop'],[/rooftop|dach|sunset/,'Rooftop'],[/bars?\b|cocktail/,'Bars'],[/date|jazz|romant/,'Dates'],[/\bhouse\b/,'House']];
 for(const [pattern,genre] of genres)if(pattern.test(q)){preferences.genre=genre;break;}
 for(const district of ['Charlottenburg-Wilmersdorf','Kreuzberg','Friedrichshain','Neukölln','Mitte'])if(q.includes(district.toLowerCase())||district==='Neukölln'&&q.includes('neukoelln'))preferences.district=district;
 if(/egal|alle bezirke|ganz berlin/.test(q))delete preferences.district;
 if(/alle vibes|überrasch|spontan/.test(q)){delete preferences.genre;delete preferences.district;}
 const budget=q.match(/(?:bis|max(?:imal)?\.?|unter|budget)\s*(\d+)|(?:\b)(\d+)\s*(?:€|euro)/);if(budget)preferences.budget=Number(budget[1]||budget[2]);
 if(/kostenlos|gratis|umsonst/.test(q))preferences.budget=0;
 if(/budget egal|preis egal/.test(q))delete preferences.budget;
 const today=berlinDate(now),day=new Date(today+'T12:00:00Z').getUTCDay();
 let from:string|undefined,to:string|undefined;
 const explicit=q.match(/\b(20\d\d-\d\d-\d\d)\b/);
 if(explicit)from=to=explicit[1];
 else if(/morgen/.test(q))from=to=addDay(today,1);
 else if(/heute/.test(q))from=to=today;
 else if(/wochenende/.test(q)){from=addDay(today,day===0?-2:day===6?-1:(5-day+7)%7);to=addDay(from,2);}
 else if(/freitag|samstag|sonntag/.test(q)){const target=/freitag/.test(q)?5:/samstag/.test(q)?6:0;from=to=addDay(today,(target-day+7)%7);}
 if(from){preferences.fromDate=from;preferences.toDate=to;}
 if(/alle termine|zeit egal|datum egal/.test(q)){delete preferences.fromDate;delete preferences.toDate;}
 const matches=available.filter(event=>isCurrentEvent(event,now)&&matchesFilters(event,preferences));
 if(!matches.length)return {text:NO_EVENTS,events:[],preferences};
 return {text:`${matches.length===1?'Eine bestätigte Veranstaltung':`${matches.length} bestätigte Veranstaltungen`} passt zu deiner Auswahl. Datum, Quelle und Prüfzeit findest du in den Eventdetails.`,events:matches,preferences};
}
