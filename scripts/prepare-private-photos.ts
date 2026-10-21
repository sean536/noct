/** Optimize supplied files outside this public checkout; publish only to verified owner-private hosting. */
import sharp from 'sharp';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname} from 'node:path';
import {locationImages,locationImageWidths,locationImageFilename} from '../lib/location-images';

async function main(){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw new Error('Provide the supplied-image directory and an output directory outside the repository.');
 const root=resolve(dirname(process.argv[1]),'..'),destination=resolve(output),rel=relative(root,destination);
 if(!rel.startsWith('..'))throw new Error('Private photos must remain outside the public repository, including public/ and out/.');
 const names=await readdir(input);await mkdir(destination,{recursive:true});
 const records=[];
 for(const location of locationImages){
  const matches=names.filter(name=>new RegExp(`^${location.attachment}-.*\\.(jpg|jpeg|png)$`,'i').test(name));
  if(matches.length!==1)throw new Error(`Expected exactly one supplied image ${location.attachment}: ${location.venue}.`);
  const original=await readFile(resolve(input,matches[0]));
  const metadata=await sharp(original).metadata();
  if(metadata.width!==location.width||metadata.height!==location.height)throw new Error(`Unexpected source dimensions for ${location.venue}; verify the attachment before proceeding.`);
  const variants=[];
  for(const width of locationImageWidths){
   const file=locationImageFilename(location.id,width);
   const data=await sharp(original).rotate().resize({width,withoutEnlargement:true}).webp({quality:80,effort:5}).toBuffer();
   await writeFile(resolve(destination,file),data);
   variants.push({file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
  }
  records.push({location:location.venue,attachment:location.attachment,originalBytes:original.length,originalSha256:createHash('sha256').update(original).digest('hex'),variants});
 }
 await writeFile(resolve(destination,'provenance.json'),JSON.stringify({access:'personal-owner-private-demo',records},null,2)+'\n');
 console.log(JSON.stringify(records.map(({location,originalBytes,variants})=>({location,originalBytes,variants:variants.map(({file,bytes})=>({file,bytes}))})),null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
