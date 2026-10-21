import type {Map as GLMap} from 'maplibre-gl';
import {lightingClock,lightingProfile,berlinHour,modeFromSearch,type LightingMode,type LightingProfile} from './window-lighting';
interface Runtime {now:()=>number;set:(fn:()=>void,ms:number)=>unknown;clear:(handle:unknown)=>void;hidden:()=>boolean}
const runtime:Runtime={now:()=>Date.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:h=>clearTimeout(h as ReturnType<typeof setTimeout>),hidden:()=>typeof document!=='undefined'&&document.hidden};
/** One clock and at most one repaint timer for the whole city; never per building/window. */
export class CityLighting {
 private mode:LightingMode='auto';private timer:unknown;private disposed=false;private frozen:number|undefined;private media?:MediaQueryList;
 private visibilityDirty=true;private renderedBuildings=false;
 private profile:LightingProfile={night:0,density:0};private minute=-1;private visible=false;private clock:[number,number]=[0,0];
 constructor(private map:GLMap,private mobile:boolean,private env:Runtime=runtime){
  this.map.on('moveend',this.wake);this.map.on('movestart',this.cancelMovement);this.map.on('sourcedata',this.data);
  if(typeof window!=='undefined'){this.mode=modeFromSearch(window.location.search);this.media=window.matchMedia('(prefers-reduced-motion: reduce)');if(this.media.matches)this.frozen=env.now();this.media.addEventListener('change',this.motion);document.addEventListener('visibilitychange',this.visibility);}
 }
 private data=(event:{sourceId?:string})=>{if(event.sourceId==='buildings')this.visibilityDirty=true;};
 private wake=()=>{this.visibilityDirty=true;this.cancel();this.map.triggerRepaint();};
 private cancelMovement=()=>{this.visibilityDirty=true;this.cancel();};
 private cancel(){if(this.timer!==undefined){this.env.clear(this.timer);this.timer=undefined;}}
 private visibility=()=>{this.cancel();if(!this.env.hidden())this.map.triggerRepaint();};
 private motion=()=>{this.cancel();this.frozen=this.media?.matches?this.env.now():undefined;this.map.triggerRepaint();};
 setMode(mode:LightingMode){this.mode=mode;this.minute=-1;this.cancel();this.map.triggerRepaint();}
 sample(){
  const now=this.env.now(),minute=Math.floor(now/60000);if(minute!==this.minute){this.minute=minute;this.profile=lightingProfile(this.mode,berlinHour(now));}
  this.clock=lightingClock(this.frozen??now);return {clock:this.clock,profile:this.profile};
 }
 schedule(visible:boolean){
  this.visible=visible;this.cancel();if(this.disposed||!visible||this.env.hidden())return;
  const dynamic=this.profile.night>.01&&this.frozen===undefined;
  // Existing camera frames already carry the clock; do not compete with camera animation.
  if(this.map.isMoving())return;
  // One native screen-geometry query per settled view/data change; never per window or every frame.
  if(this.visibilityDirty){this.visibilityDirty=false;try{this.renderedBuildings=this.map.queryRenderedFeatures({layers:['real-buildings']}).length>0;}catch{this.renderedBuildings=false;}}
  this.visible=this.renderedBuildings;if(!this.visible)return;
  if(!dynamic&&this.mode!=='auto')return;
  this.timer=this.env.set(()=>{this.timer=undefined;if(!this.disposed&&!this.env.hidden())this.map.triggerRepaint();},dynamic?(this.mobile?125:83):60000);
 }
 stats(){return {mode:this.mode,night:this.profile.night,density:this.profile.density,clock:this.clock,animated:!this.disposed&&this.visible&&this.profile.night>.01&&this.frozen===undefined&&!this.env.hidden(),scheduled:this.timer!==undefined,reducedMotion:this.frozen!==undefined};}
 dispose(){if(this.disposed)return;this.disposed=true;this.cancel();this.map.off('moveend',this.wake);this.map.off('movestart',this.cancelMovement);this.map.off('sourcedata',this.data);this.media?.removeEventListener('change',this.motion);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.visibility);}
}
