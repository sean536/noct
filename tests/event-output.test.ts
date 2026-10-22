import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,readdir,stat,writeFile,symlink} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {withEventOutput} from '../scripts/event-output';
test('single writer, atomic output and producer failure cannot corrupt a previous snapshot',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'noct-job-')),dest=join(dir,'events.json');await writeFile(dest,'ORIGINAL');let release!:()=>void,started!:()=>void;const signal=new Promise<void>(r=>started=r);
 const first=withEventOutput(dest,process.cwd(),async()=>{started();await new Promise<void>(r=>release=r);return {version:1,events:[]};});await signal;
 await assert.rejects(withEventOutput(dest,process.cwd(),async()=>({})),/already running/);assert.equal(await readFile(dest,'utf8'),'ORIGINAL');release();await first;assert.deepEqual(JSON.parse(await readFile(dest,'utf8')),{version:1,events:[]});assert.equal((await stat(dest)).mode&0o777,0o600);assert.deepEqual(await readdir(dir),['events.json']);
 await assert.rejects(withEventOutput(dest,process.cwd(),async()=>{throw Error('producer failed');}),/producer failed/);assert.deepEqual(JSON.parse(await readFile(dest,'utf8')),{version:1,events:[]});assert.deepEqual(await readdir(dir),['events.json']);
});
test('path validation cannot overwrite repository files through direct or symlink output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'noct-job-'));await assert.rejects(withEventOutput(join(process.cwd(),'public','never-write.json'),process.cwd(),async()=>({})),/outside/);
 await symlink(join(process.cwd(),'public'),join(dir,'public-link'));await assert.rejects(withEventOutput(join(dir,'public-link','never-write.json'),process.cwd(),async()=>({})),/outside/);
 await symlink(join(dir,'missing.json'),join(dir,'dangling.json'));await assert.rejects(withEventOutput(join(dir,'dangling.json'),process.cwd(),async()=>({})),/symlink/);
});
test('CLI invoked through an external symlink still protects its actual repository',async()=>{
 const {mkdir,copyFile,access}=await import('node:fs/promises'),{spawnSync}=await import('node:child_process');
 const dir=await mkdtemp(join(tmpdir(),'noct-cli-alias-')),project=join(dir,'project'),alias=join(dir,'alias');
 for(const sub of ['scripts','lib','public'])await mkdir(join(project,sub),{recursive:true});await mkdir(join(alias,'scripts'),{recursive:true});
 for(const file of ['scripts/refresh-events.ts','scripts/event-output.ts','lib/events.ts','lib/locations.ts','lib/event-sources.ts','lib/event-ingestion.ts','lib/event-id.ts','lib/event-ical.ts'])await copyFile(join(process.cwd(),file),join(project,file));
 const link=join(alias,'scripts','refresh-events.ts'),dest=join(project,'public','must-not-exist.json');await symlink(join(project,'scripts','refresh-events.ts'),link);
 const result=spawnSync(process.execPath,['--import','tsx',link,'refresh',dest],{cwd:process.cwd(),encoding:'utf8'});assert.notEqual(result.status,0,result.stdout);assert.match(result.stderr,/outside the public repository/);await assert.rejects(access(dest));
});
