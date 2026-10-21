import type {Genre,NightEvent} from './events';
import {locationById} from './locations';

export type DiscoveryGenre=Genre|'House';
export interface EventFilters {genre?:DiscoveryGenre;district?:string;budget?:number;fromDate?:string;toDate?:string}
export const primaryGenres:ReadonlyArray<{label:string;value:DiscoveryGenre}>=[
 {label:'Afro',value:'Afrobeat'},{label:'Techno',value:'Techno'},{label:'House',value:'House'},
 {label:'Rooftop',value:'Rooftop'},{label:'Bars',value:'Bars'}
];
/** One predicate for chat, filter controls, cards and map IDs; original event records stay intact. */
export function matchesFilters(event:NightEvent,filters:EventFilters){
 return (!filters.genre||event.genre===filters.genre||event.tags.includes(filters.genre)||locationById(event.locationId)?.categories.includes(filters.genre))
  &&(!filters.district||event.district===filters.district)
  &&(filters.budget===undefined||event.price!==null&&event.price<=filters.budget)
  &&(!filters.fromDate||event.date>=filters.fromDate)&&(!filters.toDate||event.date<=filters.toDate);
}
