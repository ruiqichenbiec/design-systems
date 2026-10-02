import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workspace=path.resolve(root,'..');
const abs=(p)=>path.join(root,p);
const read=(p)=>fs.readFileSync(abs(p),'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});fs.writeFileSync(abs(p),s);};
const copy=(from,to)=>{fs.mkdirSync(path.dirname(abs(to)),{recursive:true});fs.cpSync(abs(from),abs(to),{recursive:true});};
const tokens=JSON.parse(read('project/tokens.json'));
function compile(t){
  let css='/* Generated from project/tokens.json */\n';
  for(const f of t.type.fonts)css+=`@font-face{font-family:"${f.family}";src:url("assets/fonts/${f.file}") format("truetype");font-weight:${f.weight};font-style:normal;font-display:swap}\n`;
  for(const [i,theme] of t.color.themes.entries()){
    const selector=i===0?`:root,[data-theme="${theme.id}"]`:`[data-theme="${theme.id}"]`;
    css+=`${selector}{color-scheme:${theme.id==='paper'?'light':'dark'};${[...t.color.tokens,...(t.shadow?.tokens||[])].map(v=>`${'--'+v.name}:${typeof v.value==='object'?v.value[theme.id]:v.value};`).join('')}}\n`;
  }
  css+=':root{';for(const fam of ['spacing','radius','motion'])for(const tkn of t[fam].tokens)css+=`--${tkn.name}:${typeof tkn.value==='number'?tkn.value+'px':tkn.value};`;
  for(const [k,v] of Object.entries(t.type.families))css+=`--font-${k}:${v};`;css+='}\n';
  for(const group of t.type.groups)for(const s of group.styles)css+=`.${s.name}{font-family:var(--font-${group.family});font-size:${typeof s.fontSize==='number'?s.fontSize+'px':s.fontSize};line-height:${s.lineHeight};font-weight:${s.fontWeight};letter-spacing:${s.letterSpacing||0}}\n`;
  return css;
}
const js=['core','dynamics','sound','controls','overlays','media','contact','light','film','brand'].filter(n=>fs.existsSync(abs(`src/${n}.js`))).map(n=>read(`src/${n}.js`)).join('\n');
const componentCSS=['components','motion','cold','film','dynamics'].filter(n=>fs.existsSync(abs(`src/${n}.css`))).map(n=>read(`src/${n}.css`)).join('\n');
const css=compile(tokens)+componentCSS;
write('dist/overture.js',js);write('dist/overture.css',css);
copy('project/fonts','dist/assets/fonts');copy('project/components/lib','dist/assets/lib');copy('project/assets/photos','dist/assets/photos');copy('project/assets/references','dist/assets/references');copy('project/assets/brand','dist/assets/brand');
copy('src/engine.mjs','dist/assets/engine.mjs');
// The promo film ships with the system so dist is complete without the workspace around it.
if(fs.existsSync(abs('project/assets/video')))copy('project/assets/video','dist/assets/video');
for(const n of ['showcase.css','showcase.js','library.js','studio.js','light-studies.css','light-studies.js'])if(fs.existsSync(abs(`src/${n}`)))copy(`src/${n}`,`dist/${n}`);
for(const [n,out] of [['showcase','index'],['library','components'],['studio','studio'],['starter','starter'],['light-studies','light-studies']])if(fs.existsSync(abs(`src/${n}.html`)))copy(`src/${n}.html`,`dist/${out}.html`);
if(!process.argv.includes('--draft')){
  const {components}=await import('../src/catalog-data.mjs');
  // Components that mount a WebGPU / WebGL2 canvas; ds-viewer cannot see the dynamically loaded engine.
  const GPU=new Set(['ApertureStage','DevelopImage','SilkResonance','FlashlightFocus','PinnedPhotoWall','FilmCanister','BrandComposer']);
  write('project/components/bundle.js',js);
  write('project/components/bundle.css',componentCSS.replaceAll("url('references/","url('files/references/"));
  write('dist/catalog-data.js',`globalThis.OvertureCatalog=${JSON.stringify(components)};\n`);
  for(const comp of components){
    const body=`<div class="ov" style="background:var(--ov-bg);padding:28px;min-height:${comp.height||250}px"><div id="demo"></div></div><script>Overture.configure({assetBase:'../assets/'});Overture.mount(${JSON.stringify(comp.name)},document.getElementById('demo'),${JSON.stringify(comp.props||{})});</script>`;
    write(`project/components/${comp.name}/preview.html`,`<!-- @dsCard group="${comp.group}" height=${comp.height||300} subtitle="${comp.subtitle}"${GPU.has(comp.name)?' gl':''} -->\n${body}`);
    write(`project/components/${comp.name}/README.md`,`# ${comp.title} · ${comp.name}\n\n${comp.description}\n\n## 何时使用\n\n${comp.usage}\n\n## 交互与状态\n\n${comp.states}\n\n## 接入\n\n\`\`\`js\nconst instance = Overture.mount('${comp.name}', host, ${JSON.stringify(comp.props||{},null,2)});\n// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。\n\`\`\`\n\n${comp.api||'支持 theme、onChange；组件语义及键盘行为使用原生 HTML。'}\n`);
  }
  // Catalog cover: the 15 s film (score A) as a full-width, muted, looping hero (source: src/catalog-cover.html).
  write('project/components/Cover/preview.html',read('src/catalog-cover.html'));
  execFileSync(process.execPath,[path.join(workspace,'ds-viewer/build.mjs'),root],{stdio:'inherit'});
  // Runtime modules and assets are copied by this build, never patched in generated HTML.
  copy('src/engine.mjs','dist/catalog/assets/engine.mjs');copy('project/components/lib','dist/catalog/assets/lib');
  copy('project/assets/photos','dist/catalog/assets/photos');copy('project/assets/references','dist/catalog/assets/references');
  console.log(`Built Overture 1.3.0 · ${components.length} components · fully local assets`);
  // The single-file showcase inlines the files built above (see tools/build-standalone.mjs).
  await import('./build-standalone.mjs');
}else console.log('Built Overture development preview');
