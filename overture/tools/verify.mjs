import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {components} from '../src/catalog-data.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const results=[];
const check=(name,ok)=>{results.push({name,ok:!!ok});if(!ok)console.error('FAIL:',name);};
for(const file of ['dist/overture.js','dist/showcase.js','dist/library.js','dist/studio.js','dist/light-studies.js','src/demo.js','src/demo-boot.js']){try{new vm.Script(read(file),{filename:file});check(`syntax ${file}`,true);}catch{check(`syntax ${file}`,false);}}
try{await import('../dist/assets/engine.mjs');check('syntax dist/assets/engine.mjs',true);}catch(err){console.error(err.message);check('syntax dist/assets/engine.mjs',false);}
for(const file of ['dist/index.html','dist/components.html','dist/studio.html','dist/starter.html','dist/light-studies.html']){
  const html=read(file);const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('#')&&!/^https?:/.test(x));
  check(`local references ${file}`,refs.every(x=>fs.existsSync(path.resolve(root,path.dirname(file),x.split('#')[0]))));
}
check('no remote runtime dependencies',!/(?:src|href)=["']https?:|import\s*\(["']https?:/.test(['dist/index.html','dist/components.html','dist/studio.html','dist/overture.css','dist/overture.js','dist/assets/engine.mjs'].map(read).join('\n')));
for(const file of ['dist/overture.css','dist/showcase.css','dist/light-studies.css']){const urls=[...read(file).matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(x=>x[1]).filter(x=>!/^data:|^https?:|^#/.test(x));check(`CSS asset paths ${file}`,urls.every(x=>fs.existsSync(path.resolve(root,path.dirname(file),x))));}
// 1.3 single-file showcase: every script parses, nothing points outside the file, every embed and module is present.
{const file='dist/overture-showcase.html';const exists=fs.existsSync(path.join(root,file));check('single file exists',exists);
 if(exists){const html=read(file),size=fs.statSync(path.join(root,file)).size;check('single file stays under 16 MB',size<16*1048576);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);check('single file has its three inline scripts',scripts.length===3);
  scripts.forEach((code,i)=>{try{new vm.Script(code,{filename:`${file}#script${i}`});check(`single file script ${i} parses`,true);}catch{check(`single file script ${i} parses`,false);}});
  const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),style=(html.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||'';
  const refs=[...markup.matchAll(/(?:src|href)="([^"]*)"/g)].map(m=>m[1]).filter(u=>!u.startsWith('#')&&!/^(data|blob):/.test(u));check('single file has no file or network references',refs.length===0);
  check('single file CSS uses only inline data URLs',[...style.matchAll(/url\(["']?([^)"']+)/g)].every(m=>/^(data:|#)/.test(m[1])));
  const embedded=new Set([...html.matchAll(/data-embed="([^"]+)"/g)].map(m=>m[1])),manifest=JSON.parse(read('src/embed/manifest.json')).files.map(f=>f.name);check('single file embeds every prepared asset',manifest.every(n=>embedded.has(n))&&embedded.size===manifest.length);
  check('single file carries three.js and the engine',['three-core','three-webgpu','engine'].every(id=>html.includes(`data-module="${id}"`)));}}
for(const comp of components){check(`card ${comp.name}`,read(`project/components/${comp.name}/preview.html`).startsWith('<!-- @dsCard'));check(`docs ${comp.name}`,read(`project/components/${comp.name}/README.md`).includes('## 交互与状态'));}
const manifest=[];
function walk(folder){for(const dirent of fs.readdirSync(path.join(root,folder),{withFileTypes:true})){const rel=path.join(folder,dirent.name);if(dirent.isDirectory())walk(rel);else{const bytes=fs.readFileSync(path.join(root,rel));manifest.push({path:rel.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
for(const folder of ['project/fonts','project/components/lib','project/assets'])walk(folder);
fs.mkdirSync(path.join(root,'verification'),{recursive:true});fs.writeFileSync(path.join(root,'verification/assets-manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(root,'verification/static-checks.json'),JSON.stringify(results,null,2));
console.log(`${results.filter(x=>x.ok).length}/${results.length} static checks passed. ${manifest.length} local assets recorded.`);if(results.some(x=>!x.ok))process.exitCode=1;
