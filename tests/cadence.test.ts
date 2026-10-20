import {test} from 'node:test';import assert from 'node:assert/strict';import {setup} from './tour-fixture';
test('endless tour hands off immediately after each moving reveal, never while a destination is busy',()=>{
 const t=setup();t.tour.start();t.advance(9000);assert.equal(t.flights.length,1);
 t.arrive();t.advance(0);assert.equal(t.flights.at(-1)?.id,'club','there must be no stationary two-second dwell');
 t.advance(8000);assert.equal(t.flights.length,2);assert.equal(t.tasks.size,0);
 t.arrive();t.advance(0);assert.equal(t.flights.at(-1)?.id,'bar');assert.equal(t.flights[2].intro,false);
 for(let i=0;i<20;i++){t.arrive();t.advance(0)}assert.equal(t.flights.length,23);
 t.tour.destroy();assert.equal(t.tasks.size,0);
});
