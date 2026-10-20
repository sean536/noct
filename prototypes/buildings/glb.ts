export type AssetBudget={fileBytes:number; textureBytes:number; textureSide:number; triangles:number; primitives:number};
export type GlbReport={triangles:number; primitives:number; images:number; textureBytes:number; fileBytes:number};
export const MOBILE_BUDGET:AssetBudget={fileBytes:12*1024*1024,textureBytes:32*1024*1024,textureSide:2048,triangles:160000,primitives:64};
export const DESKTOP_BUDGET:AssetBudget={fileBytes:24*1024*1024,textureBytes:64*1024*1024,textureSide:4096,triangles:300000,primitives:128};
type View={buffer:number;byteOffset?:number;byteLength:number;byteStride?:number};
type Accessor={bufferView?:number;byteOffset?:number;componentType:number;count:number;type:string;sparse?:unknown};
type Primitive={mode?:number;attributes:Record<string,number>;indices?:number;material?:number;targets?:unknown};
type Gltf={asset:{version:string};buffers:{byteLength:number;uri?:string}[];bufferViews:View[];accessors:Accessor[];images:{uri?:string;bufferView:number;mimeType:string}[];textures:{source:number}[];materials:{pbrMetallicRoughness?:{baseColorTexture?:{index:number}}}[];meshes:{primitives:Primitive[]}[];nodes:{mesh?:number;children?:number[]}[];scenes?:{nodes?:number[]}[];scene?:number;extensionsUsed?:string[];animations?:unknown[];skins?:unknown[]};
const integer=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
function imageSize(bytes:Uint8Array,mime:string):[number,number]{
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/png'&&bytes.length>=24&&v.getUint32(0)===0x89504e47&&v.getUint32(4)===0x0d0a1a0a&&v.getUint32(12)===0x49484452)return [v.getUint32(16),v.getUint32(20)];
 if(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216){
  let p=2;while(p+4<=bytes.length){if(bytes[p++]!==255)break;const marker=bytes[p++];if(marker===255){p--;continue;}const size=v.getUint16(p);if(size<2||p+size>bytes.length)break;
   if([192,193,194].includes(marker)&&size>=7)return [v.getUint16(p+5),v.getUint16(p+3)];p+=size;
  }
 }
 throw Error('Texturformat nicht lesbar; eingebettete PNG/JPEG-Dateien nötig.');
}
/** Strict static, uncompressed subset. Rejects external resources before GLTFLoader can fetch them. */
export function inspectGlb(data:ArrayBuffer,budget:AssetBudget):GlbReport {
 if(data.byteLength>budget.fileBytes)throw Error('Datei überschreitet das Gerätebudget.');
 if(data.byteLength<28)throw Error('Ungültige GLB-Datei.');
 const v=new DataView(data);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==data.byteLength)throw Error('GLB 2.0 mit korrekter Dateilänge erforderlich.');
 const jsonLength=v.getUint32(12,true),binHeader=20+jsonLength;
 if(jsonLength>1024*1024||jsonLength%4||v.getUint32(16,true)!==0x4e4f534a||binHeader+8>data.byteLength)throw Error('GLB-JSON ungültig oder zu groß.');
 const binLength=v.getUint32(binHeader,true),binStart=binHeader+8;
 if(v.getUint32(binHeader+4,true)!==0x004e4942||binStart+binLength!==data.byteLength)throw Error('Eine eingebettete BIN-Sektion ist nötig.');
 const j=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,jsonLength))) as Gltf;
 if(j.asset?.version!=='2.0'||!Array.isArray(j.buffers)||j.buffers.length!==1||j.buffers.some(b=>b.uri!==undefined))throw Error('Externe Buffer sind nicht erlaubt.');
 if(!integer(j.buffers[0].byteLength)||j.buffers[0].byteLength>binLength)throw Error('Bufferlänge ungültig.');
 const supported=new Set(['KHR_materials_unlit','KHR_texture_transform']);
 if((j.extensionsUsed??[]).some(e=>!supported.has(e)))throw Error('Erweiterung nicht unterstützt; vorab in unkomprimiertes GLB konvertieren.');
 const objects:unknown[]=[j];let inspected=0;
 while(objects.length){const value=objects.pop();if(++inspected>30000)throw Error('GLB-Struktur ist zu komplex.');if(!value||typeof value!=='object')continue;
  const object=value as Record<string,unknown>;
  if(object.extensions&&typeof object.extensions==='object'&&Object.keys(object.extensions).some(e=>!supported.has(e)))throw Error('Erweiterung im Modell nicht unterstützt.');
  objects.push(...Object.values(object).filter(v=>v!==null&&typeof v==='object'));
 }
 if(j.animations?.length||j.skins?.length)throw Error('Nur statische Stadtgeometrie wird unterstützt.');
 if(j.scenes?.length!==1||(j.scene??0)!==0)throw Error('Genau eine GLB-Szene wird im Prototyp unterstützt.');
 for(const key of ['bufferViews','accessors','images','textures','materials','meshes','nodes'] as const)if(!Array.isArray(j[key]))throw Error('GLB-Struktur unvollständig: '+key);
 if(j.accessors.length>256||j.bufferViews.length>256||j.images.length>32||j.materials.length>budget.primitives||j.meshes.length>budget.primitives)throw Error('Zu viele Geometrie- oder Texturobjekte.');
 if(!j.nodes.length||j.nodes.length>128)throw Error('Zu viele oder keine Modellknoten.');
 for(const b of j.bufferViews){const offset=b.byteOffset??0;if(b.buffer!==0||!integer(offset)||!integer(b.byteLength)||offset+b.byteLength>j.buffers[0].byteLength)throw Error('Geometrie-/Texturbereich außerhalb des Buffers.');}
 const components:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},sizes:Record<number,number>={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 for(const a of j.accessors){
  const b=j.bufferViews[a.bufferView??-1],offset=a.byteOffset??0,element=components[a.type]*sizes[a.componentType];
  if(a.sparse||!b||!integer(a.count)||a.count>budget.triangles*3||!element||!integer(offset))throw Error('Geometrie-Accessor ungültig oder zu groß.');
  const stride=b.byteStride??element;if(!integer(stride)||stride<element||offset+Math.max(0,a.count-1)*stride+element>b.byteLength)throw Error('Geometrie-Accessor überschreitet den Buffer.');
 }
 let textureBytes=0;
 for(const image of j.images){
  if(image.uri!==undefined)throw Error('Externe Texturen sind nicht erlaubt.');const b=j.bufferViews[image.bufferView];if(!b)throw Error('Textur-Buffer fehlt.');
  const [w,h]=imageSize(new Uint8Array(data,binStart+(b.byteOffset??0),b.byteLength),image.mimeType);
  if(!w||!h||w>budget.textureSide||h>budget.textureSide)throw Error('Texturauflösung überschreitet das Gerätebudget.');
  textureBytes+=Math.ceil(w*h*4*4/3); // RGBA plus mipmaps; estimate, not total measured GPU memory.
 }
 if(textureBytes>budget.textureBytes)throw Error('Texturspeicher überschreitet das Gerätebudget.');
 const meshCounts=j.meshes.map(mesh=>{let triangles=0;for(const p of mesh.primitives){
  const position=j.accessors[p.attributes.POSITION],uv=j.accessors[p.attributes.TEXCOORD_0],indices=p.indices===undefined?position:j.accessors[p.indices];
  if((p.mode??4)!==4||p.targets||!position||position.type!=='VEC3'||!indices||indices.count%3)throw Error('Geometrie muss aus gültigen statischen Dreiecken bestehen.');
  if(p.indices!==undefined&&(indices.type!=='SCALAR'||![5121,5123,5125].includes(indices.componentType)))throw Error('Index-Buffer muss ganzzahlige skalare Werte enthalten.');
  const texture=j.materials[p.material??-1]?.pbrMetallicRoughness?.baseColorTexture,source=texture&&j.textures[texture.index]?.source;
  if(!uv||uv.count!==position.count||source===undefined||!j.images[source])throw Error('Texturierte Materialien und UV-Koordinaten sind erforderlich.');
  triangles+=indices.count/3;
 }return {triangles,primitives:mesh.primitives.length};});
 let triangles=0,primitives=0;for(const n of j.nodes){if(n.mesh!==undefined){const count=meshCounts[n.mesh];if(!count)throw Error('Geometrie-Knoten ungültig.');triangles+=count.triangles;primitives+=count.primitives;}}
 const parents=new Set<number>();for(const n of j.nodes)for(const child of n.children??[]){if(parents.has(child))throw Error('Mehrfach verknüpfter Modellbaum.');parents.add(child);}
 const visited=new Set<number>(),path=new Set<number>();
 const visit=(index:number)=>{if(!integer(index)||!j.nodes[index]||path.has(index))throw Error('Zyklischer oder ungültiger Modellbaum.');if(visited.has(index))return;path.add(index);for(const child of j.nodes[index].children??[])visit(child);path.delete(index);visited.add(index);};
 j.nodes.forEach((_,i)=>visit(i));
 if(!triangles||triangles>budget.triangles||primitives>budget.primitives)throw Error('Geometrie überschreitet das Gerätebudget.');
 return {triangles,primitives,images:j.images.length,textureBytes,fileBytes:data.byteLength};
}
