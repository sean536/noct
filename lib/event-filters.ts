import type {Genre,NightEvent} from './events';

export type DiscoveryGenre=Genre|'House';
export interface EventFilters {genre?:DiscoveryGenre;district?:string;budget?:number}
export const primaryGenres:ReadonlyArray<{label:string;value:DiscoveryGenre}>=[
 {label:'Afro',value:'Afrobeat'},{label:'Techno',value:'Techno'},{label:'House',value:'House'},
 {label:'Rooftop',value:'Rooftop'},{label:'Bars',value:'Bars'}
];
/** One predicate for chat, filter controls, cards and map IDs; original event records stay intact. */
export function matchesFilters(event:NightEvent,filters:EventFilters){
 return (!filters.genre||event.genre===filters.genre||filters.genre==='House'&&event.tags.includes('House'))
  &&(!filters.district||event.district===filters.district)
  &&(filters.budget===undefined||event.price<=filters.budget);
}
