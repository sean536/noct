import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const result=await build({entryPoints:[resolve(root,'workers/facade-worker.ts')],bundle:true,format:'esm',platform:'browser',target:'es2020',minify:true,write:false,banner:{js:'/*! Third-party licences: /noct-facade-worker-LICENSES.txt */'}});
const code=result.outputFiles[0].contents,hash=createHash('sha256').update(code).digest('hex').slice(0,12),name=`noct-facade-worker-${hash}.js`;
await mkdir(resolve(root,'public'),{recursive:true});
let licenses='NOCT facade worker: third-party licences\n\n';
for(const [pkg,file] of [['@mapbox/vector-tile','LICENSE.txt'],['@mapbox/point-geometry','LICENSE'],['pbf','LICENSE'],['earcut','LICENSE']])licenses+=pkg+'\n'+await readFile(resolve(root,'node_modules',pkg,file),'utf8')+'\n\n';
await writeFile(resolve(root,'public/noct-facade-worker-LICENSES.txt'),licenses);
const output=resolve(root,'public',name);let same=false;try{same=(await readFile(output)).equals(code);}catch{}
if(!same)await writeFile(output,code);
const entry=resolve(root,'lib/facade-worker-entry.generated.ts'),text=`// Generated from workers/facade-worker.ts; npm lifecycle prepares this file.\nexport const FACADE_WORKER_URL=${JSON.stringify('/'+name)};\n`;
let previous='';try{previous=await readFile(entry,'utf8');}catch{}if(previous!==text)await writeFile(entry,text);
for(const file of await readdir(resolve(root,'public')))if(/^noct-facade-worker-[a-f0-9]{12}\.js$/.test(file)&&file!==name)await unlink(resolve(root,'public',file));
console.log(`Facade worker ready: ${name} (${code.length} bytes)`);
