import {Matrix4,Box3,Mesh,Texture,InterleavedBufferAttribute,type Object3D,type BufferGeometry,type Material} from 'three';import type {BuildingManifest} from './contract';
import type {AssetBudget} from './glb';
import {MercatorCoordinate} from 'maplibre-gl';
/** Input is glTF right-handed east/up/south in meters, ground already removed. */
export function modelMatrix(manifest:BuildingManifest):Matrix4{
 const g=manifest.georeference,origin=MercatorCoordinate.fromLngLat([g.longitude,g.latitude],0),s=origin.meterInMercatorCoordinateUnits();
 return new Matrix4().set(s,0,0,origin.x,0,0,s,origin.y,0,s,0,origin.z,0,0,0,1);
}
export function validateScene(scene:Object3D,budget:AssetBudget):{triangles:number;geometryBytes:number;textureBytes:number}{
 const checked=new Set<BufferGeometry>();scene.traverse(o=>{if(o instanceof Mesh&&!checked.has(o.geometry)){checked.add(o.geometry);o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();}});
 scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(scene);
 if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)||Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z))>250||bounds.max.y>200)throw Error('Modell muss im lokalen Meter-Rahmen eines kleinen Gebiets liegen.');
 if(Math.abs(bounds.min.y)>3)throw Error('Boden des Modells ist nicht auf den flachen Kartenboden vorbereitet.');
 let triangles=0,primitives=0,geometryBytes=0,textureBytes=0;const buffers=new Set<object>(),textures=new Set<Texture>();
 scene.traverse(o=>{if(!(o instanceof Mesh))return;const geometry=o.geometry as BufferGeometry,position=geometry.getAttribute('position');if(!position)throw Error('Positionen fehlen.');triangles+=(geometry.index?.count??position.count)/3;primitives+=Math.max(1,geometry.groups.length);
  for(const a of [...Object.values(geometry.attributes),...(geometry.index?[geometry.index]:[])]){const buffer=a instanceof InterleavedBufferAttribute?a.data:a;if(!buffers.has(buffer)){buffers.add(buffer);geometryBytes+=buffer.array.byteLength;}}
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!((material as Material&{map?:Texture}).map instanceof Texture))throw Error('Textur konnte nicht dekodiert werden oder fehlt.');
   for(const value of Object.values(material))if(value instanceof Texture)textures.add(value);
  }
 });
 for(const texture of textures){const image=texture.source.data as {width?:number;height?:number;complete?:boolean}|null;
  const w=image?.width??0,h=image?.height??0;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||w>budget.textureSide||h>budget.textureSide||image?.complete===false)throw Error('Dekodierte Textur fehlt oder überschreitet das Gerätebudget.');
  textureBytes+=Math.ceil(w*h*4*4/3);
 }
 if(textureBytes>budget.textureBytes)throw Error('Dekodierter Texturspeicher überschreitet das Gerätebudget.');
 if(!triangles||triangles>budget.triangles||primitives>budget.primitives||geometryBytes>budget.fileBytes*2)throw Error('Geladene Geometrie überschreitet das Gerätebudget.');
 return {triangles,geometryBytes,textureBytes};
}
export function disposeScene(scene:Object3D):void{
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>(),images=new Set<{close?:()=>void}>();
 scene.traverse(o=>{if(!(o instanceof Mesh))return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof Texture)textures.add(value);}});
 for(const texture of textures){if(texture.source.data&&typeof texture.source.data==='object')images.add(texture.source.data);texture.dispose();}
 for(const image of images)image.close?.();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();
}
