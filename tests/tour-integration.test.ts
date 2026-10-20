import {test} from 'node:test';import assert from 'node:assert/strict';import {EventTour} from '../lib/tour';import {SceneFlight,type FlightPhase} from '../lib/scene-flight';import {events} from '../lib/events';
test('twelve automatic passes use actual tour/arrival controllers, including missing data, without dwell, overlap or leaked timers',()=>{
 let now=0,id=0,active:SceneFlight|undefined,render:(()=>void)|undefined,end:(()=>void)|undefined,moveTimer:unknown,drawTimer:unknown,began=0,phase:FlightPhase='cruise';
 const tasks=new Map<number,{at:number;fn:()=>void}>(),starts:number[]=[],finishes:number[]=[],results:boolean[]=[];
 const later=(fn:()=>void,ms:number)=>{tasks.set(++id,{at:now+ms,fn});return id};const cancel=(key:unknown)=>tasks.delete(key as number);
 const stopCamera=()=>{cancel(moveTimer);cancel(drawTimer)};
 const draw=()=>{render?.();if(render)drawTimer=later(draw,100)};
 const stops=['bar','afterhours','soft-sunset','hiphop'].map(id=>events.find(e=>e.id===id)!);
 const tour=new EventTour(stops,{now:()=>now,later,cancel,highlight:()=>{},stop:()=>{active?.cancel();active=undefined},fly:(stop,intro,done)=>{
  assert.equal(active,undefined,'only one camera flight may be alive');began=now;starts.push(now);
  active=new SceneFlight({now:()=>now,later,cancel,stop:stopCamera,repaint:()=>{},prepareNext:()=>{},present:()=>{},subscribe:(r,e)=>{render=r;end=e;return()=>{render=undefined;end=undefined}},move:(p,ms)=>{phase=p;cancel(moveTimer);cancel(drawTimer);moveTimer=later(()=>end?.(),ms);drawTimer=later(draw,100)},sample:()=>({approachReady:stop.id!=='afterhours'&&now-began>=1500,finalReady:stop.id!=='afterhours'&&(phase==='descent'||phase==='reveal')&&now-began>=4100})},intro?3200:2800,false,result=>{active=undefined;finishes.push(now);results.push(result.ready);done()});active.start();
 }});
 tour.start();let guard=0;while(finishes.length<12){if(++guard>3000)throw Error('scheduler stuck');const next=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0];assert.ok(next);tasks.delete(next[0]);now=next[1].at;next[1].fn()}
 // Consume the immediate next-pass task: every handoff has zero configured stationary delay.
 const handoff=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(handoff?.[1].at===now){tasks.delete(handoff[0]);handoff[1].fn()}
 for(let i=1;i<starts.length;i++)assert.equal(starts[i]-finishes[i-1],0);
 assert.ok(results.includes(true)&&results.includes(false));assert.ok(starts.length>=12);tour.destroy();assert.equal(tasks.size,0);assert.equal(render,undefined);assert.equal(end,undefined);
});
