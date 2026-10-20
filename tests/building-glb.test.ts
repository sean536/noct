import {test} from 'node:test';import assert from 'node:assert/strict';
import {inspectGlb,MOBILE_BUDGET} from '../prototypes/buildings/glb';

// Synthetic parser fixture, never shipped in public/ and never presented as Berlin geometry.
function glb(change:(json:Record<string,any>)=>void=()=>{}){
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 const json:Record<string,any>={asset:{version:'2.0'},buffers:[{byteLength:64+png.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:24},{buffer:0,byteOffset:64,byteLength:png.length}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5126,count:3,type:'VEC2'}],images:[{bufferView:2,mimeType:'image/png'}],textures:[{source:0}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}}}],meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:1},material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 change(json);const encoded=Buffer.from(JSON.stringify(json)),j=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(j);const bin=Buffer.alloc(Math.ceil((64+png.length)/4)*4);png.copy(bin,64);
 const out=Buffer.alloc(12+8+j.length+8+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(j.length,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);out.writeUInt32LE(bin.length,20+j.length);out.writeUInt32LE(0x004e4942,24+j.length);bin.copy(out,28+j.length);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
test('preflight reports embedded texture and geometry before allocating a renderer',()=>{const r=inspectGlb(glb(),MOBILE_BUDGET);assert.ok(r&&r.images===1&&r.triangles===1&&r.primitives===1&&r.textureBytes>0,'a textured local GLB must produce an asset report');});
test('external texture requests and unsupported compressed assets are rejected before loading',()=>{
 assert.throws(()=>inspectGlb(glb(j=>{j.images[0].uri='https://example.org/unlicensed.jpg'}),MOBILE_BUDGET),/extern/i);
 assert.throws(()=>inspectGlb(glb(j=>{j.extensionsUsed=['KHR_draco_mesh_compression']}),MOBILE_BUDGET),/Erweiterung/);
});
test('oversized or untextured geometry cannot silently exceed the mobile budget',()=>{
 assert.throws(()=>inspectGlb(glb(),{...MOBILE_BUDGET,fileBytes:20}),/Datei/);
 assert.throws(()=>inspectGlb(glb(),{...MOBILE_BUDGET,textureBytes:1}),/Textur/);
 assert.throws(()=>inspectGlb(glb(j=>{delete j.materials[0].pbrMetallicRoughness.baseColorTexture}),MOBILE_BUDGET),/Textur/);
 assert.throws(()=>inspectGlb(glb(j=>{j.meshes[0].primitives[0].attributes.POSITION=99}),MOBILE_BUDGET),/Geometrie/);
});
test('invalid shared child graphs are refused instead of creating unbounded traversal work',()=>{
 assert.throws(()=>inspectGlb(glb(j=>{j.nodes=[{children:[1,1]},{mesh:0}]}),MOBILE_BUDGET),/Modellbaum/);
});
test('undeclared expensive material extensions cannot bypass the static import budget',()=>{
 assert.throws(()=>inspectGlb(glb(j=>{j.materials[0].extensions={KHR_materials_transmission:{transmissionFactor:1}}}),MOBILE_BUDGET),/Erweiterung/);
});
test('floating-point index buffers are rejected before issuing an invalid WebGL draw',()=>{
 assert.throws(()=>inspectGlb(glb(j=>{j.meshes[0].primitives[0].indices=0}),MOBILE_BUDGET),/Index/);
});
test('multiple scenes require explicit preprocessing rather than leaking non-default scene assets',()=>{
 assert.throws(()=>inspectGlb(glb(j=>{j.scenes.push({nodes:[0]})}),MOBILE_BUDGET),/Szene/);
});
