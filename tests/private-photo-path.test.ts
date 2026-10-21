import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

for(const mode of ['dot-prefix','symlink'] as const)test(`private photo preparation rejects repository destinations through ${mode}`,()=>{
 const scratch=mkdtempSync(join(tmpdir(),'noct-private-path-'));
 const input=join(scratch,'empty-input');mkdirSync(input);
 const unique=basename(scratch);
 const inside=join(process.cwd(),mode==='dot-prefix'?`..photos-${unique}`:`private-test-${unique}`);
 let destination=inside;
 if(mode==='symlink'){const link=join(scratch,'link');symlinkSync(process.cwd(),link,'dir');destination=join(link,basename(inside));}
 try{
  // Empty input: even the pre-fix reproduction cannot write real private photos.
  const result=spawnSync(process.execPath,['--import','tsx','scripts/prepare-private-photos.ts',input,destination],{cwd:process.cwd(),encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/Private photos must remain outside the public repository/);
  assert.equal(existsSync(inside),false);
 }finally{rmSync(inside,{recursive:true,force:true});rmSync(scratch,{recursive:true,force:true});}
});
