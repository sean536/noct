/** Reproducible Node CPU benchmark on SYNTHETIC streets, never a browser/GPU/FPS measurement. */
import {performance} from 'node:perf_hooks';
import {TRAFFIC_ORIGIN,localPoint,footprints,trafficRoutes,vehicleAt,type TrafficFeature} from '../lib/traffic';
import {offsetMeters} from '../lib/camera-plan';
const point=(x:number,y:number)=>offsetMeters(offsetMeters(TRAFFIC_ORIGIN,x,90),-y,0);
const buildings:TrafficFeature[]=[],roads:TrafficFeature[]=[];
for(let x=-6;x<6;x++)for(let y=-6;y<6;y++){const ring=[point(x*80+25,y*80+25),point(x*80+55,y*80+25),point(x*80+55,y*80+55),point(x*80+25,y*80+55),point(x*80+25,y*80+25)];buildings.push({geometry:{type:'Polygon',coordinates:[ring]}})}
for(let i=-6;i<=6;i++){roads.push({properties:{class:'minor',oneway:0},geometry:{type:'LineString',coordinates:[point(-500,i*80),point(500,i*80)]}});roads.push({properties:{class:'secondary',oneway:1},geometry:{type:'LineString',coordinates:[point(i*80,-500),point(i*80,500)]}})}
const timings:number[]=[];let routes=trafficRoutes(roads,footprints(buildings,[0,0]),[0,0]);
for(let i=0;i<80;i++){const start=performance.now();routes=trafficRoutes(roads,footprints(buildings,[0,0]),[0,0]);timings.push(performance.now()-start)}
const update=[];let checksum=0;
for(const count of [0,10,24,48]){
 const samples:number[]=[];
 for(let batch=0;batch<20;batch++){const start=performance.now();for(let frame=0;frame<1000;frame++)for(let i=0;i<count;i++){const car=vehicleAt(routes[i%routes.length],frame/30+batch*30);checksum+=car.x+car.y}samples.push((performance.now()-start)/1000)}
 samples.sort((a,b)=>a-b);update.push({vehicles:count,meanUpdateMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95UpdateMs:samples[Math.floor(samples.length*.95)]});
}
timings.sort((a,b)=>a-b);
console.log(JSON.stringify({kind:'synthetic-node-cpu-only',node:process.version,fixture:{roads:roads.length,buildings:buildings.length,acceptedRoutes:routes.length,origin:localPoint(TRAFFIC_ORIGIN)},routeBuildMeanMs:timings.reduce((a,b)=>a+b,0)/timings.length,routeBuildP95Ms:timings[Math.floor(timings.length*.95)],update,geometryBufferBytes:72*7*4,maximumInstanceBufferBytes:48*8*4,checksum},null,2));
