import {createHash} from 'node:crypto';
import {validateEvent,type NightEvent} from '../lib/events';
export const TEST_NOW=Date.parse('2030-01-10T12:00:00Z');
/** Test-only record; never imported by the app or published as an event. */
export function eventRecord(overrides:Record<string,unknown>={}){
 const fields={locationId:'weekend-club',name:'TEST ONLY – validation fixture',startsAt:'2030-01-11T22:00:00+01:00',endsAt:null,genre:'House',tags:['House','Techno'],price:null,currency:null,sourceUrl:'https://www.weekendclub.berlin/__test-only__',officialUrl:'https://www.weekendclub.berlin/__test-only__',lastVerifiedAt:new Date(TEST_NOW).toISOString().replace('.000',''),verification:'manual-official-calendar',scope:'public',confirmedFields:['name','startsAt','genre'],...overrides};
 return {id:`event:${fields.locationId}:${createHash('sha256').update(fields.name+'|'+fields.startsAt).digest('hex').slice(0,24)}`,...fields};
}
export function eventFixture(overrides:Record<string,unknown>={}):NightEvent {const event=validateEvent(eventRecord(overrides),TEST_NOW);if(!event)throw Error('Invalid TEST ONLY fixture');return event;}
