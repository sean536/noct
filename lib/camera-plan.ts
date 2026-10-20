import type {FlightPhase} from './scene-flight';
export const FINAL_ZOOM=16.6;
export function offsetMeters(point:[number,number],meters:number,bearing:number):[number,number]{const angle=bearing*Math.PI/180;return [point[0]+Math.sin(angle)*meters/(111320*Math.cos(point[1]*Math.PI/180)),point[1]+Math.cos(angle)*meters/111320]}
export function arrivalBearing(a:[number,number],b:[number,number]){return Math.atan2((b[0]-a[0])*Math.cos(b[1]*Math.PI/180),b[1]-a[1])*180/Math.PI}
/** Altitude is represented through MapLibre's supported camera zoom/pitch. */
export function cameraPlan(target:[number,number],bearing:number,pitch:number,phase:FlightPhase,descended:boolean){
 const high=Math.max(40,pitch-8);
 if(phase==='cruise')return {center:offsetMeters(target,-180,bearing),zoom:15.35,pitch:high,bearing:bearing-8};
 if(phase==='holding')return {center:offsetMeters(target,-110,bearing+4),zoom:15.55,pitch:high,bearing:bearing+2};
 if(phase==='descent')return {center:offsetMeters(target,-45,bearing+8),zoom:FINAL_ZOOM,pitch,bearing:bearing+8};
 return {center:offsetMeters(target,55,bearing+14),zoom:descended?FINAL_ZOOM:15.55,pitch:descended?pitch:high,bearing:bearing+14};
}
export function targetRegion(target:[number,number],radius=110){return [target,...[0,45,90,135,180,225,270,315].map(b=>offsetMeters(target,radius,b))]}
