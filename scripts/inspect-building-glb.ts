import {stat,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {inspectGlb,MOBILE_BUDGET,DESKTOP_BUDGET} from '../prototypes/buildings/glb';
async function main(){
 const path=process.argv[2];if(!path||path==='--help'){console.log('Usage: node --import tsx scripts/inspect-building-glb.ts model.glb [--desktop]\nChecks embedded resources and budgets. Does not verify a data licence or geographic placement.');return;}
 const budget=process.argv.includes('--desktop')?DESKTOP_BUDGET:MOBILE_BUDGET,info=await stat(path);if(info.size>budget.fileBytes)throw Error('Datei überschreitet das Gerätebudget.');
 const file=await readFile(path),bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),report=inspectGlb(bytes,budget);
 console.log(JSON.stringify({...report,sha256:createHash('sha256').update(file).digest('hex'),profile:process.argv.includes('--desktop')?'desktop':'mobile',rightsVerified:false,georeferenceVerified:false},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
