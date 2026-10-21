import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lightingClock,lightingProfile,modeFromSearch,windowLevel,windowIdentity,lightRandom,WINDOW_LIGHTING,berlinHour} from '../lib/window-lighting';
import {CityLighting} from '../lib/city-lighting';
import type {Map as GLMap} from 'maplibre-gl';

test('night/day modes and Berlin time are explicit without changing imagery; auto is continuous at midnight',()=>{
 assert.equal(modeFromSearch('?lighting=night'),'night');assert.equal(modeFromSearch('?lighting=day'),'day');assert.equal(modeFromSearch('?lighting=invalid'),'auto');
 assert.equal(lightingProfile('day',22).night,0);assert.equal(lightingProfile('night',12).night,1);assert.ok(lightingProfile('evening',12).density>lightingProfile('night',12).density);
 assert.equal(berlinHour(Date.UTC(2026,9,21,20)),22);
 for(const field of ['night','density'] as const)assert.ok(Math.abs(lightingProfile('auto',23.999)[field]-lightingProfile('auto',.001)[field])<.001);
 assert.ok(lightingProfile('auto',12).night<.001);assert.ok(lightingProfile('auto',22).night>.99);
});
test('window patterns are stable, varied, mostly unchanged and slow over real clock time',()=>{
 const start=Date.UTC(2026,9,21,21);let lit=0,changed=0,stable=0,partial=0;const rows=new Set<string>();
 for(let building=0;building<30;building++)for(let y=0;y<8;y++){
  const row:number[]=[];
  for(let x=0;x<24;x++){
   const seed=building/31,id=windowIdentity(x,y,seed),a=windowLevel(x,y,seed,lightingClock(start),.34),b=windowLevel(x,y,seed,lightingClock(start+60000),.34);
   assert.equal(id,windowIdentity(x,y,seed));assert.equal(a,windowLevel(x,y,seed,lightingClock(start),.34));assert.ok(a>=0&&a<=1);if(a>.5)lit++;if(a===b)stable++;else changed++;
   const next=windowLevel(x,y,seed,lightingClock(start+100),.34);assert.ok(Math.abs(a-next)<.023,'No abrupt light jump in100ms');if(a>0&&a<1)partial++;row.push(a>.5?1:0);
  }rows.add(row.join(''));
 }
 const count=30*8*24;assert.ok(lit/count>.20&&lit/count<.48);assert.ok(stable/count>.82);assert.ok(changed/count>.005);assert.ok(partial>0);assert.ok(rows.size>180,'Repeated identical window rows');
});
test('split clock stays continuous over normal block boundaries and its long repeat wrap',()=>{
 for(const ms of [Date.UTC(2026,9,21),WINDOW_LIGHTING.block*WINDOW_LIGHTING.blocks*1000])for(let i=0;i<500;i++){
  const a=windowLevel(i%40,Math.floor(i/40),.613,lightingClock(ms-1),.34),b=windowLevel(i%40,Math.floor(i/40),.613,lightingClock(ms+1),.34);assert.ok(Math.abs(a-b)<.001);
 }
 assert.notEqual(lightRandom(11),lightRandom(12));
});
test('one central visible-only repaint timer is reused and cancelled for camera movement, hidden tabs, no geometry and disposal',()=>{
 let now=Date.UTC(2026,9,21,21),hidden=false,moving=false,hasBuildings=true,queries=0,repaints=0,id=0;const timers=new Map<number,{fn:()=>void;ms:number}>(),listeners=new Map<string,Function>();
 const map={on:(e:string,fn:Function)=>listeners.set(e,fn),off:(e:string)=>listeners.delete(e),triggerRepaint:()=>repaints++,isMoving:()=>moving,queryRenderedFeatures:()=>{queries++;return hasBuildings?[{}]:[]},hasImage:()=>false} as unknown as GLMap;
 const env={now:()=>now,hidden:()=>hidden,set:(fn:()=>void,ms:number)=>{timers.set(++id,{fn,ms});return id},clear:(handle:unknown)=>timers.delete(handle as number)};
 const lighting=new CityLighting(map,true,env);lighting.setMode('night');lighting.sample();for(let i=0;i<100;i++)lighting.schedule(true);assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,125);assert.equal(queries,1);
 lighting.schedule(false);assert.equal(timers.size,0);lighting.schedule(true);moving=true;listeners.get('movestart')!();assert.equal(timers.size,0);lighting.schedule(true);assert.equal(timers.size,0);moving=false;listeners.get('moveend')!();assert.ok(repaints>0);
 hidden=true;lighting.schedule(true);assert.equal(timers.size,0);hidden=false;lighting.schedule(true);assert.equal(timers.size,1);now+=1000;const a=lighting.sample().clock;now+=500;assert.notDeepEqual(lighting.sample().clock,a);
 hasBuildings=false;listeners.get('moveend')!();lighting.schedule(true);assert.equal(timers.size,0,'A nonempty covering tile with no screen building must not tick');assert.equal(lighting.stats().animated,false);hasBuildings=true;listeners.get('moveend')!();
 lighting.setMode('day');lighting.sample();lighting.schedule(true);assert.equal(timers.size,0);lighting.setMode('night');lighting.sample();lighting.schedule(true);lighting.dispose();assert.equal(timers.size,0);assert.equal(listeners.size,0);assert.equal(lighting.stats().animated,false);
});
