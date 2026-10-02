import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Run after build.mjs. Keep the incumbent showcase and lab byte-for-byte,
// except for their local navigation: every destination lives inside this file.
const root=resolve(import.meta.dirname,'..');
const read=path=>readFile(resolve(root,path),'utf8');
const [showcase,lab,api]=await Promise.all([
  read('../lens-showcase.html'),read('../lens.html'),read('design-system/README.md'),
]);
const oldLinks="footerLinks.append(link(c.catalog,`${referenceRoot}index.html`),link(c.api,`${referenceRoot}README.md`),link(c.lab,document.documentElement.dataset.standalone==='true'?'lens.html':'../../index.html'))";
if(!showcase.includes(oldLinks))throw new Error('Showcase footer changed; review standalone navigation.');
const page=showcase.replace(oldLinks,"footerLinks.append(link(c.catalog,'#component-index'),link(c.api,'#offline-api'),link(c.lab,'#offline-lab'))");
const embeddedLab=lab.replace(/href="lab\/design-system\/index\.html"/g,'href="#offline-components"')
  .replace(/href="lens-showcase\.html"/g,'href="#offline-showcase"');
const payload=JSON.stringify({lab:embeddedLab,api}).replace(/</g,'\\u003c');
const css=`
  #offline-view[hidden]{display:none}
  #offline-view{min-height:100vh;background:#f5f7f5;color:#243936;font:16px/1.65 var(--lg-font-family)}
  .offline-header{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:20px;padding:16px 24px;background:#f5f7f5;border-bottom:1px solid #dbe4e1}
  .offline-header h1{font-size:18px;font-weight:600;margin:0}
  .offline-back{font:inherit;cursor:pointer;border:0;border-radius:24px;background:#e5ece7;color:#294d43;padding:10px 18px;min-height:44px}
  .offline-back:focus-visible{outline:3px solid var(--lg-color-focus);outline-offset:3px}
  .offline-api{max-width:84ch;margin:0 auto;padding:32px 24px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.8 ui-monospace,Consolas,monospace}
  .offline-lab{display:block;width:100%;height:calc(100dvh - 80px);border:0;background:#f5f7f5}
  @media(max-width:600px){.offline-header{padding:12px;gap:12px}.offline-header h1{font-size:16px}.offline-api{padding:24px 16px}}
`;
const runtime=`
(() => {
  const assets=JSON.parse(document.getElementById('offline-assets').textContent);
  const showcase=document.getElementById('showcase');
  const view=document.createElement('section');view.id='offline-view';view.hidden=true;
  document.body.append(view);
  let priorHash='',priorScroll=0,priorFocus=null,opened=false,attachmentRoute=location.hash;
  const attachment=location.protocol==='content:';
  const route=()=>attachment?attachmentRoute:location.hash;
  const isOffline=()=>['#offline-api','#offline-lab'].includes(route());
  function close(target){
    if(attachment)attachmentRoute=target||priorHash||'#material';
    else history.replaceState(null,'',target||priorHash||'#material');
    render();
    if(target)document.querySelector(target)?.scrollIntoView();
  }
  function render(){
    if(!isOffline()){
      if(opened){
        view.replaceChildren();view.hidden=true;showcase.hidden=false;opened=false;
        window.scrollTo(0,priorScroll);priorFocus?.focus({preventScroll:true});
      }
      return;
    }
    const en=document.documentElement.lang==='en';
    if(!opened){priorScroll=window.scrollY;priorFocus=document.activeElement;opened=true;}
    showcase.hidden=true;view.hidden=false;view.replaceChildren();
    const header=document.createElement('header');header.className='offline-header';
    const back=document.createElement('button');back.className='offline-back';back.type='button';
    back.textContent=en?'Back to showcase':'返回展示';back.addEventListener('click',()=>close());
    const title=document.createElement('h1');title.id='offline-title';
    title.textContent=route()==='#offline-api'?(en?'Component API':'组件 API'):(en?'Material lab':'材质实验室');
    view.setAttribute('aria-labelledby',title.id);header.append(back,title);view.append(header);
    if(route()==='#offline-api'){
      const text=document.createElement('pre');text.className='offline-api';text.textContent=assets.api;view.append(text);
    }else{
      const frame=document.createElement('iframe');frame.className='offline-lab';frame.title=title.textContent;
      frame.addEventListener('load',()=>{
        frame.contentDocument.addEventListener('click',event=>{
          const anchor=event.target.closest('a');if(!anchor)return;
          const href=anchor.getAttribute('href');
          if(href==='#offline-components'||href==='#offline-showcase'){
            event.preventDefault();close(href==='#offline-components'?'#component-index':'#material');
          }
        });
      });
      frame.srcdoc=assets.lab.replace('data-default-language="zh"','data-default-language="'+(en?'en':'zh')+'"');
      view.append(frame);
    }
    window.scrollTo(0,0);back.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a');
    const href=anchor?.getAttribute('href');
    if(['#offline-api','#offline-lab'].includes(href)&&!opened)priorHash=route();
    // Android content providers can reject a URI when its fragment changes.
    // Keep attachment navigation in this document without rewriting its grant.
    if(attachment&&href?.startsWith('#')){
      event.preventDefault();attachmentRoute=href;render();
      if(!isOffline()&&href.length>1)document.getElementById(href.slice(1))?.scrollIntoView();
    }
  });
  window.addEventListener('hashchange',render);
  // The incumbent module mounts first; also supports bookmarked offline views.
  window.addEventListener('DOMContentLoaded',render,{once:true});
})();
`;
const output=page.replace('</head>',`<style>${css}</style></head>`).replace('</body>',()=>
  `<script type="application/json" id="offline-assets">${payload}</script><script>${runtime}</script></body>`);
const destination=resolve(root,'../lens-showcase-standalone.html');
await writeFile(destination,output,'utf8');
console.log(`Complete single-file showcase: ${destination} (${Buffer.byteLength(output)} bytes)`);
