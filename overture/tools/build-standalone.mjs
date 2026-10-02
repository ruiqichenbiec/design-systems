// Builds dist/overture-showcase.html: one HTML file with every style, script, font, photo, three.js and the 720p film inside.
// Run after tools/build.mjs has written dist/overture.css and dist/overture.js (build.mjs calls this at its end).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const abs=p=>path.join(root,p);
const read=p=>fs.readFileSync(abs(p),'utf8');
const sha=buf=>createHash('sha256').update(buf).digest('hex');
const b64=buf=>buf.toString('base64');
// Inline code must not close its own <script>/<style> element early.
const script=code=>code.replace(/<\/(script)/gi,'<\\/$1');
const style=code=>code.replace(/<\/(style)/gi,'<\\/$1');

const manifest=JSON.parse(read('src/embed/manifest.json'));
const stale=manifest.files.filter(f=>sha(fs.readFileSync(abs(`project/assets/${f.name}`)))!==f.source_sha256);
if(stale.length)throw new Error(`Embedded copies are older than their sources (${stale.map(f=>f.name).join(', ')}). Run: python tools/prepare-embed.py --ffmpeg <ffmpeg>`);

let css=read('dist/overture.css').replace(/url\("assets\/fonts\/([^"]+)"\)\s*format\("truetype"\)/g,(_,file)=>`url("data:font/ttf;base64,${b64(fs.readFileSync(abs(`project/fonts/${file}`)))}") format("truetype")`);
const leftover=[...css.matchAll(/url\(["']?(?!data:|#)([^)"']+)/g)].map(m=>m[1]);
if(leftover.length)throw new Error(`overture.css still points at files: ${leftover.join(', ')}`);
css+='\n'+read('src/demo.css');

const embeds=manifest.files.map(f=>{const bytes=fs.readFileSync(abs(`src/embed/${f.file}`));if(sha(bytes)!==f.sha256)throw new Error(`src/embed/${f.file} does not match its manifest entry`);return `<script type="text/plain" data-embed="${f.name}" data-type="${f.type}">${b64(bytes)}</script>`;});
const modules=[['three-core','project/components/lib/three.core.js'],['three-webgpu','project/components/lib/three.webgpu.js'],['engine','src/engine.mjs']].map(([id,file])=>{const code=fs.readFileSync(abs(file));return `<script type="text/plain" data-module="${id}" data-type="application/gzip" data-bytes="${code.length}">${b64(zlib.gzipSync(code,{level:9}))}</script>`;});
const js=['dist/overture.js','src/demo-boot.js','src/demo.js'].map(file=>`<script>\n${script(read(file))}\n</script>`).join('\n');

let html=read('src/demo.html');
for(const [mark,content] of [['<!-- @inline:css -->',`<style>\n${style(css)}\n</style>`],['<!-- @inline:embeds -->',[...embeds,...modules].join('\n')],['<!-- @inline:js -->',js]]){
  if(!html.includes(mark))throw new Error(`src/demo.html lost its ${mark} marker`);
  html=html.replace(mark,()=>content);
}
fs.writeFileSync(abs('dist/overture-showcase.html'),html);
const size=fs.statSync(abs('dist/overture-showcase.html')).size;
console.log(`Built dist/overture-showcase.html · ${(size/1048576).toFixed(2)} MB · ${manifest.files.length} embedded files · three.js + engine gzip-inlined`);
