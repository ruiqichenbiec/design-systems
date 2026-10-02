import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { messages } from './i18n.js';

const root=dirname(fileURLToPath(import.meta.url));
const [html,css,renderer,physics,jelly,i18n,app,icon,tokenScript,sounds,components,tokenCSS,componentCSS,focusScript,opticalState,opticalComponents,runtime,opticalDemo,opticalCSS]=await Promise.all(['index.html','style.css','design-system/internal/renderer.js','design-system/internal/jelly-physics.js','design-system/internal/jelly.js','i18n.js','app.js','icon.svg','design-system/tokens.js','design-system/sound.js','design-system/components.js','design-system/tokens.css','design-system/components.css','design-system/focus.js','design-system/internal/optics.js','design-system/optical-components.js','design-system/runtime.js','design-system/optical-demo.js','design-system/optical-demo.css'].map(file=>readFile(resolve(root,file),'utf8')));
const contextBudget=await readFile(resolve(root,'design-system/internal/context-budget.js'),'utf8');
const opticalMotion=await readFile(resolve(root,'design-system/internal/optical-motion.js'),'utf8');
const lensSurface=await readFile(resolve(root,'design-system/internal/lens-surface.js'),'utf8');
const cardList=await readFile(resolve(root,'design-system/card-list.js'),'utf8');
const [componentPatterns,componentCatalogSource]=await Promise.all(['component-patterns.js','component-catalog.js'].map(file=>readFile(resolve(root,'design-system',file),'utf8')));
const script=[tokenScript,physics,opticalState,opticalMotion,lensSurface,contextBudget,renderer,jelly,sounds,opticalComponents,componentPatterns,cardList,components,componentCatalogSource,focusScript,runtime,opticalDemo,i18n,app].map(source=>source.replace(/^import .*?;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
const bundled=html.replace('<link rel="stylesheet" href="design-system/tokens.css">','').replace('<link rel="stylesheet" href="design-system/components.css">','').replace('<link rel="stylesheet" href="design-system/optical-demo.css">','').replace('<link rel="stylesheet" href="style.css">',()=>`<style>\n${tokenCSS}\n${componentCSS}\n${css}\n${opticalCSS}\n</style>`)
  .replace('href="icon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(icon)}"`)
  .replace('<script type="module" src="app.js"></script>',()=>`<script type="module">\n${script.replace(/<\/script/gi,'<\\/script')}\n</script>`)
  .replace('href="./" aria-label="Lens 首页"','href="#" aria-label="Lens 首页"').replace('href="design-system/index.html"','href="lab/design-system/index.html"').replace('href="design-system/examples/optics.html"','href="lens-showcase.html"');
function localizedMarkup(source,language){
  const escape=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  let markup=source.replace('<html lang="zh-CN">',`<html lang="${language==='zh'?'zh-CN':'en'}" data-default-language="${language}">`);
  // Translate only the markup before the script; never rewrite dictionary source.
  const split=markup.indexOf('<script type="module">'),script=markup.slice(split);markup=markup.slice(0,split);
  markup=markup.replace(/(<(\w+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,(_,open,tag,key,close)=>open+escape(messages[language][key])+close);
  markup=markup.replace(/<[^>]+\bdata-i18n-(?:aria|placeholder|title|content)=[^>]+>/g,tag=>{
    for(const [short,attribute] of [['aria','aria-label'],['placeholder','placeholder'],['title','title'],['content','content']]){
      const key=tag.match(new RegExp(`data-i18n-${short}="([^"]+)"`))?.[1];
      if(key)tag=tag.replace(new RegExp(`\\b${attribute}="[^"]*"`),`${attribute}="${escape(messages[language][key])}"`);
    }
    return tag;
  });
  return markup+script;
}
for(const language of ['zh','en']){
  const output=resolve(root,language==='zh'?'../lens.html':'../lens-en.html');
  const content=localizedMarkup(bundled,language);await writeFile(output,content,'utf8');
  console.log(`Standalone ${language}: ${output} (${Buffer.byteLength(content)} bytes)`);
}

const [showcaseHTML,showcaseCSS,showcaseData,showcaseCharts,showcasePage,showcaseEntry]=await Promise.all(['design-system/examples/optics.html','design-system/showcase.css','design-system/internal/showcase-data.js','design-system/showcase-charts.js','design-system/showcase.js','design-system/examples/optics.js'].map(file=>readFile(resolve(root,file),'utf8')));
const chartGlass=await readFile(resolve(root,'design-system/internal/chart-glass.js'),'utf8');
const recordsCSS=await readFile(resolve(root,'design-system/showcase-records.css'),'utf8');
const recordsGlass=await readFile(resolve(root,'design-system/internal/records-glass.js'),'utf8');
const showcaseScript=[tokenScript,physics,opticalState,opticalMotion,lensSurface,contextBudget,renderer,jelly,sounds,opticalComponents,componentPatterns,cardList,components,componentCatalogSource,focusScript,runtime,opticalDemo,showcaseData,chartGlass,recordsGlass,showcaseCharts,showcasePage,showcaseEntry].map(source=>source.replace(/^import .*?;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
const showcaseBundle=showcaseHTML.replace(/<link rel="stylesheet"[^>]+>/g,'').replace('</head>',()=>`<style>${tokenCSS}\n${componentCSS}\n${opticalCSS}\n${showcaseCSS}
${recordsCSS}</style></head>`).replace('<script type="module" src="optics.js"></script>',()=>`<script type="module">\n${showcaseScript.replace(/<\/script/gi,'<\\/script')}\n</script>`);
for(const language of ['zh','en']){
  const output=resolve(root,language==='zh'?'../lens-showcase.html':'../lens-showcase-en.html');
  const content=showcaseBundle.replace('<html lang="zh-CN">',`<html lang="${language==='zh'?'zh-CN':'en'}" data-default-language="${language}" data-standalone="true">`);
  await writeFile(output,content,'utf8');console.log(`Showcase ${language}: ${output} (${Buffer.byteLength(content)} bytes)`);
}

await import('./scripts/build-standalone-showcase.mjs');
