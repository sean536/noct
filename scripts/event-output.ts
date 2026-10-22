/** Private external job output: single writer and atomic replace, no partial snapshots. */
import {realpath,lstat,open,rename,unlink} from 'node:fs/promises';import {resolve,relative,dirname,basename,isAbsolute,sep} from 'node:path';import {randomUUID} from 'node:crypto';
export async function externalEventOutput(output:string,repositoryRoot:string){
 const destination=resolve(output),root=await realpath(repositoryRoot),parent=await realpath(dirname(destination)),physical=resolve(parent,basename(destination)),rel=relative(root,physical);
 if(rel===''||!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep))throw Error('Event snapshots must be written outside the public repository.');
 try{if((await lstat(physical)).isSymbolicLink())throw Error('Output must not be a symlink.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 return physical;
}
export async function withEventOutput(output:string,repositoryRoot:string,produce:()=>Promise<unknown>){
 const physical=await externalEventOutput(output,repositoryRoot),lock=physical+'.lock';
 let handle;try{handle=await open(lock,'wx',0o600);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw Error('Event job already running or interrupted: lock exists; inspect it before retrying.');throw error;}
 let temporary:string|undefined;
 try{
  await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})+'\n');
  const data=await produce();await externalEventOutput(physical,repositoryRoot);
  temporary=physical+'.'+randomUUID()+'.tmp';const file=await open(temporary,'wx',0o600);
  try{await file.writeFile(JSON.stringify(data,null,2)+'\n');await file.sync();}finally{await file.close();}
  await rename(temporary,physical);temporary=undefined;return data;
 }finally{if(temporary)await unlink(temporary).catch(()=>{});await handle.close();await unlink(lock);}
}
