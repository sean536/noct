import {locations} from './locations';
/** Disabled until the publisher's permission, robots policy and adapter have been checked. */
export interface EventSource {locationId:string;url:string;enabled:boolean;rightsReviewed:boolean;scope:'owner-private'|'public'}
export const eventSources:EventSource[]=locations.map(location=>({locationId:location.id,url:location.calendarUrl,enabled:false,rightsReviewed:false,scope:'owner-private'}));
export const SOURCE_USER_AGENT='NOCT-EventVerifier';
