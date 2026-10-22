import {locations} from './locations';
/** No entry is enabled until permission, robots, network and its live adapter have been checked. */
export interface EventSource {locationId:string;url:string;enabled:boolean;rightsReviewed:boolean;scope:'owner-private'|'public';adapter?:'official-jsonld'|'weekend-calendar'}
export const SOURCE_USER_AGENT='NOCT-EventVerifier';
/** Research status, not a promise of feed availability or future event completeness. */
export const sourceReadiness:Record<string,{reviewedOn:string;status:string;blocker:string}>={
 '808-nachtklub':{reviewedOn:'2026-10-22',status:'missing-confirmed-start-time',blocker:'Official calendar has dates and names, but no verified event start times. Guestlist cutoff is not a start time.'},
 'bricks-club':{reviewedOn:'2026-10-22',status:'manual-official-record-available',blocker:'One event has an explicit full date/year/time. No permitted working structured feed has been demonstrated.'},
 'amano-rooftop':{reviewedOn:'2026-10-22',status:'officially-no-events-published',blocker:'Grand Central rooftop page explicitly reports no scheduled events. Other AMANO venues and bar hours must not be imported.'},
 'weekend-club':{reviewedOn:'2026-10-22',status:'manual-records-and-linked-ics',blocker:'Linked ICS adapter tested offline; live feed access, robots and commercial reuse permission remain unverified.'}
};
export const eventSources:EventSource[]=locations.map(location=>({locationId:location.id,url:location.calendarUrl,enabled:false,rightsReviewed:false,scope:'owner-private',adapter:location.id==='weekend-club'?'weekend-calendar':'official-jsonld'}));
