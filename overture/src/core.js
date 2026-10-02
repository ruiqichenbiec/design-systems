(function (global) {
  'use strict';
  const registry = new Map();
  let serial = 0;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
  const model = {
    clamp,
    range(value, min = 0, max = 100, step = 1) {
      if (!Number.isFinite(+min) || !Number.isFinite(+max) || max < min || !(step > 0)) throw new RangeError('Invalid range');
      const n = min + Math.round((clamp(value, min, max) - min) / step) * step;
      return +clamp(n, min, max).toFixed(6);
    },
    page(current, total, size = 6) {
      total = Math.max(0, Math.floor(Number(total)||0)); size = Math.max(1, Math.floor(Number(size)||1));
      const pages = Math.max(1, Math.ceil(total / size));
      const page = Math.round(clamp(current, 1, pages));
      return {page, pages, start: (page - 1) * size, end: Math.min(page * size, total)};
    },
    tags(value) { if(value==null)return [];return [...new Set((Array.isArray(value) ? value : String(value).split(',')).map(v => String(v).trim()).filter(Boolean))].slice(0, 12); },
    sort(rows, key, direction = 1) { return rows.map((row, index) => ({row, index})).sort((a,b) => { const x=a.row[key], y=b.row[key]; const n=typeof x==='number'&&typeof y==='number' ? x-y : String(x).localeCompare(String(y), 'zh-CN', {numeric:true}); return n * direction || a.index-b.index; }).map(v=>v.row); },
    file(file, maxMB = 10) { if (!file) return '请选择一张图片。'; if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return '请选择 PNG、JPEG 或 WebP 图片。'; if (file.size > maxMB * 1024 * 1024) return `图片超过 ${maxMB} MB，请选择较小的文件。`; return ''; }
  };
  const paths = {
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', plus:'<path d="M12 4v16M4 12h16"/>', minus:'<path d="M4 12h16"/>', chevron:'<path d="m5 9 7 7 7-7"/>', back:'<path d="m14 5-7 7 7 7"/>', next:'<path d="m10 5 7 7-7 7"/>', check:'<path d="m5 12 4 4L19 6"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', play:'<path d="m8 4 12 8-12 8Z"/>', pause:'<path d="M8 5v14M16 5v14"/>', frame:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/><circle cx="12" cy="12" r="2"/>', download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>', sound:'<path d="M4 9h4l5-5v16l-5-5H4Zm13-2q7 5 0 10m-1-7q3 2 0 4"/>', eye:'<path d="M2 12q10-13 20 0-10 13-20 0Z"/><circle cx="12" cy="12" r="3"/>', reset:'<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>', menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>', copy:'<rect x="8" y="8" width="12" height="13"/><path d="M16 8V3H3v13h5"/>', bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>', aperture:'<circle cx="12" cy="12" r="9"/><path d="m7 4 5 8-8 0m4 8 4-8 4 8m4-12-8 4 5-8"/>'
  };
  const O = global.Overture = {
    version:'1.3.0', themes:['stage','paper','nocturne'], model, registry, controllers:new Set(),
    config:{assetBase:'assets/', motion:'system', backend:'auto'},
    uid:(name='ov')=>`${name}-${++serial}`,
    escape:(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    icon:(name,cls='')=>`<svg class="ov-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.arrow}</svg>`,
    html(markup) { const template=document.createElement('template'); template.innerHTML=markup.trim(); return template.content.firstElementChild; },
    // A single-file build supplies inline assets (object URLs) under their usual names.
    asset(name) { return O.config.assets?.[name] || new URL(O.config.assetBase + name, document.baseURI).href; },
    configure(options={}) { Object.assign(O.config,options); },
    reduced() { return O.config.motion==='reduce' || (O.config.motion==='system' && global.matchMedia?.('(prefers-reduced-motion: reduce)').matches); },
    define(name, factory) { if (registry.has(name)) throw new Error(`Duplicate component: ${name}`); registry.set(name,factory); },
    mount(name, host, options={}) {
      if (typeof host==='string') host=document.querySelector(host);
      if (!host) throw new Error(`Missing host for ${name}`);
      if (!registry.has(name)) throw new Error(`Unknown Overture component: ${name}`);
      const abort=new AbortController(), cleanups=[], state={}; let root, dead=false;
      const ctx={
        state,
        listen(target,event,handler,settings={}) { target.addEventListener(event,handler,{...settings,signal:abort.signal}); },
        cleanup(fn) { cleanups.push(fn); },
        timeout(fn,time) { const id=setTimeout(()=>{if(!dead)fn();},time); cleanups.push(()=>clearTimeout(id)); return id; },
        emit(detail={}) { Object.assign(state,detail); root?.dispatchEvent(new CustomEvent('ov:change',{bubbles:true,detail:{component:name,...detail}})); options.onChange?.(detail); },
        child(name, target, props) { const c=O.mount(name,target,props); cleanups.push(()=>c.destroy());return c; },
        get alive(){return !dead;}
      };
      root=registry.get(name)(options,ctx);
      root.classList.add('ov','ov-component');root.dataset.component=name;
      if(root.tagName==='BUTTON'&&!root.hasAttribute('type'))root.type='button';
      root.querySelectorAll('button:not([type])').forEach(button=>button.type='button');
      if(options.theme)root.dataset.theme=options.theme;
      host.append(root);
      const control={element:root, state, setValue:value=>ctx.setValue?.(value), getState:()=>({...state}), destroy(){if(dead)return;dead=true;abort.abort();for(const fn of cleanups.reverse())fn();root.remove();O.controllers.delete(control);}};
      O.controllers.add(control);root.ovController=control;
      return control;
    },
    download(blob,name) { const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000); },
    // With an origin (the control or a point) the new theme opens like an iris from there.
    setTheme(theme, target=document.documentElement, options={}) { const apply=()=>{target.dataset.theme=O.themes.includes(theme)?theme:'stage';}; return O.motion?O.motion.transition(apply,{...options,target}):(apply(),Promise.resolve()); },
    nextTheme(target=document.documentElement, options) { const t=O.themes[(O.themes.indexOf(target.dataset.theme||'stage')+1)%O.themes.length]; O.setTheme(t,target,options); return t; },
    setMotion(mode) { O.config.motion=mode;document.documentElement.dataset.motion=O.reduced()?'reduce':'full';global.dispatchEvent(new Event('ov:motion')); },
    init(){const mode=new URLSearchParams(location.search).get('motion');if(['full','reduce'].includes(mode))O.config.motion=mode;document.documentElement.dataset.motion=O.reduced()?'reduce':'full';}
  };
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>O.init(),{once:true});else O.init();}
})(globalThis);
