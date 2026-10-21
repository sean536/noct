import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFacadeTile,TILE_VERTEX_SIZE} from '../lib/facade-tile';
import {tileFor} from '../lib/tile-prefetch';
import {fromGeojsonVt} from '@maplibre/vt-pbf';
import {GeoJSONVT} from '@maplibre/geojson-vt';
const data=JSON.parse(readFileSync(new URL('./fixtures/berlin-weekend.json',import.meta.url),'utf8'));
function tileMesh(properties:Record<string,unknown>={},all=false){
 const features=(all?data.features:[data.features[1]]).map((f:GeoJSON.Feature,i:number)=>({...f,id:i+1,properties:{render_height:Number(f.properties?.height),render_min_height:0,...properties}}));
 const index=new GeoJSONVT({type:'FeatureCollection',features},{maxZoom:14,indexMaxZoom:14,tolerance:0,extent:4096,buffer:64});
 const tile=tileFor([13.4136,52.5236],14),raw=index.getTile(tile.z,tile.x,tile.y),bytes=fromGeojsonVt(raw?{building:raw}:{},{extent:4096,version:2});
 return buildFacadeTile(Uint8Array.from(bytes).buffer,tile);
}
function roofVertices(mesh:ReturnType<typeof tileMesh>){const result:number[][]=[];for(let i=0;i<mesh.vertices.length;i+=TILE_VERTEX_SIZE)if(mesh.vertices[i+5]>.5)result.push(Array.from(mesh.vertices.slice(i,i+TILE_VERTEX_SIZE)));return result;}
test('real Berlin roof surfaces have two independent metric axes instead of height as their second UV',()=>{
 const mesh=tileMesh(),roofs=roofVertices(mesh);assert.ok(roofs.length>0);
 assert.ok(new Set(roofs.map(v=>v[6])).size>3);assert.ok(new Set(roofs.map(v=>v[7])).size>3,'Roof V is still just the constant building height');
 for(const r of roofs)assert.ok(Math.abs(r[2]-Number(data.features[1].properties.height))<1e-5,'No invented roof pitch or height');
});
test('all real roofs have deterministic finite materials and the fixture is not one uniform roof style',()=>{
 const a=tileMesh({},true),b=tileMesh({},true),roofs=roofVertices(a);assert.deepEqual(a.vertices,b.vertices);assert.deepEqual(a.indices,b.indices);
 assert.ok(TILE_VERTEX_SIZE>=18,'Roof color/type and safe decorative anchor are absent');assert.ok(roofs.every(r=>r.every(Number.isFinite)));
 assert.ok(new Set(roofs.map(r=>r[13])).size>=3,'Material variants are missing across real buildings');
 assert.ok(roofs.every(r=>r.slice(10,13).every(c=>c>=0&&c<=1)));assert.ok(roofs.every(r=>r[16]>=0&&r[16]<=6));
});
test('optional source roof attributes override fallback; pitched tags do not invent a sloped plane or flat roof terrace',()=>{
 const roofs=roofVertices(tileMesh({'roof:material':'roof_tiles','roof:colour':'#c4412e','roof:shape':'gabled'}));assert.ok(roofs.length>0);
 for(const r of roofs){assert.equal(r[13],4);assert.ok(Math.abs(r[10]-Math.pow(196/255,2.2))<1e-6);assert.ok(Math.abs(r[11]-Math.pow(65/255,2.2))<1e-6);assert.ok(Number.isFinite(r[9]));assert.equal(r[17],0);assert.ok(Math.abs(r[2]-Number(data.features[1].properties.height))<1e-5);}
 const safe=roofVertices(tileMesh({'roof:colour':'url(bad)','roof:material':'unrecognised','roof:shape':'flat'}));assert.ok(safe.every(r=>r.every(Number.isFinite)));
});

test('roof microdetail is deterministically placed inside a safe incircle and does not increase triangle count',()=>{
 const mesh=tileMesh({},true),roofs=roofVertices(mesh);let accented=0;
 for(const r of roofs){if(r[17]>.5){accented++;assert.ok(r[16]>=1.25);assert.ok(r[17]>=1&&r[17]<=4);}if(r[17]===4)assert.ok(r[16]>=3);}
 const groups=new Map<string,{center:[number,number];radius:number;triangles:number[][][]}>();
 for(let i=0;i<mesh.indices.length;i+=3){
  const tri=Array.from(mesh.indices.slice(i,i+3),index=>Array.from(mesh.vertices.slice(index*TILE_VERTEX_SIZE,(index+1)*TILE_VERTEX_SIZE)));
  if(tri.some(v=>v[5]<.5)||tri[0][17]<.5)continue;const r=tri[0],key=[r[14],r[15],r[16],r[2]].join('/');
  const group=groups.get(key)??{center:[r[14],r[15]] as [number,number],radius:r[16],triangles:[]};group.triangles.push(tri.map(v=>[v[6],v[7]]));groups.set(key,group);
 }
 const cross=(a:number[],b:number[],p:number[])=> (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 const inside=(p:number[],tri:number[][])=>{const signs=tri.map((a,i)=>cross(a,tri[(i+1)%3],p));return signs.every(v=>v>=-.01)||signs.every(v=>v<=.01);};
 for(const g of groups.values())for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,point=[g.center[0]+g.radius*Math.cos(angle),g.center[1]+g.radius*Math.sin(angle)];
  assert.ok(g.triangles.some(tri=>inside(point,tri)),'Safe accent perimeter must lie on triangulated real roof, outside courtyard holes');
 }
 assert.ok(accented>0,'No safely placed accents in real fixture');
 const tagged=tileMesh({'roof:shape':'gabled'},true);assert.deepEqual(tagged.indices,mesh.indices);assert.ok(roofVertices(tagged).every(r=>r[17]===0),'No flat roof equipment on a tagged pitched roof');
});
