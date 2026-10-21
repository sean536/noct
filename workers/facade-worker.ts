import {buildFacadeTile,type CityTile} from '../lib/facade-tile';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(message:unknown,transfer:Transferable[])=>void};
scope.onmessage=event=>{
 const {id,bytes,tile}=event.data as {id:number;bytes:ArrayBuffer;tile:CityTile};
 try{const mesh=buildFacadeTile(bytes,tile);scope.postMessage({id,mesh},[mesh.vertices.buffer,mesh.indices.buffer]);}
 catch(error){scope.postMessage({id,error:error instanceof Error?error.message:String(error)},[]);}
};
