import {readdir,readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
const root=resolve(import.meta.dirname,'..'),files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='node_modules')continue;const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.(m?js)$/.test(entry.name))files.push(path);}}
await walk(root);
const scratch=await mkdtemp(resolve(tmpdir(),'lens-check-')),temporary=[];
try{
  for(const language of ['','-en','-showcase','-showcase-en']){const html=await readFile(resolve(root,`../lens${language}.html`),'utf8');const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];if(!script)throw new Error('Missing standalone bundle');const path=resolve(scratch,`standalone${language}.mjs`);await writeFile(path,script);temporary.push(path);files.push(path);}
  for(const file of files){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});if(check.status!==0)throw new Error(check.stderr||check.error?.message);}
  console.log(`Syntax checked ${files.length} modules and standalone bundles.`);
}finally{await Promise.all(temporary.map(file=>unlink(file)));await rmdir(scratch);}
