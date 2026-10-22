import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateEvent,readEventSnapshot,MAX_VERIFICATION_AGE_MS} from '../lib/events';import {eventRecord,TEST_NOW} from './event-fixture';
const read=(records:unknown[])=>readEventSnapshot({version:1,events:records},TEST_NOW);
test('unknown or unconfirmed event facts are rejected at the shared boundary',()=>{
 for(const fields of [{endsAt:'2030-01-12T06:00:00+01:00'},{price:15,currency:'USD',confirmedFields:['name','startsAt','genre','price']},{startsAt:'2030-01-11'},{startsAt:'2030-02-30T22:00:00Z'},{startsAt:'2030-01-11T22:00:00+15:00'},{sourceUrl:'https://evil.invalid/'},{officialUrl:'https://www.weekendclub.berlin.evil.invalid/'},{demo:true},{scope:'owner-private'},{genre:'Rooftop'},{lastVerifiedAt:new Date(TEST_NOW-MAX_VERIFICATION_AGE_MS).toISOString()}])assert.equal(validateEvent(eventRecord(fields),TEST_NOW),null,JSON.stringify(fields));
});
test('verified millisecond timestamps and confirmed EUR/free prices are accepted',()=>{
 assert.ok(validateEvent(eventRecord({lastVerifiedAt:new Date(TEST_NOW).toISOString()}),TEST_NOW));
 for(const price of [0,15])assert.ok(validateEvent(eventRecord({price,currency:'EUR',confirmedFields:['name','startsAt','genre','price']}),TEST_NOW));
});
test('canonical venue/time/title duplicates collapse and ambiguous simultaneous facts quarantine',()=>{
 const a=eventRecord(),b={...a,id:a.id.slice(0,-1)+(a.id.endsWith('a')?'b':'a')};assert.equal(read([a,b]).length,1);
 const uncertain={...a,price:12,currency:'EUR',confirmedFields:['name','startsAt','genre','price']};assert.deepEqual(read([a,uncertain]),[]);assert.deepEqual(read([a,{...uncertain,lastVerifiedAt:new Date(TEST_NOW).toISOString()}]),[]);
 assert.deepEqual(read([a,{...a,name:'TEST ONLY – conflicting ID'}]),[]);
});
test('snapshots are bounded and public readers cannot expose private reviewed facts',()=>{
 assert.deepEqual(read(Array.from({length:1001},()=>eventRecord())),[]);
 const p=eventRecord({scope:'owner-private'});assert.equal(read([p]).length,0);assert.equal(readEventSnapshot({version:1,events:[p]},TEST_NOW,'owner-private').length,1);
 assert.deepEqual(readEventSnapshot({version:2,events:[eventRecord()]},TEST_NOW),[]);
});
