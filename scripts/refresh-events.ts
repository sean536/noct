import {readFile,realpath} from 'node:fs/promises';import {resolve,dirname} from 'node:path';
import {readEventSnapshot} from '../lib/events';import {eventSources} from '../lib/event-sources';import {refreshSources} from '../lib/event-ingestion';import {withEventOutput} from './event-output';
async function main(){
 const [mode,input,output]=process.argv.slice(2);if(!['refresh','validate'].includes(mode)||!input||mode==='validate'&&!output)throw Error('Usage: refresh <external-output.json> | validate <reviewed-input.json> <external-output.json>');
 const destination=resolve(mode==='refresh'?input:output),root=resolve(dirname(await realpath(process.argv[1])),'..');
 const data=await withEventOutput(destination,root,async()=>{
  if(mode==='refresh')return refreshSources(eventSources);
  const text=await readFile(input,'utf8');if(text.length>2_000_000)throw Error('Reviewed snapshot too large.');
  const raw=JSON.parse(text),events=readEventSnapshot(raw,Date.now(),'owner-private');if(!Array.isArray(raw.events)||events.length!==raw.events.length)throw Error('Reviewed snapshot contains invalid, expired, stale, duplicate or conflicting events; no output written.');
  return {version:1,events,refresh:{mode:'manual-reviewed',dailyActive:false}};
 }) as {events:unknown[]};
 console.log(JSON.stringify({output:destination,events:data.events.length,dailyActive:false}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
