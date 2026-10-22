import {readFile,writeFile,realpath,mkdir} from 'node:fs/promises';import {resolve,relative,dirname,basename,isAbsolute,sep} from 'node:path';
import {readEventSnapshot} from '../lib/events';import {eventSources} from '../lib/event-sources';import {refreshSources} from '../lib/event-ingestion';
async function main(){
 const [mode,input,output]=process.argv.slice(2);if(!['refresh','validate'].includes(mode)||!input||mode==='validate'&&!output)throw Error('Usage: refresh <external-output.json> | validate <reviewed-input.json> <external-output.json>');
 const destination=resolve(mode==='refresh'?input:output),root=await realpath(resolve(dirname(process.argv[1]),'..'));
 // Parent must already exist so symlinks cannot hide output inside the public checkout.
 const parent=await realpath(dirname(destination)),physical=resolve(parent,basename(destination));const rel=relative(root,physical);
 if(rel===''||!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep))throw Error('Event snapshots must be written outside the public repository.');
 // Also refuse a destination symlink (including a dangling one).
 const {lstat}=await import('node:fs/promises');try{if((await lstat(physical)).isSymbolicLink())throw Error('Output must not be a symlink.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 let data;
 if(mode==='refresh')data=await refreshSources(eventSources);
 else{const raw=JSON.parse(await readFile(input,'utf8'));const events=readEventSnapshot(raw,Date.now(),'owner-private');if(!Array.isArray(raw.events)||events.length!==raw.events.length)throw Error('Reviewed snapshot contains invalid, expired, stale, duplicate or conflicting events; no output written.');data={version:1,events,refresh:{mode:'manual-reviewed',dailyActive:false}};}
 await mkdir(parent,{recursive:true});await writeFile(physical,JSON.stringify(data,null,2)+'\n',{flag:'w'});console.log(JSON.stringify({output:physical,events:data.events.length,dailyActive:false}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
