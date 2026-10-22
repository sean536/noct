import {test} from 'node:test';import assert from 'node:assert/strict';import {eventSources,sourceReadiness} from '../lib/event-sources';import {structuredEvents,refreshSources} from '../lib/event-ingestion';import {locations} from '../lib/locations';import {TEST_NOW} from './event-fixture';
const source=(id:string)=>eventSources.find(s=>s.locationId===id)!;
const html=(data:unknown)=>`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
/** All names/dates in this file are explicit TEST fixtures, never operational event data. */
const event=(id:string)=>({'@type':'MusicEvent',name:'TEST ONLY – per-club adapter',startDate:'2030-01-11T22:00:00+01:00',url:source(id).url,location:{url:locations.find(l=>l.id===id)!.website}});
test('all six independent venues have explicit source adapters and no enabled scraper',()=>{assert.equal(eventSources.length,6);for(const l of locations){const s=source(l.id);assert.equal(s.url,l.calendarUrl);assert.equal(s.enabled,false);assert.equal(s.rightsReviewed,false);assert.ok(s.adapter);assert.ok(sourceReadiness[l.id].blocker);}});
test('BRICKS explicit confirmed structured date is imported with unknown optional facts',()=>{const result=structuredEvents(html(event('bricks-club')),source('bricks-club'),TEST_NOW);assert.equal(result.length,1);assert.equal(result[0].locationId,'bricks-club');assert.equal(result[0].price,null);assert.equal(result[0].genre,null);assert.equal(result[0].endsAt,null);});
test('808 calendar date and guestlist cutoff never become a guessed event start',()=>{
 const s=source('808-nachtklub');assert.deepEqual(structuredEvents('<h2>23-Okt-26</h2><p>TEST ONLY – concert afterparty</p><p>Guestlist discount until 0.30</p>',s,TEST_NOW),[]);
 assert.deepEqual(structuredEvents(html({...event(s.locationId),startDate:'2030-01-11'}),s,TEST_NOW),[]);
 assert.equal(structuredEvents(html(event(s.locationId)),s,TEST_NOW).length,1);
});
test('AMANO location remains empty for bar hours, drink prices and other same-host venues',()=>{
 const s=source('amano-rooftop');assert.deepEqual(structuredEvents('<p>Für diese Location sind keine Events geplant.</p><p>Mon - So ab 17:00</p>'+html({'@type':'BarOrPub',name:'Grand Central',openingHours:'Mo-Su 17:00',offers:{price:15,priceCurrency:'EUR'}}),s,TEST_NOW),[]);
 assert.deepEqual(structuredEvents(html({...event(s.locationId),location:{url:'https://www.amanogroup.com/de/bars/amano-bar-munich'}}),s,TEST_NOW),[]);
});
test('one source failure cannot invent an event or contaminate another club',async()=>{
 const sources=['808-nachtklub','bricks-club','amano-rooftop'].map(id=>({...source(id),enabled:true,rightsReviewed:true}));
 const result=await refreshSources(sources,TEST_NOW,async url=>{const u=new URL(String(url));if(u.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');if(u.hostname==='808.berlin')throw Error('Unavailable');if(u.hostname==='www.bricks-berlin.club')return new Response(html(event('bricks-club')));return new Response('No events planned');});
 assert.equal(result.events.length,1);assert.equal(result.events[0].locationId,'bricks-club');assert.equal(result.refresh.sources.length,3);assert.equal(result.refresh.sources[0].count,0);assert.equal(result.refresh.sources[2].count,0);
});
