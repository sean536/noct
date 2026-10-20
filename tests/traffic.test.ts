import {test} from 'node:test';import assert from 'node:assert/strict';
import {localPoint,roadClear,footprints,trafficRoutes,vehicleAt,TrafficBudget,TRAFFIC_ORIGIN,type TrafficFeature,type Footprint,type Point} from '../lib/traffic';
import {offsetMeters} from '../lib/camera-plan';
const rectangle:Footprint={rings:[[[-5,-5],[5,-5],[5,5],[-5,5],[-5,-5]]],bounds:[-5,-5,5,5]};
const road=(props:Record<string,unknown>={}):TrafficFeature=>({properties:{class:'minor',oneway:0,...props},geometry:{type:'LineString',coordinates:[offsetMeters(TRAFFIC_ORIGIN,-120,90),offsetMeters(TRAFFIC_ORIGIN,120,90)]}});
const distant:Footprint={rings:[[[0,35],[10,35],[10,45],[0,45],[0,35]]],bounds:[0,35,10,45]};
test('road safety rejects crossing, contained, collinear and near-wall paths; never joins roads',()=>{
 assert.equal(roadClear([[-30,0],[30,0]],[rectangle]),false);assert.equal(roadClear([[0,0],[1,1]],[rectangle]),false);assert.equal(roadClear([[-30,5],[30,5]],[rectangle]),false);assert.equal(roadClear([[-30,8],[30,8]],[rectangle]),false);assert.equal(roadClear([[-30,12],[30,12]],[rectangle]),true);
});
test('only ground-level drivable roads with valid direction and known footprints can spawn simulated cars',()=>{
 assert.equal(trafficRoutes([road()],[],[0,0]).length,0);
 for(const p of [{class:'path'},{class:'rail'},{brunnel:'tunnel'},{brunnel:'bridge'},{layer:1},{level:-1},{indoor:1},{ramp:1},{access:'private'},{service:'driveway'},{oneway:'unknown'}])assert.equal(trafficRoutes([road(p)],[distant],[0,0]).length,0,JSON.stringify(p));
 assert.equal(trafficRoutes([road(),road()],[distant],[0,0]).length,1);
 assert.equal(trafficRoutes([road()],[rectangle],[0,0]).length,0);
 const malformed=road();malformed.geometry.coordinates=[[NaN,52],[13,52]];assert.equal(trafficRoutes([malformed],[distant],[0,0]).length,0);
});
test('opposite one-way reverses geometry; speeds, lane offset and continuous time stay plausible',()=>{
 const route=trafficRoutes([road({oneway:-1})],[distant],[0,0])[0];assert.ok(route);assert.ok(route.speed>=4&&route.speed<9);
 const a=vehicleAt(route,10),b=vehicleAt(route,10.01);assert.ok(a.dx<-.99);assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.15);assert.ok(Math.abs(a.y)<=1.01);assert.ok(a.x>=-121&&a.x<=121);
 for(let t=0;t<500;t+=.5){const car=vehicleAt(route,t);assert.ok(Number.isFinite(car.x)&&Number.isFinite(car.y));assert.ok(car.alpha>=0&&car.alpha<=1);}
 const phase=-route.seed*route.length/route.speed;assert.ok(vehicleAt(route,phase).alpha<.01,'endpoint wrap must be invisible');
});
test('loaded building polygons project to the same local meters as street coordinates',()=>{
 const points:Point[]=[offsetMeters(TRAFFIC_ORIGIN,20,0),offsetMeters(TRAFFIC_ORIGIN,20,90),offsetMeters(TRAFFIC_ORIGIN,20,180),offsetMeters(TRAFFIC_ORIGIN,20,270),offsetMeters(TRAFFIC_ORIGIN,20,0)];
 const f:TrafficFeature={geometry:{type:'Polygon',coordinates:[points]}};const result=footprints([f],[0,0]);assert.equal(result.length,1);assert.ok(Math.abs(localPoint(TRAFFIC_ORIGIN)[0])<.001);assert.equal(roadClear([[-30,0],[30,0]],result),false);
 assert.deepEqual(footprints(Array(8001).fill(f),[0,0]),[],'over-budget footprint sets omit traffic, never silently omit collision geometry');
});
test('traffic budget reduces to zero on sustained overload and recovers in small steps',()=>{
 const budget=new TrafficBudget(24);for(let i=0;i<320;i++)budget.sample(i*80,80,.1);assert.equal(budget.limit,0);for(let i=321;i<520;i++)budget.sample(i*80,16,.1);assert.ok(budget.limit>0&&budget.limit<=24);const before=budget.limit;budget.reduce();assert.ok(budget.limit<before);
});
