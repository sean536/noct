export interface DeviceBudget {dpr:number;width:number;height:number;cores:number;memory?:number;coarse:boolean;saveData:boolean}
export interface RenderProfile {tier:'economy'|'balanced'|'quality';pixelRatio:number;antialias:boolean;cacheTiles:number;progressive:boolean;prefetch:boolean;pitch:number;lodLevels:number;lodRatio:number}
export function renderProfile(d:DeviceBudget):RenderProfile{
 const low=d.saveData||d.cores<=4||(d.memory!==undefined&&d.memory<=4);
 const high=!low&&d.cores>=8&&((d.memory??0)>=8||!d.coarse);
 const cap=low?1.5:high?2.5:2,pixels=low?2200000:high?6000000:3600000;
 const pixelRatio=Math.max(1,Math.min(d.dpr||1,cap,Math.sqrt(pixels/Math.max(1,d.width*d.height))));
 return {tier:low?'economy':high?'quality':'balanced',pixelRatio,antialias:!low,cacheTiles:low?48:high?160:96,progressive:!low,prefetch:!low&&!d.saveData,pitch:low?48:high?58:54,lodLevels:high?4:3,lodRatio:low?2:3};
}
export const INTRO_DURATION_MS=2200;
export function distanceKm(a:[number,number],b:[number,number]){const rad=Math.PI/180;const x=(b[0]-a[0])*rad*Math.cos((a[1]+b[1])*rad/2),y=(b[1]-a[1])*rad;return Math.hypot(x,y)*6371;}
export function cameraDuration(a:[number,number],b:[number,number],intro=false){return intro?INTRO_DURATION_MS:Math.round(Math.max(650,Math.min(1250,620+distanceKm(a,b)*140)));}
export const cameraEase=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
/** Samples render-event spacing while moving; this is not a GPU/FPS benchmark. */
export class FrameBudget {
 private previous:number|undefined;private samples:number[]=[];private adjusted=-Infinity;private ratio:number;
 constructor(private ceiling:number){this.ratio=ceiling}
 sample(now:number,moving:boolean):{pixelRatio:number;p75:number}|undefined{
  if(!moving){this.previous=undefined;this.samples=[];return;}
  const previous=this.previous;this.previous=now;if(previous===undefined)return;
  const dt=now-previous;if(dt<=0||dt>250)return;this.samples.push(dt);if(this.samples.length<24)return;
  const sorted=this.samples.slice().sort((a,b)=>a-b),p75=sorted[Math.floor(sorted.length*.75)];this.samples=[];
  if(now-this.adjusted<8000)return;
  const next=p75>28?Math.max(1,this.ratio-.25):p75<18?Math.min(this.ceiling,this.ratio+.1):this.ratio;
  if(Math.abs(next-this.ratio)<.01)return;this.ratio=next;this.adjusted=now;return {pixelRatio:next,p75};
 }
}
