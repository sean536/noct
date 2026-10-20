import {test} from 'node:test';import assert from 'node:assert/strict';
import {TrafficLayer} from '../lib/traffic-layer';import {renderProfile} from '../lib/rendering';import {TRAFFIC_ORIGIN} from '../lib/traffic';import {offsetMeters} from '../lib/camera-plan';
import type {Map as GLMap,CustomRenderMethodInput} from 'maplibre-gl';

test('custom-layer adapter batches cars in one instanced draw and releases all GL resources/listeners',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false,addEventListener:()=>{},removeEventListener:()=>{}}});
 try{
  let id=0,draws=0,instances=0,deletedBuffers=0,deletedPrograms=0,deletedVAOs=0;let matrix:number[]=[];
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,DYNAMIC_DRAW:7,FLOAT:8,CULL_FACE:9,DEPTH_TEST:10,LEQUAL:11,BLEND:12,ONE:13,ONE_MINUS_SRC_ALPHA:14,TRIANGLES:15,
   getParameter:()=>null,createShader:()=>({id:++id}),shaderSource:()=>{},compileShader:()=>{},getShaderParameter:()=>true,deleteShader:()=>{},createProgram:()=>({id:++id}),attachShader:()=>{},linkProgram:()=>{},getProgramParameter:()=>true,deleteProgram:()=>{deletedPrograms++},getUniformLocation:()=>({}),createVertexArray:()=>({}),bindVertexArray:()=>{},createBuffer:()=>({id:++id}),bindBuffer:()=>{},bufferData:()=>{},bufferSubData:()=>{},enableVertexAttribArray:()=>{},vertexAttribPointer:()=>{},vertexAttribDivisor:()=>{},useProgram:()=>{},uniformMatrix4fv:(_loc:unknown,_transpose:boolean,value:Float32Array)=>{matrix=Array.from(value)},uniform1f:()=>{},disable:()=>{},enable:()=>{},depthFunc:()=>{},depthMask:()=>{},blendFunc:()=>{},drawArraysInstanced:(_mode:number,_first:number,vertices:number,count:number)=>{draws++;instances=count;assert.equal(vertices,72)},deleteVertexArray:()=>{deletedVAOs++},deleteBuffer:()=>{deletedBuffers++}
  } as unknown as WebGL2RenderingContext;
  const listeners=new Map<string,Set<unknown>>();let roadQueries=0;
  const ring=[offsetMeters(TRAFFIC_ORIGIN,70,0),offsetMeters(TRAFFIC_ORIGIN,80,0),offsetMeters(TRAFFIC_ORIGIN,80,10),offsetMeters(TRAFFIC_ORIGIN,70,10),offsetMeters(TRAFFIC_ORIGIN,70,0)];
  const map={on:(event:string,fn:unknown)=>{const set=listeners.get(event)??new Set();set.add(fn);listeners.set(event,set)},off:(event:string,fn:unknown)=>listeners.get(event)?.delete(fn),getCenter:()=>({lng:TRAFFIC_ORIGIN[0],lat:TRAFFIC_ORIGIN[1]}),getZoom:()=>16.6,isMoving:()=>true,triggerRepaint:()=>{},querySourceFeatures:(_source:string,options:{sourceLayer:string})=>{
   if(options.sourceLayer==='building')return [{geometry:{type:'Polygon',coordinates:[ring]}}];roadQueries++;
   return Array.from({length:6},(_,i)=>({properties:{class:'minor',oneway:1},geometry:{type:'LineString',coordinates:[offsetMeters(offsetMeters(TRAFFIC_ORIGIN,-i*12,0),-130,90),offsetMeters(offsetMeters(TRAFFIC_ORIGIN,-i*12,0),130,90)]}}));
  }} as unknown as GLMap;
  const profile=renderProfile({dpr:2,width:1280,height:800,cores:10,memory:16,coarse:false,saveData:false});
  const layer=new TrafficLayer(profile,()=>{});layer.onAdd(map,gl);t.mock.timers.tick(3000);assert.equal(roadQueries,1);
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];const options={defaultProjectionData:{mainMatrix:identity,projectionTransition:0}} as unknown as CustomRenderMethodInput;
  layer.render(gl,options);assert.equal(draws,1);assert.ok(instances>0&&instances<=48);assert.equal(layer.stats().simulation,true);assert.equal(layer.stats().instanceBytes,48*8*4);assert.equal(layer.stats().drawCalls,1);assert.ok(Math.abs(matrix[12]-(TRAFFIC_ORIGIN[0]+180)/360)<1e-7);
  layer.setActive(false);layer.render(gl,options);assert.equal(draws,1);
  layer.onRemove();assert.equal(deletedBuffers,2);assert.equal(deletedPrograms,1);assert.equal(deletedVAOs,1);assert.ok([...listeners.values()].every(set=>set.size===0));t.mock.timers.tick(60000);assert.equal(roadQueries,1);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document')}
});
