/** Higher staging and a moving reveal; no off-screen GPU-preload API is assumed. */
export interface SceneSample {approachReady:boolean;finalReady:boolean}
export type FlightPhase='cruise'|'holding'|'descent'|'reveal';
export const MAX_HOLD_MS=2200;
export const DESCENT_MS=1800;
export const REVEAL_MS=2000;
export const READY_STABLE_MS=100;
export interface SceneFlightDriver {
 move:(phase:FlightPhase,duration:number)=>void;
 sample:()=>SceneSample;
 subscribe:(render:()=>void,moveEnd:()=>void)=>()=>void;
 repaint:()=>void;stop:()=>void;now:()=>number;
 later:(fn:()=>void,ms:number)=>unknown;cancel:(timer:unknown)=>void;
 prepareNext:()=>void;present:(ready:boolean)=>void;
}
export class RenderReadiness {
 private since:number|undefined;private frames=0;
 check(ready:boolean,now:number){
  if(!ready){this.since=undefined;this.frames=0;return false;}
  this.since??=now;this.frames++;
  return this.frames>=2&&now-this.since>=READY_STABLE_MS;
 }
}
export class SceneFlight {
 private phase:FlightPhase='cruise';private finished=false;private approach=false;private final=false;private descended=false;private presented=false;
 private approachGate=new RenderReadiness();private finalGate=new RenderReadiness();
 private timer:unknown;private confirmation:unknown;private unsubscribe:(()=>void)|undefined;
 private began=0;private lastProbe=-Infinity;
 constructor(private driver:SceneFlightDriver,private duration:number,private reduced:boolean,private done:(result:{ready:boolean;descended:boolean;elapsed:number})=>void){}
 start(){
  this.began=this.driver.now();this.unsubscribe=this.driver.subscribe(()=>this.render(),()=>this.moveEnd());
  this.timer=this.driver.later(()=>this.finish(false),this.reduced?1200:this.duration+MAX_HOLD_MS+DESCENT_MS+REVEAL_MS+300);
  if(this.reduced){this.phase='descent';this.descended=true;this.driver.move('descent',0)}
  else this.driver.move('cruise',this.duration);
  this.driver.repaint();
 }
 private render(){
  if(this.finished)return;const now=this.driver.now();if(now-this.lastProbe<READY_STABLE_MS)return;this.lastProbe=now;
  const sample=this.driver.sample();this.approach=this.approachGate.check(sample.approachReady,now);this.final=this.finalGate.check(sample.finalReady,now);
  if(this.phase==='holding'&&this.approach)this.descend();
  if(this.final&&(this.phase==='descent'||this.phase==='reveal')){
   this.present(true);if(this.reduced)this.finish(true);
  }else if(this.reduced&&sample.finalReady)this.confirm();
 }
 private moveEnd(){
  if(this.finished)return;
  if(this.phase==='cruise'){
   if(this.approach)this.descend();else{this.phase='holding';this.driver.move('holding',MAX_HOLD_MS)}
  }else if(this.phase==='holding'){
   // Never drop into an unprepared close-up: fallback is a higher, moving pass.
   if(this.approach)this.descend();else this.reveal();
  }else if(this.phase==='descent'){
   if(this.reduced){this.confirm();return;}
   this.reveal();
  }else if(this.phase==='reveal')this.finish(this.final);
 }
 private descend(){this.phase='descent';this.descended=true;this.driver.prepareNext();this.driver.move('descent',DESCENT_MS)}
 private reveal(){this.phase='reveal';this.present(this.final);if(!this.descended)this.driver.prepareNext();this.driver.move('reveal',REVEAL_MS)}
 private present(ready:boolean){if(this.presented)return;this.presented=true;this.driver.present(ready)}
 private confirm(){
  this.driver.repaint();if(this.confirmation!==undefined)this.driver.cancel(this.confirmation);
  this.confirmation=this.driver.later(()=>{this.confirmation=undefined;if(!this.finished)this.driver.repaint()},READY_STABLE_MS+1);
 }
 private cleanup(){this.unsubscribe?.();this.unsubscribe=undefined;if(this.timer!==undefined)this.driver.cancel(this.timer);if(this.confirmation!==undefined)this.driver.cancel(this.confirmation);this.timer=undefined;this.confirmation=undefined}
 private finish(ready:boolean){if(this.finished)return;this.finished=true;this.cleanup();this.driver.stop();this.present(ready);this.done({ready,descended:this.descended,elapsed:this.driver.now()-this.began})}
 cancel(){if(this.finished)return;this.finished=true;this.cleanup();this.driver.stop()}
}
