import {test} from 'node:test';import assert from 'node:assert/strict';
import {Group,Box3,Vector3,BoxGeometry,BufferGeometry,BufferAttribute,Mesh,MeshStandardMaterial,Texture,DataTexture} from 'three';
import {validateScene,disposeScene} from '../prototypes/buildings/model';import {MOBILE_BUDGET} from '../prototypes/buildings/glb';
const scene=()=>{const group=new Group(),mesh:Mesh<BufferGeometry,MeshStandardMaterial>=new Mesh(new BoxGeometry(20,20,20),new MeshStandardMaterial({map:new DataTexture(new Uint8Array([255,255,255,255]),1,1)}));mesh.position.y=10;group.add(mesh);return {group,mesh};};
test('loaded model must remain in local metric coordinates and sit on the prepared flat ground',()=>{
 const {group,mesh}=scene();const report=validateScene(group,MOBILE_BUDGET);assert.ok(report&&report.triangles===12&&report.geometryBytes>0,'loaded geometry must be inspected');
 mesh.position.x=10000;assert.throws(()=>validateScene(group,MOBILE_BUDGET),/Meter/);mesh.position.x=0;mesh.position.y=100;assert.throws(()=>validateScene(group,MOBILE_BUDGET),/Boden/);disposeScene(group);
});
test('failed texture decoding cannot be reported as a successful textured import',()=>{
 const {group,mesh}=scene();mesh.material.map?.dispose();mesh.material.map=null;
 assert.throws(()=>validateScene(group,MOBILE_BUDGET),/Textur/);disposeScene(group);
});
test('distinct GPU texture objects sharing one image each count against the decoded budget',()=>{
 const {group,mesh}=scene(),texture=mesh.material.map!,second=texture.clone();
 mesh.material.dispose();mesh.material=new MeshStandardMaterial({map:texture,normalMap:second});
 assert.throws(()=>validateScene(group,{...MOBILE_BUDGET,textureBytes:8}),/Textur/);disposeScene(group);
});
test('separate GPU attributes sharing a CPU buffer still count as separate upload allocations',()=>{
 const {group,mesh}=scene();mesh.geometry.dispose();const positions=new Float32Array([0,0,0,1,0,0,0,1,0]),geometry=new BufferGeometry();
 geometry.setAttribute('position',new BufferAttribute(positions,3));geometry.setAttribute('normal',new BufferAttribute(positions,3));geometry.setAttribute('uv',new BufferAttribute(new Float32Array([0,0,1,0,0,1]),2));mesh.geometry=geometry;mesh.position.y=0;
 assert.throws(()=>validateScene(group,{...MOBILE_BUDGET,fileBytes:40}),/Geometrie/);disposeScene(group);
});
test('untrusted cached bounds cannot conceal geometry outside the event-area limit',()=>{
 const {group,mesh}=scene(),positions=mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++)positions.setX(i,positions.getX(i)+10000);
 mesh.geometry.boundingBox=new Box3(new Vector3(-10,-10,-10),new Vector3(10,10,10));
 assert.throws(()=>validateScene(group,MOBILE_BUDGET),/Meter/);disposeScene(group);
});
test('shared imported geometry, materials and image bitmaps are released exactly once per scene disposal',()=>{
 const {group,mesh}=scene();let textures=0,materials=0,geometries=0,images=0;
 const texture=new Texture();texture.source.data={close:()=>{images++}};texture.addEventListener('dispose',()=>{textures++});
 const material=mesh.material;material.map?.dispose();material.map=texture;material.addEventListener('dispose',()=>{materials++});mesh.geometry.addEventListener('dispose',()=>{geometries++});
 group.add(new Mesh(mesh.geometry,material));disposeScene(group);assert.deepEqual([textures,materials,geometries,images],[1,1,1,1]);
});
