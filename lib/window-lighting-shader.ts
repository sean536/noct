import {WINDOW_LIGHTING} from './window-lighting';
export const WINDOW_LIGHTING_SHADER=`
uniform vec2 u_windowClock;
uniform vec2 u_windowProfile;
uint lightHash(uint n){n^=n>>16u;n*=0x7feb352du;n^=n>>15u;n*=0x846ca68bu;return n^(n>>16u);}
float lightRandom(uint n){return float(lightHash(n))*(1./4294967296.);}
uint windowIdentity(vec2 cell,float seed){return uint(int(floor(cell.x)))*0x9e3779b1u ^ uint(int(floor(cell.y)))*0x85ebca77u ^ uint(round(seed*1024.));}
float windowLevel(vec2 cell,float seed){
 uint id=windowIdentity(cell,seed),apartment=windowIdentity(vec2(floor(cell.x/3.),cell.y),seed);
 if(lightRandom(apartment^0x215au)<.35)id=apartment;
 float threshold=u_windowProfile.y*(.82+lightRandom(uint(round(seed*1024.))^0x398du)*.36);
 if(lightRandom(id^0x51edu)>=${WINDOW_LIGHTING.dynamicShare}){float r=lightRandom(id^0x31a7u);return smoothstep(r-.012,r+.012,threshold);}
 uint choice=lightHash(id^0x8171u)%3u;
 float period=choice==0u?${WINDOW_LIGHTING.periods[0]}.:choice==1u?${WINDOW_LIGHTING.periods[1]}.:${WINDOW_LIGHTING.periods[2]}.;
 float count=${WINDOW_LIGHTING.block}./period,phase=lightRandom(id^0x191du)*period,position=(u_windowClock.y+phase)/period;
 float cycle=mod(u_windowClock.x*count+floor(position),${WINDOW_LIGHTING.blocks}.*count),previous=mod(cycle-1.+${WINDOW_LIGHTING.blocks}.*count,${WINDOW_LIGHTING.blocks}.*count);
 float before=step(lightRandom(id^lightHash(uint(previous)+0x719bu)),threshold),after=step(lightRandom(id^lightHash(uint(cycle)+0x719bu)),threshold);
 return mix(before,after,smoothstep(0.,${WINDOW_LIGHTING.fade}.,fract(position)*period));
}
`;
