export type LightingMode='auto'|'day'|'evening'|'night';
export interface LightingProfile {night:number;density:number}
export const WINDOW_LIGHTING={block:512,blocks:4096,dynamicShare:.16,fade:7,periods:[64,128,256]} as const;
/** Integer arithmetic matches the WebGL2 shader; identities never depend on camera or frame. */
export function lightHash(value:number){let n=value>>>0;n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);return (n^(n>>>16))>>>0;}
export const lightRandom=(n:number)=>lightHash(n)/4294967296;
export function windowIdentity(x:number,y:number,seed:number){return (Math.imul(Math.floor(x),0x9e3779b1)^Math.imul(Math.floor(y),0x85ebca77)^Math.round(seed*1024))>>>0;}
function occupancyId(x:number,y:number,seed:number){const id=windowIdentity(x,y,seed),apartment=windowIdentity(Math.floor(x/3),y,seed);return lightRandom(apartment^0x215a)<.35?apartment:id;}
export function lightingClock(milliseconds:number):[number,number]{const seconds=milliseconds/1000,block=Math.floor(seconds/WINDOW_LIGHTING.block);return [((block%WINDOW_LIGHTING.blocks)+WINDOW_LIGHTING.blocks)%WINDOW_LIGHTING.blocks,seconds-block*WINDOW_LIGHTING.block];}
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function lightingProfile(mode:LightingMode,hour:number):LightingProfile{
 if(mode==='day')return {night:0,density:.04};if(mode==='night')return {night:1,density:.34};if(mode==='evening')return {night:.9,density:.44};
 const h=((hour%24)+24)%24,night=h<12?1-smooth(5.5,8,h):smooth(17,20.5,h);
 const busy=h<12?1-smooth(.5,3.5,h):smooth(16.5,20.5,h);return {night,density:.04+night*(.16+.22*busy)};
}
export function modeFromSearch(search:string):LightingMode{const m=new URLSearchParams(search).get('lighting');return m==='day'||m==='night'||m==='evening'?m:'auto';}
const berlinTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function berlinHour(ms:number){const parts=berlinTime.formatToParts(ms);return Number(parts.find(p=>p.type==='hour')!.value)+Number(parts.find(p=>p.type==='minute')!.value)/60;}
/** CPU reference for distribution/continuity tests; production evaluates each window on the GPU. */
export function windowLevel(x:number,y:number,seed:number,clock:[number,number],density:number){
 const id=occupancyId(x,y,seed),building=.82+lightRandom(Math.round(seed*1024)^0x398d)*.36,threshold=density*building;
 if(lightRandom(id^0x51ed)>=WINDOW_LIGHTING.dynamicShare)return smooth(lightRandom(id^0x31a7)-.012,lightRandom(id^0x31a7)+.012,threshold);
 const period=WINDOW_LIGHTING.periods[lightHash(id^0x8171)%3],count=WINDOW_LIGHTING.block/period,phase=lightRandom(id^0x191d)*period;
 const position=(clock[1]+phase)/period,cycle=((clock[0]*count+Math.floor(position))%(WINDOW_LIGHTING.blocks*count));
 const previous=(cycle-1+WINDOW_LIGHTING.blocks*count)%(WINDOW_LIGHTING.blocks*count);
 const before=lightRandom(id^lightHash(previous+0x719b))<threshold?1:0,after=lightRandom(id^lightHash(cycle+0x719b))<threshold?1:0;
 return before+(after-before)*smooth(0,WINDOW_LIGHTING.fade, (position-Math.floor(position))*period);
}
