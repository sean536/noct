import {createHash} from 'node:crypto';
/** Server-side stable identity; equivalent timezone spellings map to the same instant. */
export function eventID(locationId:string,name:string,startsAt:string){return `event:${locationId}:${createHash('sha256').update(`${name.trim().normalize('NFKC').toLocaleLowerCase('de-DE').replace(/\s+/g,' ')}|${Date.parse(startsAt)}`).digest('hex').slice(0,24)}`;}
