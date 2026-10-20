export interface TourStop {id:string;coords:[number,number]}
export type PauseReason='manual'|'typing'|'ui'|'request'|'hidden'|'reduced'|'panel';
export const EVENT_INTERVAL_MS=0; // Yield one task between moving passes; no stationary dwell.
export interface TourDriver {fly:(stop:TourStop,intro:boolean,arrived:()=>void)=>void;stop:()=>void;highlight:(stop:TourStop|null)=>void;later:(fn:()=>void,ms:number)=>unknown;cancel:(timer:unknown)=>void;now:()=>number;}
/** One camera owner, continuous handoff after each moving reveal; no periodic flight timer. */
export class EventTour {
 private timer:unknown;private deadline=0;private version=0;private reasons=new Set<PauseReason>();private ready=false;private disposed=false;private started=false;private index=0;
 private pending:{stop:TourStop;allowUI:boolean}|null=null;private inFlight=false;private flightAllowsUI=false;
 constructor(private stops:TourStop[],private driver:TourDriver){}
 private stopClock(){if(this.timer!==undefined)this.driver.cancel(this.timer);this.timer=undefined;this.deadline=0;}
 private stopFlight(){this.version++;this.inFlight=false;this.flightAllowsUI=false;this.driver.stop();}
 private interrupt(){this.stopClock();this.stopFlight();}
 start(){if(this.disposed||this.ready)return;this.ready=true;this.run();}
 pause(reason:PauseReason){
  if(this.disposed)return;this.reasons.add(reason);this.stopClock();
  // A direct user selection may finish behind its newly opened detail dialog;
  // that permission never applies to automatic rotation or hidden documents.
  if(reason==='ui'&&this.flightAllowsUI)return;
  this.stopFlight();
 }
 release(reason:PauseReason){if(this.disposed||!this.reasons.delete(reason))return;this.run();}
 resume(){if(this.disposed)return;this.reasons.delete('manual');this.reasons.delete('request');this.reasons.delete('typing');this.pending=null;this.interrupt();this.run();}
 focus(stop:TourStop,options:{allowUI?:boolean}={}){if(this.disposed)return;this.reasons.add('request');this.interrupt();this.pending={stop,allowUI:!!options.allowUI};this.run();}
 needsRecovery(){return !this.disposed&&!this.inFlight&&!this.pending&&(this.reasons.has('manual')||this.reasons.has('request'))}
 nextStop(){return this.ready&&!this.disposed&&!this.reasons.size&&this.stops.length?this.stops[(this.index+1)%this.stops.length]:undefined;}
 private run(){
  if(this.disposed||!this.ready||this.inFlight||this.timer!==undefined)return;
  if(this.pending){const {stop,allowUI}=this.pending;if(this.reasons.has('typing')||this.reasons.has('hidden')||this.reasons.has('ui')&&!allowUI)return;this.pending=null;this.travel(stop,false,allowUI);return;}
  if(this.reasons.size||!this.stops.length)return;
  const intro=!this.started;this.started=true;
  this.travel(this.stops[this.index],intro,false,()=>this.arm(this.driver.now()+EVENT_INTERVAL_MS));
 }
 private arm(deadline:number){
  this.stopClock();if(this.disposed||this.reasons.size)return;this.deadline=deadline;
  this.timer=this.driver.later(()=>{
   this.timer=undefined;if(this.disposed||this.reasons.size)return;
   const now=this.driver.now();if(now<this.deadline){this.arm(this.deadline);return;}
   // One target after a delayed tick, never catch up or interrupt preparation.
   if(this.inFlight)return;
   this.index=(this.index+1)%this.stops.length;
   this.travel(this.stops[this.index],false,false,()=>this.arm(this.driver.now()+EVENT_INTERVAL_MS));
  },Math.max(0,deadline-this.driver.now()));
 }
 private travel(stop:TourStop,intro:boolean,allowUI=false,arrived?:()=>void){
  this.stopFlight();const token=this.version;this.inFlight=true;this.flightAllowsUI=allowUI;
  this.driver.highlight(stop);
  this.driver.fly(stop,intro,()=>{if(this.disposed||token!==this.version)return;this.inFlight=false;this.flightAllowsUI=false;arrived?.()});
 }
 destroy(){this.disposed=true;this.interrupt();this.driver.highlight(null);}
}
