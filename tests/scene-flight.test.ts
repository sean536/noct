import {test} from 'node:test';import assert from 'node:assert/strict';
import {SceneFlight,RenderReadiness,MAX_HOLD_MS,DESCENT_MS,REVEAL_MS,type SceneSample,type FlightPhase} from '../lib/scene-flight';
import {cameraPlan,FINAL_ZOOM} from '../lib/camera-plan';
function setup(duration=3000,reduced=false){
 let now=0,id=0,render:(()=>void)|undefined,end:(()=>void)|undefined,sample:SceneSample={approachReady:false,finalReady:false},next=0;
 const timers=new Map<number,{at:number;fn:()=>void}>(),moves:{phase:FlightPhase;duration:number}[]=[],results:{ready:boolean;descended:boolean;elapsed:number}[]=[],presented:boolean[]=[];
 const flight=new SceneFlight({move:(phase,duration)=>moves.push({phase,duration}),sample:()=>sample,subscribe:(r,e)=>{render=r;end=e;return()=>{render=undefined;end=undefined}},repaint:()=>{},stop:()=>{},now:()=>now,later:(fn,ms)=>{timers.set(++id,{at:now+ms,fn});return id},cancel:key=>{timers.delete(key as number)},prepareNext:()=>{next++},present:ready=>presented.push(ready)},duration,reduced,r=>results.push(r));
 const advance=(ms:number)=>{const target=now+ms;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>target)break;timers.delete(next[0]);now=next[1].at;next[1].fn()}now=target};
 return {flight,moves,results,timers,presented,advance,draw:()=>render?.(),moveEnd:()=>end?.(),setSample:(s:SceneSample)=>{sample=s},get subscribed(){return !!render||!!end},get next(){return next}};
}
test('readiness requires stable post-draw observations and resets on missing data',()=>{const gate=new RenderReadiness();assert.equal(gate.check(false,0),false);assert.equal(gate.check(true,100),false);assert.equal(gate.check(true,150),false);assert.equal(gate.check(true,200),true);assert.equal(gate.check(false,210),false);assert.equal(gate.check(true,220),false)});
test('staging stays higher and 3D; only prepared descent uses final zoom/perspective',()=>{const target:[number,number]=[13.44,52.51];for(const phase of ['cruise','holding'] as const){const camera=cameraPlan(target,40,54,phase,false);assert.ok(camera.zoom<FINAL_ZOOM-.8);assert.ok(camera.pitch>=40);assert.notDeepEqual(camera.center,target)}const final=cameraPlan(target,40,54,'descent',true);assert.equal(final.zoom,16.6);assert.equal(final.pitch,54);assert.equal(cameraPlan(target,40,54,'reveal',false).zoom,15.55)});
test('unready target remains in high holding arc; prepared geometry starts descent and preloads following event',()=>{
 const t=setup();t.flight.start();t.advance(3000);t.moveEnd();assert.equal(t.moves.at(-1)?.phase,'holding');assert.equal(t.results.length,0);
 t.setSample({approachReady:true,finalReady:false});t.draw();t.advance(120);t.draw();assert.equal(t.moves.at(-1)?.phase,'descent');assert.equal(t.next,1);
 t.advance(DESCENT_MS);t.moveEnd();assert.equal(t.moves.at(-1)?.phase,'reveal');assert.equal(t.results.length,0);
 t.setSample({approachReady:true,finalReady:true});t.draw();t.advance(120);t.draw();t.advance(REVEAL_MS-120);t.moveEnd();assert.equal(t.results[0].ready,true);assert.equal(t.results[0].descended,true);assert.equal(t.subscribed,false);assert.equal(t.timers.size,0);
});
test('missing data uses bounded higher pass, never a forced final close-up or an endless spinner',()=>{
 const t=setup();t.flight.start();t.advance(3000);t.moveEnd();t.advance(MAX_HOLD_MS);t.moveEnd();assert.deepEqual(t.moves.map(m=>m.phase),['cruise','holding','reveal']);t.advance(REVEAL_MS);t.moveEnd();assert.deepEqual(t.results,[{ready:false,descended:false,elapsed:3000+MAX_HOLD_MS+REVEAL_MS}]);assert.equal(t.timers.size,0);
});
test('warm high-stage evidence does not pretend final perspective has rendered',()=>{
 const t=setup();t.setSample({approachReady:true,finalReady:false});t.flight.start();t.draw();t.advance(120);t.draw();t.advance(2880);t.moveEnd();t.advance(DESCENT_MS);t.moveEnd();t.advance(REVEAL_MS);t.moveEnd();assert.equal(t.results[0].ready,false);assert.equal(t.results[0].descended,true);
});
test('lost moveend has a hard deadline; cancellation invalidates callbacks and all timers',()=>{const t=setup();t.flight.start();t.advance(20000);assert.equal(t.results.length,1);assert.equal(t.results[0].ready,false);assert.equal(t.timers.size,0);const other=setup();other.flight.start();other.flight.cancel();other.advance(20000);other.moveEnd();other.draw();assert.equal(other.results.length,0);assert.equal(other.subscribed,false);assert.equal(other.timers.size,0)});
test('reduced motion jumps once and verifies final view without animated cruise/orbit',()=>{const t=setup(0,true);t.flight.start();t.moveEnd();t.setSample({approachReady:true,finalReady:true});t.draw();t.advance(120);t.draw();assert.deepEqual(t.moves,[{phase:'descent',duration:0}]);assert.equal(t.results[0].ready,true);assert.equal(t.timers.size,0)});
