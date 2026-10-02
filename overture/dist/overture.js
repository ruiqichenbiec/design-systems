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

(function(O){
  'use strict';
  // Motion kernel (1.3). One primitive per grammar:
  // open / occlude → iris · focus / develop → develop, flip, count · tension / freeze → spring.
  const doc=typeof document!=='undefined'?document:null,win=typeof window!=='undefined'?window:null;
  // Physical presets. project/tokens.json "spring" mirrors these numbers; tests assert parity.
  const presets={
    snap:{stiffness:600,damping:36,mass:1},       // controls, needles, viewfinders · ~300 ms, 3 % overshoot
    settle:{stiffness:120,damping:20,mass:1},     // prints, film, overlays · ~530 ms
    stage:{stiffness:52,damping:13.2,mass:1},     // camera moves, the aperture opening · ~790 ms
    resonance:{stiffness:140,damping:3.2,mass:1}, // silk ringing after release · period 0.53 s
    swing:{stiffness:36,damping:1.8,mass:1}       // a print swinging on its pin · period 1.05 s
  };
  const ease='cubic-bezier(.16,1,.3,1)',exit='cubic-bezier(.5,0,.75,0)';
  const reduced=()=>O.reduced();
  // Closed-form damped oscillator: displacement from the target and velocity after t seconds.
  function solve(p,x0,v0,t){
    const m=p.mass||1,w0=Math.sqrt(p.stiffness/m),z=p.damping/(2*Math.sqrt(p.stiffness*m));
    if(z<1-1e-6){const wd=w0*Math.sqrt(1-z*z),a=z*w0,e=Math.exp(-a*t),B=(v0+a*x0)/wd,cs=Math.cos(wd*t),sn=Math.sin(wd*t);return [e*(x0*cs+B*sn),e*((B*wd-a*x0)*cs-(a*B+x0*wd)*sn)];}
    if(z<=1+1e-6){const e=Math.exp(-w0*t),B=v0+w0*x0;return [e*(x0+B*t),e*(B-w0*(x0+B*t))];}
    const s=Math.sqrt(z*z-1),r1=-w0*(z-s),r2=-w0*(z+s),c2=(v0-r1*x0)/(r2-r1),c1=x0-c2,e1=Math.exp(r1*t),e2=Math.exp(r2*t);
    return [c1*e1+c2*e2,c1*r1*e1+c2*r2*e2];
  }
  const params=(name,o={})=>{const p={...(presets[name]||presets.settle)};for(const k of ['stiffness','damping','mass'])if(o[k]>0)p[k]=+o[k];return p;};
  // Seconds until a unit step stays within eps of rest, rounded up to 10 ms.
  function settleTime(p,eps=.005){let last=0;for(let t=0;t<8;t+=.002){const [x,v]=solve(p,-1,0,t);if(Math.abs(x)>eps||Math.abs(v)>eps*10)last=t;}return Math.ceil(last*100-1e-9)/100;}
  // The same spring as a CSS linear() easing, so declarative transitions share the physics.
  function cssEasing(name,points=24){const p=params(name),T=settleTime(p),out=[];for(let i=0;i<=points;i++)out.push(i===points?1:+(1+solve(p,-1,0,T*i/points)[0]).toFixed(3));return `linear(${out.join(', ')})`;}
  const linearOK=!!(typeof CSS!=='undefined'&&CSS.supports?.('transition-timing-function','linear(0, 1)'));
  const easings={};
  const easing=name=>linearOK&&presets[name]?(easings[name]??=cssEasing(name)):ease;
  const time=name=>Math.round(settleTime(params(name))*1000);

  // Springs share one animation frame and stop when every spring rests.
  const running=new Set();let raf=0;
  function frame(t){raf=0;if(reduced()){for(const s of [...running])s.finish();return;}for(const s of [...running])s.step(t);if(running.size)raf=requestAnimationFrame(frame);}
  function spring(options={}){
    const scalar=!Array.isArray(options.value),list=v=>(Array.isArray(v)?v:[v]).map(n=>Number.isFinite(+n)?+n:0);
    let p=params(options.preset,options),value=list(options.value??0),target=[...value],velocity=value.map(()=>0),from,start,t0=0,frozen=false,leg=null;
    const eps=options.precision??.001,out=v=>scalar?v[0]:[...v],zero=()=>value.map(()=>0);
    const settle=(ok)=>{const l=leg;leg=null;l?.(ok);};
    function sync(t=performance.now()){if(!running.has(api))return;const dt=Math.max(0,(t-t0)/1000);for(let i=0;i<value.length;i++){const [x,v]=solve(p,from[i],start[i],dt);value[i]=target[i]+x;velocity[i]=v;}}
    function run(){from=value.map((v,i)=>v-target[i]);start=[...velocity];t0=performance.now();running.add(api);if(!raf&&typeof requestAnimationFrame!=='undefined')raf=requestAnimationFrame(frame);}
    function rest(){running.delete(api);value=[...target];velocity=zero();options.onUpdate?.(out(value),out(velocity));options.onRest?.(out(value));settle(true);}
    const api={
      step(t){sync(t);for(let i=0;i<value.length;i++)if(Math.abs(value[i]-target[i])>eps||Math.abs(velocity[i])>eps*10){options.onUpdate?.(out(value),out(velocity));return;}rest();},
      // Retarget from the current position and velocity; resolves true when this leg comes to rest.
      to(next,o={}){
        sync();settle(false);target=list(next);if(o.velocity!==undefined)velocity=list(o.velocity);if(o.preset||o.stiffness)p=params(o.preset||options.preset,o);
        const done=new Promise(r=>{leg=r;});
        if(frozen)return done;
        if(reduced()||o.instant)rest();else run();
        return done;
      },
      set(next){running.delete(api);settle(false);value=list(next);target=[...value];velocity=zero();options.onUpdate?.(out(value),out(velocity));return api;},
      impulse(dv){if(reduced())return api;sync();const d=list(dv);velocity=velocity.map((v,i)=>v+(d[i]||0));if(!frozen)run();return api;},
      // Freeze keeps the exact displacement and velocity; thawing continues the same motion.
      freeze(on=true){if(on){sync();running.delete(api);frozen=true;}else if(frozen){frozen=false;if(value.some((v,i)=>Math.abs(v-target[i])>eps)||velocity.some(v=>Math.abs(v)>eps*10))run();else rest();}return api;},
      finish(){if(running.has(api)||leg)rest();return api;},
      stop(){running.delete(api);settle(false);return api;},
      get value(){sync();return out(value);},get target(){return out(target);},get velocity(){sync();return out(velocity);},
      get moving(){return running.has(api);},get frozen(){return frozen;}
    };
    return api;
  }

  // Iris: an opening from a point (the trigger, the pointer), or the shutter / unfold shapes.
  const IRIS='ov-iris';
  function focusPoint(el,origin){
    const r=el.getBoundingClientRect();let x=r.width/2,y=r.height/2;
    if(origin){const o=origin.getBoundingClientRect?origin.getBoundingClientRect():null;x=(o?o.left+o.width/2:origin[0])-r.left;y=(o?o.top+o.height/2:origin[1])-r.top;}
    return {x,y,w:r.width,h:r.height};
  }
  function iris(el,{open=true,origin,shape='circle',duration,easing:curve}={}){
    if(!el?.animate)return Promise.resolve();
    const prev=el.getAnimations().filter(a=>a.id===IRIS),current=prev.length?getComputedStyle(el).clipPath:'';prev.forEach(a=>a.cancel());
    if(reduced())return Promise.resolve();
    const {x,y,w,h}=focusPoint(el,origin),R=Math.ceil(Math.hypot(Math.max(x,w-x),Math.max(y,h-y)))+2;
    const shapes={circle:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`],shutter:['inset(0px 50% 0px 50%)','inset(0px 0% 0px 0%)'],unfold:['inset(0px 0px 100% 0px)','inset(0px 0px 0% 0px)']};
    const [shut,full]=shapes[shape]||shapes.circle,begin=current&&current!=='none'&&current.split('(')[0]===shut.split('(')[0]?current:(open?shut:full);
    const a=el.animate([{clipPath:begin},{clipPath:open?full:shut}],{duration:duration??(open?420:260),easing:curve??(open?ease:exit),fill:'forwards'});a.id=IRIS;
    // An opened iris leaves no clip behind; a closed one holds until the caller hides the element and calls release().
    return a.finished.then(()=>{if(open)a.cancel();return true;},()=>false);
  }
  const release=el=>el?.getAnimations?.().forEach(a=>{if(a.id===IRIS)a.cancel();});

  // Develop: from over-exposed monochrome to the finished print.
  function develop(el,{duration=640,delay=0,from='bright'}={}){
    if(!el?.animate||reduced())return Promise.resolve();
    const start=from==='gray'?'grayscale(1) brightness(.82) contrast(1.2)':'grayscale(1) brightness(1.85) contrast(.55)';
    return el.animate([{filter:start,opacity:.35},{filter:'grayscale(.45) brightness(1.12) contrast(.9)',opacity:1,offset:.42},{filter:'grayscale(0) brightness(1) contrast(1)',opacity:1}],{duration,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}).finished.catch(()=>{});
  }
  // FLIP: members keep their identity through a re-order and travel from where they were.
  function flip(scope,selector,mutate,{key=el=>el.dataset.key??el.textContent,preset='settle',enter=true}={}){
    const before=new Map();scope.querySelectorAll(selector).forEach(el=>before.set(key(el),el.getBoundingClientRect()));
    mutate();
    if(reduced())return;
    scope.querySelectorAll(selector).forEach(el=>{const b=before.get(key(el));if(!b){if(enter)develop(el,{duration:560});return;}const r=el.getBoundingClientRect(),dx=b.left-r.left,dy=b.top-r.top;if(Math.abs(dx)<.5&&Math.abs(dy)<.5)return;el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0px,0px)'}],{duration:time(preset),easing:easing(preset),composite:'add'});});
  }
  // A mechanical counter: the new figure turns over in the direction of travel.
  function count(el,text,dir=1){
    text=String(text);const old=el.textContent;el.textContent=text;
    if(!old||old===text||reduced()||!el.animate)return;
    el.getAnimations().forEach(a=>{if(a.id==='ov-count')a.cancel();});
    const a=el.animate([{transform:`perspective(240px) rotateX(${dir<0?72:-72}deg)`,opacity:.2},{transform:'perspective(240px) rotateX(0deg)',opacity:1}],{duration:time('snap'),easing:easing('snap')});a.id='ov-count';
  }
  // Selection imprint: a proof mark pressed into place.
  function imprint(el){if(!el?.animate||reduced())return;el.animate([{transform:'scale(1.38) rotate(-9deg)'},{transform:'scale(1) rotate(0deg)'}],{duration:time('snap'),easing:easing('snap'),composite:'add'});}

  // Dissolve: the reduced-motion stand-in for a spatial move. The frame dims, the change happens in the dark,
  // and it comes back — no travel, no scale. It also runs when motion is reduced; that is its purpose.
  function dissolve(el,swap,{duration=420,color}={}){
    let done=false;const commit=()=>{if(!done){done=true;swap();}};
    if(!el?.animate||!doc){commit();return Promise.resolve();}
    let veil=[...el.children].find(x=>x.classList?.contains('ov-dissolve'));
    if(!veil){veil=doc.createElement('span');veil.className='ov-dissolve';veil.setAttribute('aria-hidden','true');el.append(veil);}
    if(color)veil.style.setProperty('--dissolve',color);
    veil.getAnimations().forEach(a=>a.cancel());
    const timer=setTimeout(commit,duration*.5);
    return veil.animate([{opacity:0},{opacity:1,offset:.42},{opacity:1,offset:.58},{opacity:0}],{duration,easing:'ease-in-out'}).finished.then(()=>{},()=>{}).finally(()=>{clearTimeout(timer);commit();});
  }
  // Theme changes open like an iris from the control that asked for them (View Transitions when available).
  function transition(apply,{origin,target}={}){
    const root=doc?.documentElement;
    if(!doc?.startViewTransition||!origin||reduced()||(target&&target!==root)){apply();return Promise.resolve();}
    const {x,y}=focusPoint(root,origin),R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
    root.classList.add('ov-vt');
    const vt=doc.startViewTransition(apply);
    vt.ready.then(()=>root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`]},{duration:760,easing:ease,pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
    return vt.finished.catch(()=>{}).finally(()=>root.classList.remove('ov-vt'));
  }

  O.motion={presets,solve,settleTime,cssEasing,easing,time,spring,iris,release,develop,flip,count,imprint,dissolve,transition,ease,exit};
  // Fills and imprints open from where the pointer entered, pressed or left.
  if(doc){
    const mark=ev=>{const t=ev.target?.closest?.('.ov-button,.ov-icon-button,.ov-choices label');if(!t)return;const r=t.getBoundingClientRect();t.style.setProperty('--x',`${ev.clientX-r.left}px`);t.style.setProperty('--y',`${ev.clientY-r.top}px`);};
    for(const type of ['pointerover','pointerout','pointerdown'])doc.addEventListener(type,mark,{passive:true});
  }
  win?.addEventListener('ov:motion',()=>{if(reduced())for(const s of [...running])s.finish();});
})(globalThis.Overture);

(function(O){
  'use strict';
  // Interaction sounds (1.3): short Web Audio syntheses of the darkroom's mechanics. Off by default;
  // nothing is created or played until Overture.setSound(true) is called from a user gesture.
  let ctx=null,master=null,noise=null,enabled=false;const last=new Map();
  const gap={tick:30,shutter:70,lever:70,paper:90,drop:90,silk:160,iris:140,cut:90};
  function init(){
    if(ctx)return ctx;const Audio=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);if(!Audio)return null;
    ctx=new Audio();master=ctx.createGain();master.gain.value=.34;
    const glue=ctx.createDynamicsCompressor();glue.threshold.value=-20;glue.ratio.value=3;glue.attack.value=.002;glue.release.value=.12;master.connect(glue).connect(ctx.destination);
    noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noise.getChannelData(0);let seed=11;for(let i=0;i<d.length;i++){seed=(seed*1664525+1013904223)>>>0;d[i]=seed/2147483648-1;}
    return ctx;
  }
  function bus(pan){if(!ctx.createStereoPanner)return master;const p=ctx.createStereoPanner();p.pan.value=Math.max(-.6,Math.min(.6,pan||0));p.connect(master);return p;}
  // Three ingredients: a filtered noise click, a pitched thump and a sweeping hiss.
  function click(t,to,{freq=3000,q=1,decay=.006,gain=.4}){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+decay*6);s.connect(f).connect(g).connect(to);s.start(t,Math.random()*.8);s.stop(t+decay*6+.02);}
  function thump(t,to,{freq=120,decay=.1,gain=.3}){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq*1.7,t);o.frequency.exponentialRampToValueAtTime(freq,t+.03);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+decay);o.connect(g).connect(to);o.start(t);o.stop(t+decay+.02);}
  function hiss(t,to,{from=900,to:end=2600,dur=.16,gain=.12,q=.9}){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;s.loop=true;f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(end,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+dur*.25);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(to);s.start(t,Math.random()*.8);s.stop(t+dur+.02);}
  const voices={
    tick:(t,d,o)=>click(t,d,{freq:3800*o.pitch,q:5,decay:.0025,gain:.2*o.gain}),                       // ratchet, counter, detent
    shutter:(t,d,o)=>{click(t,d,{freq:3400,q:1.4,decay:.005,gain:.5*o.gain});thump(t+.004,d,{freq:150,decay:.08,gain:.18*o.gain});click(t+.058,d,{freq:2500*o.pitch,q:1.1,decay:.007,gain:.34*o.gain});},
    lever:(t,d,o)=>{click(t,d,{freq:1900,q:2,decay:.008,gain:.3*o.gain});thump(t+.002,d,{freq:95,decay:.11,gain:.26*o.gain});click(t+.02,d,{freq:3200,q:3,decay:.003,gain:.14*o.gain});},
    paper:(t,d,o)=>hiss(t,d,{from:700*o.pitch,to:2400*o.pitch,dur:.17,gain:.1*o.gain}),                 // a print sliding, a sheet unfolding
    drop:(t,d,o)=>{thump(t,d,{freq:105,decay:.15,gain:.34*o.gain});click(t,d,{freq:800,q:.8,decay:.012,gain:.12*o.gain});},
    silk:(t,d,o)=>{hiss(t,d,{from:380,to:1500,dur:.42,gain:.07*o.gain,q:.6});hiss(t+.05,d,{from:900,to:420,dur:.36,gain:.04*o.gain,q:.7});},
    iris:(t,d,o)=>{for(let i=0;i<6;i++)click(t+i*.022,d,{freq:2600+i*260,q:4,decay:.002,gain:.15*o.gain});thump(t+.14,d,{freq:130,decay:.07,gain:.12*o.gain});},
    cut:(t,d,o)=>{click(t,d,{freq:2800,q:2.2,decay:.004,gain:.22*o.gain});hiss(t+.01,d,{from:1700,to:600,dur:.13,gain:.05*o.gain});}
  };
  function play(name,opts={}){
    if(!(enabled||opts.force)||!voices[name]||!init())return false;
    const now=performance.now();if(!opts.force&&now-(last.get(name)||0)<(gap[name]||40))return false;last.set(name,now);
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    let pan=opts.pan;if(pan===undefined&&opts.at?.getBoundingClientRect){const r=opts.at.getBoundingClientRect();pan=((r.left+r.width/2)/Math.max(1,innerWidth))*2-1;}
    voices[name](ctx.currentTime+.004,bus(pan||0),{gain:Math.max(0,Math.min(1.5,opts.gain??1)),pitch:opts.pitch??(1+(Math.random()-.5)*.08)});
    return true;
  }
  function set(on){enabled=!!on;if(enabled&&init())ctx.resume().catch(()=>{});if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('ov:sound',{detail:{enabled}}));return enabled;}
  O.sound={play,set,voices:Object.keys(voices),get enabled(){return enabled;}};
  O.setSound=set;
})(globalThis.Overture);

(function(O){
  'use strict';
  const e=O.escape, icon=O.icon, html=O.html, M=O.motion, S=O.sound;
  function button(label, cls='', symbol='arrow'){return `<button type="button" class="ov-button ${cls}"><span>${e(label)}</span>${symbol?icon(symbol):''}</button>`;}
  O.define('CueButton',(p,c)=>{
    const root=html(`<div class="ov-demo-actions">${button(p.label||'进入这一幕',p.variant==='circle'?'ov-button--circle':'')}<span class="ov-help" aria-live="polite"></span></div>`), b=root.querySelector('button'), out=root.querySelector('.ov-help');
    if(p.disabled)b.disabled=true;b.classList.add('ov-cue-shutter');let exposeTimer=0;c.cleanup(()=>clearTimeout(exposeTimer));
    c.listen(b,'pointermove',ev=>{const r=b.getBoundingClientRect();b.style.setProperty('--x',`${ev.clientX-r.left}px`);b.style.setProperty('--y',`${ev.clientY-r.top}px`);});
    c.listen(b,'click',async()=>{b.classList.remove('is-exposing');void b.offsetWidth;b.classList.add('is-exposing');S.play('shutter',{at:b});clearTimeout(exposeTimer);exposeTimer=setTimeout(()=>b.classList.remove('is-exposing'),680);if(p.onActivate){b.disabled=true;b.setAttribute('aria-busy','true');try{await p.onActivate();c.emit({activated:true});}catch(error){out.textContent=error.message||'这次操作未完成，请重试。';}finally{if(c.alive){b.disabled=false;b.removeAttribute('aria-busy');}}return;} b.disabled=true;b.setAttribute('aria-busy','true');b.querySelector('span').textContent='正在开幕';c.timeout(()=>{b.disabled=false;b.removeAttribute('aria-busy');b.querySelector('span').textContent=p.label||'再次进入';out.textContent='这一幕已就绪';M.develop(out,{duration:520});c.emit({activated:true});},650);});return root;
  });
  O.define('IconButton',(p,c)=>{const root=html(`<button type="button" class="ov-icon-button" aria-label="${e(p.label||'收藏这一帧')}" aria-pressed="false">${icon(p.icon||'bookmark')}</button>`);let value=!!p.value;const set=(v,touched)=>{value=!!v;root.setAttribute('aria-pressed',String(value));if(touched){S.play('tick',{at:root,pitch:value?1.1:.85});if(value)M.imprint(root.querySelector('svg'));}c.emit({value});};c.listen(root,'click',()=>set(!value,true));c.setValue=set;set(value);return root;});
  O.define('TextLink',(p,c)=>{const root=html(`<a class="ov-text-link" href="${e(p.href||'#')}"><span>${e(p.label||'展开创作手记')}</span>${icon('arrow')}</a>`);if(!p.href)c.listen(root,'click',ev=>{ev.preventDefault();root.querySelector('span').textContent='手记已加入阅读列表';M.develop(root.querySelector('span'),{duration:520});c.emit({activated:true});});return root;});
  O.define('StageTabs',(p,c)=>{
    const values=p.items||['摄影','歌剧','时装'], id=O.uid('tabs');let current=0;
    const root=html(`<div class="ov-tabs"><div role="tablist" aria-label="${e(p.label||'创作领域')}">${values.map((v,i)=>`<button type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${e(v)}</button>`).join('')}<i class="ov-tabs__line"></i></div>${values.map((v,i)=>`<div role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}" tabindex="0" ${i?'hidden':''}><span class="ov-serial">${String(i+1).padStart(2,'0')}</span><p>${e(p.panels?.[i]||['光线留下形状，观看赋予意义。','让一段旋律，打开一个世界。','形式是情绪留下的轮廓。'][i%3])}</p></div>`).join('')}</div>`);
    const tabs=[...root.querySelectorAll('[role=tab]')], panels=[...root.querySelectorAll('[role=tabpanel]')], line=root.querySelector('.ov-tabs__line');
    // The viewfinder is a sprung object: it stretches toward where it is going and settles with a small overshoot.
    const frame=M.spring({preset:'snap',value:0,precision:.0004,onUpdate:(x,v)=>{const stretch=Math.min(.28,Math.abs(v)*.022);line.style.transformOrigin=v<0?'100% 50%':'0 50%';line.style.transform=`translateX(${x*100}%) scaleX(${1+stretch})`;}});line.style.transition='none';
    const select=(n,focus=false)=>{const prev=current;current=(n+tabs.length)%tabs.length;root.dataset.dir=current<prev?'back':'fwd';tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===current));tab.tabIndex=i===current?0:-1;panels[i].hidden=i!==current;});root.style.setProperty('--tab',current);root.style.setProperty('--tabs',tabs.length);frame.to(current);if(prev!==current)S.play('tick',{at:tabs[current]});if(focus)tabs[current].focus();c.emit({index:current,value:values[current]});};
    tabs.forEach((b,i)=>{c.listen(b,'click',()=>select(i));c.listen(b,'keydown',ev=>{let n=ev.key==='ArrowRight'?current+1:ev.key==='ArrowLeft'?current-1:ev.key==='Home'?0:ev.key==='End'?tabs.length-1:null;if(n!==null){ev.preventDefault();select(n,true);}});});c.cleanup(()=>frame.stop());c.setValue=n=>select(+n||0);select(0);frame.set(0);return root;
  });
  O.define('ChapterNav',(p,c)=>{const items=p.items||['序曲','观看','共鸣'];const root=html(`<nav class="ov-chapters" aria-label="章节">${items.map((x,i)=>`<button type="button" aria-current="${i===0?'step':'false'}"><span>${String(i+1).padStart(2,'0')}</span>${e(x)}</button>`).join('')}</nav>`);[...root.children].forEach((b,i)=>c.listen(b,'click',()=>{const prev=[...root.children].findIndex(x=>x.getAttribute('aria-current')==='step');root.dataset.dir=i<prev?'back':'fwd';[...root.children].forEach(x=>x.setAttribute('aria-current','false'));b.setAttribute('aria-current','step');if(prev!==i)S.play('tick',{at:b});c.emit({index:i});p.onSelect?.(i);}));return root;});
  O.define('Breadcrumb',(p,c)=>{const root=html(`<nav class="ov-breadcrumb" aria-label="路径">${(p.items||['作品','舞台','幕间']).map((v,i,a)=>i===a.length-1?`<span aria-current="page">${e(v)}</span>`:`<a href="#">${e(v)}</a>${icon('next')}`).join('')}</nav>`);root.querySelectorAll('a').forEach(a=>c.listen(a,'click',ev=>{ev.preventDefault();c.emit({value:a.textContent});}));return root;});
  O.define('Pagination',(p,c)=>{let page=1;const total=p.total||36,size=p.size||6;const root=html(`<nav class="ov-pagination" aria-label="翻页"><button class="ov-icon-button" aria-label="上一页">${icon('back')}</button><span aria-live="polite"></span><button class="ov-icon-button" aria-label="下一页">${icon('next')}</button></nav>`),bs=root.querySelectorAll('button'),label=root.querySelector('span');const update=(v,touched)=>{const s=O.model.page(v,total,size),dir=Math.sign(s.page-page)||1;page=s.page;bs[0].disabled=page===1;bs[1].disabled=page===s.pages;M.count(label,`${String(page).padStart(2,'0')} / ${String(s.pages).padStart(2,'0')}`,dir);if(touched)S.play('tick',{at:label});c.emit(s);};c.listen(bs[0],'click',()=>update(page-1,true));c.listen(bs[1],'click',()=>update(page+1,true));c.setValue=update;update(page);return root;});
  O.define('TextField',(p,c)=>{
    const id=O.uid('field');const root=html(`<label class="ov-field" for="${id}"><span>${e(p.label||'电子邮箱')}</span><span class="ov-field__control"><input id="${id}" type="${e(p.type||'email')}" placeholder="${e(p.placeholder||'name@example.com')}" value="${e(p.value||'')}" aria-describedby="${id}-help" ${p.required?'required':''} ${p.disabled?'disabled':''}>${icon('frame')}</span><small id="${id}-help" aria-live="polite">${e(p.help||'收到新作时，再与你相见。')}</small></label>`),input=root.querySelector('input'),help=root.querySelector('small');
    // A new error is exposed onto the line: the proof-red rule runs under the field and the message develops in.
    const validate=()=>{const invalid=(input.value.length>0||p.required)&&!input.checkValidity(),was=input.getAttribute('aria-invalid')==='true';input.setAttribute('aria-invalid',String(invalid));help.textContent=invalid?(p.error||'请填写完整的邮箱地址。'):(p.help||'收到新作时，再与你相见。');if(invalid!==was)M.develop(help,{duration:520});c.emit({value:input.value,valid:!invalid});return !invalid;};c.listen(input,'blur',validate);c.listen(input,'input',()=>{if(input.getAttribute('aria-invalid')==='true')validate();else c.emit({value:input.value,valid:input.checkValidity()});});c.setValue=v=>{input.value=String(v);validate();};return root;
  });
  O.define('TextArea',(p,c)=>{const id=O.uid('text');const max=p.maxLength||180;const root=html(`<label class="ov-field"><span>${e(p.label||'创作笔记')}</span><textarea id="${id}" rows="4" maxlength="${max}" placeholder="${e(p.placeholder||'写下一瞬间的感受……')}" aria-describedby="${id}-count">${e(p.value||'')}</textarea><small id="${id}-count" aria-live="polite">0 / ${max}</small></label>`),input=root.querySelector('textarea'),out=root.querySelector('small');const update=()=>{out.textContent=`${input.value.length} / ${max}`;root.classList.toggle('is-near-limit',input.value.length>=max*.9);c.emit({value:input.value,remaining:max-input.value.length});};c.listen(input,'input',update);c.setValue=v=>{input.value=String(v).slice(0,max);update();};update();return root;});
  O.define('Select',(p,c)=>{const values=p.items||['摄影作品集','演出节目单','时装企划'];const root=html(`<label class="ov-field"><span>${e(p.label||'制作类型')}</span><span class="ov-select"><select>${values.map(v=>`<option>${e(v)}</option>`).join('')}</select>${icon('chevron')}</span></label>`),input=root.querySelector('select');c.listen(input,'change',()=>{S.play('tick',{at:input});c.emit({value:input.value});});c.setValue=v=>{input.value=v;c.emit({value:input.value});};return root;});
  O.define('ChoiceGroup',(p,c)=>{const id=O.uid('choice'),items=p.items||['暗场 Stage','印纸 Paper','朱红 Accent'];const root=html(`<fieldset class="ov-choices"><legend>${e(p.label||'画面的情绪')}</legend>${items.map((v,i)=>`<label><input type="radio" name="${id}" value="${e(v)}" ${i===0?'checked':''}><span>${e(v)}</span></label>`).join('')}</fieldset>`);root.querySelectorAll('input').forEach((input,i)=>c.listen(input,'change',()=>{S.play('tick',{at:input.parentElement});c.emit({index:i,value:input.value});}));return root;});
  O.define('Check',(p,c)=>{const root=html(`<label class="ov-check"><input type="checkbox" ${p.value?'checked':''} ${p.disabled?'disabled':''}><span class="ov-check__box">${icon('check')}</span><span>${e(p.label||'把这一帧加入精选')}</span></label>`),input=root.querySelector('input');c.listen(input,'change',()=>{S.play('tick',{at:root,pitch:input.checked?1.15:.85});c.emit({value:input.checked});});c.setValue=v=>{input.checked=!!v;c.emit({value:!!v});};return root;});
  O.define('Switch',(p,c)=>{const root=html(`<button type="button" class="ov-switch" role="switch" aria-checked="${!!p.value}" ${p.disabled?'disabled':''}><span class="ov-switch__track" aria-hidden="true"><i></i></span><span>${e(p.label||'显示取景标记')}</span></button>`);const set=v=>{root.setAttribute('aria-checked',String(!!v));c.emit({value:!!v});};c.listen(root,'click',()=>{S.play('lever',{at:root});set(root.getAttribute('aria-checked')!=='true');});c.setValue=set;return root;});
  O.define('Range',(p,c)=>{
    const id=O.uid('range'),min=p.min??0,max=p.max??100,step=p.step??1;const root=html(`<label class="ov-range" for="${id}"><span>${e(p.label||'曝光 / Exposure')}</span><output for="${id}"></output><span class="ov-range__ruler" aria-hidden="true"><span class="ov-range__ticks">${Array.from({length:21},(_,i)=>`<i>${i%5===0?`<small>${+(min+(max-min)*i/20).toFixed(1)}</small>`:''}</i>`).join('')}</span><i class="ov-range__needle"></i></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${p.value??42}"><span class="ov-range__ends"><span>${e(p.minLabel||'收光')}</span><span>${e(p.maxLabel||'放光')}</span></span></label>`),input=root.querySelector('input'),out=root.querySelector('output');
    // The needle is a meter needle: it trails the thumb and settles with a slight overshoot. The number is always exact.
    const pct=v=>max===min?0:(v-min)/(max-min)*100;let tick=Math.round(pct(+input.value)/5);
    const needle=M.spring({preset:'snap',value:pct(O.model.range(input.value,min,max,step)),precision:.02,onUpdate:x=>root.style.setProperty('--needle',`${x}%`)});c.cleanup(()=>needle.stop());
    const update=(v,touched)=>{const value=O.model.range(v,min,max,step),at=pct(value);input.value=value;out.textContent=`${value}${p.unit||''}`;root.style.setProperty('--exposure',`${at}%`);needle.to(at);const t=Math.round(at/5);if(touched&&t!==tick)S.play('tick',{at:root,pitch:t%5===0?1.25:1,gain:t%5===0?1:.6});tick=t;input.setAttribute('aria-valuetext',`${value}${p.unit||''}`);c.emit({value});};
    c.listen(input,'input',()=>update(input.value,true));c.setValue=update;update(input.value);needle.set(pct(+input.value));return root;
  });
  O.define('Stepper',(p,c)=>{let value=p.value??3,min=p.min??1,max=p.max??12;const root=html(`<div class="ov-stepper"><span>${e(p.label||'印刷份数')}</span><div><button class="ov-icon-button" aria-label="减少">${icon('minus')}</button><output aria-live="polite"></output><button class="ov-icon-button" aria-label="增加">${icon('plus')}</button></div></div>`),b=root.querySelectorAll('button'),out=root.querySelector('output');const set=(v,touched)=>{const next=O.model.range(v,min,max,1),dir=Math.sign(next-value)||1;value=next;M.count(out,String(value).padStart(2,'0'),dir);if(touched)S.play('tick',{at:out});b[0].disabled=value===min;b[1].disabled=value===max;c.emit({value});};c.listen(b[0],'click',()=>set(value-1,true));c.listen(b[1],'click',()=>set(value+1,true));c.setValue=set;set(value);return root;});
  O.define('TagInput',(p,c)=>{
    let tags=O.model.tags(p.value||['舞台','逆光']);const root=html(`<div class="ov-field"><label for="${O.uid('tag')}">${e(p.label||'作品关键词')}</label><div class="ov-tag-input"><span></span><input aria-label="添加关键词" placeholder="输入后按 Enter" maxlength="24"></div><small>Enter 添加，Backspace 移除最后一项；最多 12 项。</small></div>`),input=root.querySelector('input'),list=root.querySelector('.ov-tag-input>span');root.querySelector('label').htmlFor=input.id=O.uid('tag-input');
    // Tags keep their identity: survivors slide to their new places, a new one develops in, a removed one is cut away.
    const draw=()=>{list.replaceChildren(...tags.map(v=>{const b=html(`<button type="button" class="ov-tag" data-key="${e(v)}" aria-label="移除 ${e(v)}">${e(v)}${icon('close')}</button>`);b.addEventListener('click',()=>remove(v,true));return b;}));};
    const update=()=>{M.flip(root.querySelector('.ov-tag-input'),'.ov-tag',draw);c.emit({value:[...tags]});};
    function remove(v,refocus){const b=[...list.children].find(x=>x.dataset.key===v);if(!b||b.dataset.leaving)return;b.dataset.leaving='1';S.play('tick',{at:b,pitch:.8});const done=()=>{tags=tags.filter(t=>t!==v);update();if(refocus)input.focus();};if(O.reduced()||!b.animate){done();return;}b.style.pointerEvents='none';b.animate([{clipPath:'inset(0 0 0 0)',opacity:1},{clipPath:'inset(0 100% 0 0)',opacity:0}],{duration:200,easing:M.exit,fill:'forwards'}).finished.then(done,done);}
    c.listen(input,'keydown',ev=>{if(ev.key==='Enter'||ev.key===','){ev.preventDefault();const before=tags.length;tags=O.model.tags([...tags,input.value]);input.value='';if(tags.length>before)S.play('tick',{at:input,pitch:1.15});update();}else if(ev.key==='Backspace'&&!input.value&&tags.length){remove(tags[tags.length-1]);}});c.setValue=v=>{tags=O.model.tags(v);update();};draw();c.emit({value:[...tags]});return root;
  });
  O.define('Dropzone',(p,c)=>{let url;const root=html(`<div class="ov-drop"><label class="ov-drop__target" tabindex="0">${icon('upload')}<strong>把照片放入取景框</strong><span>或选择本地文件</span><input type="file" accept="image/png,image/jpeg,image/webp"></label><p class="ov-help" role="status">PNG / JPEG / WebP · 最大 10 MB · 仅本机预览</p><img hidden alt="所选图片预览"></div>`),target=root.querySelector('label'),input=root.querySelector('input'),status=root.querySelector('p'),img=root.querySelector('img');const select=file=>{const error=O.model.file(file);if(error){status.textContent=error;status.classList.add('is-error');M.develop(status,{duration:480});c.emit({error});return;}if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);img.src=url;img.hidden=false;S.play('drop',{at:target});Promise.resolve(img.decode?.()).catch(()=>{}).then(()=>M.develop(img,{duration:900}));status.textContent=file.name;status.classList.remove('is-error');c.emit({fileName:file.name,size:file.size});};c.listen(input,'change',()=>{if(input.files[0])select(input.files[0]);});c.listen(target,'keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();input.click();}});['dragenter','dragover'].forEach(event=>c.listen(target,event,ev=>{ev.preventDefault();target.classList.add('is-dragging');}));['dragleave','drop'].forEach(event=>c.listen(target,event,ev=>{ev.preventDefault();target.classList.remove('is-dragging');if(event==='drop')select(ev.dataTransfer.files[0]);}));c.cleanup(()=>{if(url)URL.revokeObjectURL(url);});return root;});
})(globalThis.Overture);

(function(O){
  'use strict';const e=O.escape,icon=O.icon,html=O.html,M=O.motion,S=O.sound;
  const trigger=(label)=>`<button type="button" class="ov-button"><span>${e(label)}</span>${icon('arrow')}</button>`;
  O.define('Accordion',(p,c)=>{const items=p.items||[['把光线当作材料','不要为每个组件添加一束光。让聚焦、显影和选择各自有明确用途。'],['让状态可以被看见','选择用红色取景角锁定；确认用文字与完成标记一起表达。'],['给作品留下呼吸','大字、真实图像、少量细线。密集的操作界面也保留清楚的层级。']];const root=html(`<div class="ov-accordion">${items.map((v,i)=>`<details ${i===0?'open':''}><summary>${e(v[0])}${icon('plus')}</summary><p>${e(v[1])}</p></details>`).join('')}</div>`);root.querySelectorAll('details').forEach((d,i)=>{c.listen(d.querySelector('summary'),'click',()=>S.play('paper',{at:d,pitch:d.open?.85:1}));c.listen(d,'toggle',()=>c.emit({index:i,open:d.open}));});return root;});
  // Modal surfaces open from the control that asked for them and close back into it,
  // whichever way they are dismissed (button, cancel, Escape, backdrop, save).
  function modal(dialog,opener,c,{shape='circle',drawer=false,onClose}={}){
    let closing=null;
    const open=()=>{if(dialog.open&&!closing)return;closing=null;dialog.getAnimations().forEach(a=>{if(a.id!=='ov-iris')a.cancel();});dialog.classList.remove('is-closing');if(!dialog.open)dialog.showModal();S.play('paper',{at:opener});
      if(drawer){if(!O.reduced()){dialog.animate([{transform:'translateX(100%)'},{transform:'translateX(0)'}],{duration:M.time('settle'),easing:M.easing('settle')});[...dialog.children].forEach((el,i)=>el.animate([{transform:'translateX(56px)',opacity:0},{transform:'translateX(0)',opacity:1}],{duration:560,delay:90+i*45,easing:M.ease,fill:'backwards'}));}}
      else M.iris(dialog,{origin:opener,shape,duration:540});};
    const close=()=>{if(!dialog.open)return Promise.resolve();if(closing)return closing;dialog.classList.add('is-closing');S.play('paper',{at:opener,pitch:.8});
      const motion=O.reduced()?Promise.resolve():drawer?dialog.animate([{transform:'translateX(0)'},{transform:'translateX(100%)'}],{duration:280,easing:M.exit,fill:'forwards'}).finished.catch(()=>{}):M.iris(dialog,{open:false,origin:opener,shape,duration:300});
      closing=motion.then(()=>{if(!closing)return;closing=null;dialog.classList.remove('is-closing');if(dialog.open)dialog.close();M.release(dialog);dialog.getAnimations().forEach(a=>a.cancel());});return closing;};
    c.listen(dialog,'cancel',ev=>{ev.preventDefault();close();});
    c.listen(dialog,'click',ev=>{if(ev.target!==dialog)return;const r=dialog.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)close();});
    c.listen(dialog,'close',()=>{closing=null;dialog.classList.remove('is-closing');onClose?.();});
    c.cleanup(()=>{if(dialog.open)dialog.close();});
    return {open,close};
  }
  function overlay(p,c,drawer=false){
    const id=O.uid('dialog');const root=html(`<div class="ov-overlay-demo">${trigger(p.label||(drawer?'编辑画面说明':'保存这一幕'))}<p class="ov-help" role="status">${drawer?'侧边展开，保持当前作品的上下文。':'继续之前，确认这份创作的落款。'}</p><dialog class="ov-dialog ${drawer?'ov-drawer':''}" aria-labelledby="${id}"><button type="button" class="ov-icon-button ov-dialog__close" aria-label="关闭">${icon('close')}</button><h2 id="${id}">${e(p.title||(drawer?'Notes for the frame.':'Make it yours.'))}</h2><p>${drawer?'为这张作品补充一个标题和一句说明。内容只保留在当前页面。':'保存你为这一幕写下的标题。它会留在当前页面，供你继续调整。'}</p><label class="ov-field"><span>作品标题</span><input name="title" type="text" value="光的序曲" maxlength="60" required></label>${drawer?'<label class="ov-field"><span>画面说明</span><textarea name="note" rows="3" maxlength="180">在开幕前的一秒，让光先走进来。</textarea></label>':''}<div class="ov-dialog__actions"><button class="ov-button ov-button--solid" type="button" data-save>保存修改</button><button class="ov-text-link" type="button" data-cancel>取消</button></div></dialog></div>`),dialog=root.querySelector('dialog'),opener=root.firstElementChild,status=root.querySelector('.ov-help');
    const m=modal(dialog,opener,c,{drawer,onClose:()=>c.emit({open:false})});
    c.listen(opener,'click',()=>{m.open();c.emit({open:true});});root.querySelectorAll('[data-cancel],.ov-dialog__close').forEach(b=>c.listen(b,'click',()=>m.close()));
    c.listen(root.querySelector('[data-save]'),'click',()=>{const input=dialog.querySelector('input');if(!input.reportValidity())return;status.textContent=`已保存「${input.value}」`;M.develop(status,{duration:560,delay:220});c.emit({value:input.value,note:dialog.querySelector('textarea')?.value||'',saved:true});m.close();});return root;
  }
  O.define('Dialog',(p,c)=>overlay(p,c));O.define('Drawer',(p,c)=>overlay(p,c,true));
  O.define('Tooltip',(p,c)=>{const id=O.uid('tooltip');const root=html(`<div class="ov-tooltip-wrap"><button class="ov-icon-button" aria-label="查看取景说明" aria-describedby="${id}">${icon('frame')}</button><span id="${id}" role="tooltip" class="ov-tooltip">${e(p.text||'锁定选区，保留这一瞬。')}</span></div>`);c.listen(root,'keydown',ev=>{if(ev.key==='Escape')root.dataset.dismissed='true';});c.listen(root,'pointerleave',()=>delete root.dataset.dismissed);c.listen(root,'focusout',()=>delete root.dataset.dismissed);return root;});
  O.define('Popover',(p,c)=>{const id=O.uid('popover');const root=html(`<div class="ov-popover-demo"><button class="ov-button" type="button" aria-expanded="false" aria-controls="${id}"><span>取景选项</span>${icon('chevron')}</button><div class="ov-popover" id="${id}" hidden><h3>Frame settings</h3><label class="ov-check"><input type="checkbox" checked><span class="ov-check__box">${icon('check')}</span><span>显示取景边角</span></label><label class="ov-check"><input type="checkbox"><span class="ov-check__box">${icon('check')}</span><span>保持原始画幅</span></label></div></div>`),b=root.querySelector('button'),panel=root.querySelector('.ov-popover');
    // Opens from its trigger; closing folds back into it before the panel is hidden.
    const set=open=>{if(open===(b.getAttribute('aria-expanded')==='true'))return;b.setAttribute('aria-expanded',String(open));if(open){panel.hidden=false;M.iris(panel,{origin:b,duration:380});S.play('tick',{at:b});}else M.iris(panel,{open:false,origin:b,duration:220}).then(()=>{if(b.getAttribute('aria-expanded')==='false'){panel.hidden=true;M.release(panel);}});c.emit({open});};
    c.listen(b,'click',()=>set(b.getAttribute('aria-expanded')!=='true'));c.listen(document,'pointerdown',ev=>{if(!root.contains(ev.target))set(false);});c.listen(root,'keydown',ev=>{if(ev.key==='Escape'){set(false);b.focus();}});panel.querySelectorAll('input').forEach((input,i)=>c.listen(input,'change',()=>{S.play('tick',{at:input.parentElement});c.emit({option:i,value:input.checked});}));return root;});
  O.define('CommandPalette',(p,c)=>{const id=O.uid('command');const actions=p.actions||[{label:'打开摄影档案',value:'photography'},{label:'进入品牌工坊',value:'brand'},{label:'切换纸面主题',value:'paper'},{label:'调整共振强度',value:'resonance'},{label:'导出当前画面',value:'export'}];let filtered=actions,index=0;
    const root=html(`<div class="ov-overlay-demo">${trigger('寻找一个动作')}<p class="ov-help" role="status">搜索名称，方向键选择，Enter 执行。</p><dialog class="ov-dialog ov-command" aria-label="寻找动作"><label>${icon('search')}<input type="search" placeholder="想做些什么？" aria-label="搜索动作" aria-controls="${id}" autocomplete="off"><button class="ov-icon-button ov-dialog__close" aria-label="关闭搜索">${icon('close')}</button></label><div class="ov-command__list" id="${id}" role="listbox" aria-label="匹配动作"></div></dialog></div>`),dialog=root.querySelector('dialog'),input=root.querySelector('input'),list=root.querySelector('.ov-command__list'),opener=root.firstElementChild;
    const m=modal(dialog,opener,c,{shape:'circle'});
    function run(action){root.querySelector('.ov-help').textContent=`已选择：${action.label}`;M.develop(root.querySelector('.ov-help'),{duration:520,delay:200});c.emit({value:action.value});p.onSelect?.(action.value);m.close();}
    function draw(stagger){filtered=actions.filter(a=>a.label.toLowerCase().includes(input.value.trim().toLowerCase()));index=0;list.replaceChildren();if(!filtered.length){list.append(html('<p class="ov-command__empty">没有匹配动作。试试“摄影”或“品牌”。</p>'));input.removeAttribute('aria-activedescendant');return;}filtered.forEach((action,i)=>{const b=html(`<button type="button" role="option" id="${id}-${i}" aria-selected="${i===0}">${e(action.label)}${icon('arrow')}</button>`);b.addEventListener('click',()=>run(action));list.append(b);if(stagger&&!O.reduced()&&i<6)b.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:420,delay:120+i*32,easing:M.ease,fill:'backwards'});});input.setAttribute('aria-activedescendant',`${id}-0`);}
    const choose=n=>{index=n;list.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-selected',String(i===index)));input.setAttribute('aria-activedescendant',`${id}-${index}`);S.play('tick',{at:list});};
    c.listen(opener,'click',()=>{input.value='';draw(true);m.open();input.focus();});c.listen(dialog.querySelector('button'),'click',()=>m.close());c.listen(input,'input',()=>draw(false));c.listen(input,'keydown',ev=>{if(!filtered.length)return;if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();choose((index+(ev.key==='ArrowDown'?1:-1)+filtered.length)%filtered.length);}if(ev.key==='Enter'){ev.preventDefault();run(filtered[index]);}});return root;
  });
  O.define('Toast',(p,c)=>{const root=html(`<div class="ov-toast-demo">${trigger('收藏这一帧')}<div class="ov-toast" role="status" hidden>${icon('check')}<span>已加入精选</span><button class="ov-text-link" type="button">撤销</button><button class="ov-icon-button" aria-label="关闭提示">${icon('close')}</button><i class="ov-toast__timer" aria-hidden="true"></i></div></div>`),toast=root.querySelector('.ov-toast'),label=toast.querySelector('span'),bar=toast.querySelector('.ov-toast__timer');
    // The exposure line under the message shows the time left; hovering or focusing pauses both.
    let timer=0,meter=null,left=0,since=0,held=false;
    const arm=ms=>{clearTimeout(timer);meter?.cancel();left=ms;since=performance.now();meter=bar.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:ms,fill:'forwards'});if(held)meter.pause();else timer=setTimeout(hide,ms);};
    function hold(on){if(on===held)return;held=on;if(!meter||toast.hidden)return;if(on){clearTimeout(timer);left=Math.max(0,left-(performance.now()-since));meter.pause();}else{since=performance.now();timer=setTimeout(hide,left);meter.play();}}
    function hide(){clearTimeout(timer);if(toast.hidden)return;M.iris(toast,{open:false,shape:'shutter',duration:240}).then(ok=>{if(ok===false&&!O.reduced())return;toast.hidden=true;held=false;M.release(toast);});}
    c.listen(root.firstElementChild,'click',()=>{const was=!toast.hidden;toast.hidden=false;M.count(label,'已加入精选',1);if(!was||toast.getAnimations().length){M.iris(toast,{shape:'shutter',duration:460});M.imprint(toast.querySelector('svg'));}S.play('tick',{at:toast,pitch:1.15});c.emit({saved:true});arm(6000);});
    const bs=toast.querySelectorAll('button');c.listen(bs[0],'click',()=>{M.count(label,'已撤销收藏',-1);S.play('tick',{at:toast,pitch:.85});c.emit({saved:false});arm(2200);});c.listen(bs[1],'click',hide);
    c.listen(toast,'pointerenter',()=>hold(true));c.listen(toast,'pointerleave',()=>{if(!toast.contains(document.activeElement))hold(false);});c.listen(toast,'focusin',()=>hold(true));c.listen(toast,'focusout',ev=>{if(!toast.contains(ev.relatedTarget)&&!toast.matches(':hover'))hold(false);});
    c.cleanup(()=>{clearTimeout(timer);meter?.cancel();});return root;});
  O.define('Notice',(p,c)=>{const root=html(`<div class="ov-notice" role="status">${icon('info')}<div><h3>${e(p.title||'照片尚未加入')}</h3><p>${e(p.message||'选择一张本地照片，即可完成这份作品。文件会留在你的设备上。')}</p><button class="ov-text-link" type="button">${e(p.action||'使用示例素材')}${icon('arrow')}</button></div></div>`);c.listen(root.querySelector('button'),'click',()=>{root.querySelector('h3').textContent='示例素材已就绪';root.querySelector('p').textContent='现在可以继续调整画面。';root.querySelector('button').disabled=true;root.classList.add('is-resolved');M.develop(root.querySelector('div'),{duration:620});S.play('tick',{at:root,pitch:1.15});c.emit({resolved:true});});return root;});
  O.define('Progress',(p,c)=>{let value=p.value??34,timer=null;const root=html(`<div class="ov-progress"><div class="ov-progress__labels"><span>显影进度</span><output>${value}%</output></div><div class="ov-progress__track" role="progressbar" aria-label="显影进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><i class="ov-progress__fill"></i></div><div class="ov-progress__steps"><span>EXPOSE</span><span>DEVELOP</span><span>FIX</span></div><div class="ov-demo-actions"><button class="ov-button" type="button">开始显影</button><button class="ov-text-link" type="button">重置</button></div><p class="ov-help" aria-live="polite"></p></div>`),track=root.querySelector('[role=progressbar]'),fill=root.querySelector('i'),out=root.querySelector('output'),bs=root.querySelectorAll('button');
    // Steps of 4 % arrive as one continuous development: a settling spring carries the fill, a cold glint marks its edge while running.
    const bar=M.spring({preset:'settle',value:value/100,precision:.0004,onUpdate:x=>{fill.style.transform=`scaleX(${Math.max(0,x)})`;root.style.setProperty('--head',Math.max(0,Math.min(1,x)));}});c.cleanup(()=>bar.stop());
    const set=v=>{value=O.model.clamp(v,0,100);track.setAttribute('aria-valuenow',Math.round(value));out.value=`${Math.round(value)}%`;bar.to(value/100);c.emit({value});};
    const running=on=>{root.dataset.running=String(on);};
    c.listen(bs[0],'click',()=>{if(timer){clearInterval(timer);timer=null;running(false);bs[0].textContent='继续显影';return;}if(value>=100)set(0);bs[0].textContent='暂停';running(true);root.querySelector('.ov-help').textContent='正在显影示例画面';timer=setInterval(()=>{set(value+4);if(value>=100){clearInterval(timer);timer=null;running(false);bs[0].textContent='重新显影';root.querySelector('.ov-help').textContent='显影完成，可以继续创作。';S.play('tick',{at:track,pitch:1.2});}},160);});c.listen(bs[1],'click',()=>{clearInterval(timer);timer=null;running(false);bs[0].textContent='开始显影';root.querySelector('.ov-help').textContent='';set(0);});c.setValue=set;c.cleanup(()=>clearInterval(timer));set(value);bar.set(value/100);return root;});
  O.define('Loading',(p,c)=>html(`<div class="ov-loading" role="status" aria-label="${e(p.label||'正在准备作品')}"><div class="ov-loading__iris">${icon('aperture')}</div><div class="ov-loading__lines" aria-hidden="true"><i></i><i></i><i></i></div><span class="ov-help">${e(p.label||'正在准备作品')}</span></div>`));
  O.define('EmptyState',(p,c)=>{const root=html(`<div class="ov-empty">${icon('frame')}<h3>${e(p.title||'The first frame.')}</h3><p>${e(p.message||'这里还没有精选。先放入一张让你停下来的照片。')}</p>${trigger('添加示例照片')}</div>`);c.listen(root.querySelector('button'),'click',()=>{root.querySelector('h3').textContent='A beginning.';root.querySelector('p').textContent='第一张精选已加入。';const image=document.createElement('img');image.src=O.asset('photos/hero-backstage.jpg');image.alt='示例：幕间的逆光';image.style.marginTop='24px';root.append(image);S.play('drop',{at:root});Promise.resolve(image.decode?.()).catch(()=>{}).then(()=>{M.iris(image,{shape:'unfold',duration:620});M.develop(image,{duration:1100});});root.querySelector('button').disabled=true;c.emit({empty:false});});return root;});
  O.define('EditorialTable',(p,c)=>{let direction=1,sortKey='title';const rows=p.rows||[{title:'幕间',category:'摄影',frames:12,state:'精选'},{title:'最后一束光',category:'歌剧',frames:8,state:'整理中'},{title:'红色的速度',category:'时装',frames:24,state:'精选'},{title:'衣料的声音',category:'时装',frames:16,state:'草稿'}];const root=html(`<div class="ov-table-wrap"><table class="ov-table"><caption class="ov-help" style="text-align:left;padding-bottom:18px">作品档案 · 点击标题或帧数排序</caption><thead><tr><th scope="col" aria-sort="none"><button data-key="title">作品${icon('chevron')}</button></th><th scope="col">领域</th><th scope="col" aria-sort="none"><button data-key="frames">帧数${icon('chevron')}</button></th><th scope="col">状态</th></tr></thead><tbody></tbody></table></div>`),body=root.querySelector('tbody');
    // Rows are kept, not rebuilt, so a new order is a movement of the same prints.
    const trs=new Map(rows.map((r,i)=>{const tr=html(`<table><tbody><tr data-key="${i}"><td>${e(r.title)}</td><td>${e(r.category)}</td><td>${e(r.frames)}</td><td><span class="ov-status">${e(r.state)}</span></td></tr></tbody></table>`).querySelector('tr');return [r,tr];}));
    function render(animate){const apply=()=>{for(const r of O.model.sort(rows,sortKey,direction))body.append(trs.get(r));};if(animate)M.flip(body,'tr',apply);else apply();root.querySelectorAll('th[aria-sort]').forEach(th=>th.setAttribute('aria-sort',th.querySelector('button').dataset.key===sortKey?(direction===1?'ascending':'descending'):'none'));}
    root.querySelectorAll('th button').forEach(b=>c.listen(b,'click',()=>{direction=sortKey===b.dataset.key?-direction:1;sortKey=b.dataset.key;S.play('paper',{at:b});render(true);c.emit({key:sortKey,direction});}));render(false);return root;});
  O.define('Timeline',(p,c)=>{const items=p.items||[['19:00','进入剧场','让视线适应黑暗。'],['19:30','第一幕','随着光线，找到观看的位置。'],['20:15','幕间','把刚才的一瞬记录下来。']];return html(`<ol class="ov-timeline">${items.map(v=>`<li><time>${e(v[0])}</time><div><strong>${e(v[1])}</strong><p>${e(v[2])}</p></div></li>`).join('')}</ol>`);});
})(globalThis.Overture);

(function(O){
  'use strict';
  const e=O.escape,icon=O.icon,html=O.html,M=O.motion,S=O.sound;
  let gpuModule;
  // A single-file build injects its own loader (the engine and three.js arrive as inline modules).
  function loadGPU(){return gpuModule??=(O.config.loadEngine?O.config.loadEngine():import(O.asset('engine.mjs')));}
  const photos=[['hero-backstage.jpg','幕间','PHOTOGRAPHY'],['stage-bow.jpg','谢幕','OPERA'],['red-silk.png','形与色','FASHION'],['runway.jpg','行走的光','FASHION'],['camera-hands.jpg','观看','PHOTOGRAPHY'],['backstage-mirror.jpg','镜中','OPERA']];
  O.photos=photos;
  function photo(v){return O.asset('photos/'+v);}
  function hookGPU(host,p,c){
    let engine=null,latest=p.value??.55,pointer=[.5,.5];
    const api={setValue(v){latest=v;engine?.setValue(v);},setPointer(x,y){pointer=[x,y];engine?.setPointer(x,y);},setActive(v){engine?.setActive(v);},setHover(v){engine?.setHover?.(v);},setOrigin(x,y){engine?.setOrigin?.(x,y);},setIris(v){engine?.setIris?.(v);},setBeam(x,y,v,k=1){pointer=[x,y];latest=v;if(engine?.setBeam)engine.setBeam(x,y,v,k);else if(engine){engine.setIris?.(k);engine.setValue(v);engine.setPointer(x,y);}},setPaused(v){engine?.setPaused(v);},capture(){return engine?.capture()||Promise.reject(new Error('画面还未就绪'));},get state(){return engine?.state||{backend:'loading'};},get engine(){return engine;}};
    loadGPU().then(async mod=>{if(!c.alive)return;engine=await mod.mountGPU(host,{...p,value:latest,backend:O.config.backend,onController:ctrl=>{engine=ctrl;ctrl.setPointer(...pointer);c.cleanup(()=>ctrl.destroy());},onBackend:backend=>{host.dataset.renderer=backend;c.emit({backend});}});if(!c.alive)engine.destroy();}).catch(err=>{host.dataset.renderer='static';host.dataset.gpuError=err.message;});
    host.ovGPU=api;return api;
  }
  O.gpu={mount:hookGPU,load:loadGPU};
  const local=(ev,el)=>{const r=el.getBoundingClientRect();return [(ev.clientX-r.left)/Math.max(1,r.width),(ev.clientY-r.top)/Math.max(1,r.height)];};
  O.define('ApertureStage',(p,c)=>{
    const root=html(`<div class="ov-aperture"><div class="ov-gpu ov-aperture__scene"><img class="ov-gpu-fallback" src="${photo('overture-art.png')}" alt="丝绸光圈中的歌剧舞台"></div>${p.chrome===false?'':`<div class="ov-aperture__caption"><span>Light. Emotion. Form.</span><button type="button" class="ov-button ov-button--circle"><span>ENTER</span></button></div><label class="ov-aperture__scrub"><span>开幕</span><input aria-label="光圈开度" type="range" min="0" max="100" value="74"><span>进入</span></label>`}</div>`);
    const scene=root.querySelector('.ov-gpu'),gpu=hookGPU(scene,{type:'aperture',src:photo('overture-art.png'),value:.74},c);root.ovGPU=gpu;
    // The aperture has mass: ENTER opens it over the stage spring; the ring and scroll follow it without snapping.
    const opening=M.spring({preset:'stage',value:.74,precision:.0004,onUpdate:v=>gpu.setValue(v)}),look=M.spring({preset:'settle',value:[.5,.5],precision:.0005,onUpdate:([x,y])=>gpu.setPointer(x,y)});c.cleanup(()=>{opening.stop();look.stop();});
    c.listen(scene,'pointermove',ev=>look.to(local(ev,scene)));c.listen(scene,'pointerleave',()=>look.to([.5,.5]));
    const slider=root.querySelector('input');if(slider)c.listen(slider,'input',()=>{opening.to(+slider.value/100,{preset:'snap'});c.emit({value:+slider.value});});
    const b=root.querySelector('button');if(b)c.listen(b,'click',()=>{const open=b.dataset.open!=='true';b.dataset.open=open;opening.to(open?1:.35,{preset:'stage'});S.play('iris',{at:b});slider.value=open?100:35;b.querySelector('span').textContent=open?'RETURN':'ENTER';c.emit({open});});
    c.setValue=v=>{opening.to(+v/100,{preset:'settle'});if(slider)slider.value=v;};root.ovAperture=opening;return root;
  });
  O.define('DevelopImage',(p,c)=>{const src=p.src||photo('red-silk.png');const root=html(`<button type="button" class="ov-develop" aria-label="${e(p.label||'显影并选择照片')}" aria-pressed="false"><span class="ov-gpu"><img class="ov-gpu-fallback" src="${e(src)}" alt="${e(p.alt||'红色褶皱时装摄影')}"></span><span class="ov-focus-corners"></span><span class="ov-image-caption">${e(p.caption||'FORM / 003')}</span></button>`),scene=root.querySelector('.ov-gpu'),gpu=hookGPU(scene,{type:'develop',src},c);let chosen=false,inside=false,last=[.5,.5];
    // The pool of developer trails the pointer, grows in on arrival and shrinks away on exit;
    // choosing floods the whole frame from the point that was pressed.
    const follow=M.spring({preset:'settle',value:[.5,.5],precision:.0005,onUpdate:([x,y])=>gpu.setPointer(x,y)}),pool=M.spring({preset:'settle',value:0,precision:.001,onUpdate:v=>gpu.setHover(v)}),flood=M.spring({preset:'stage',value:0,precision:.0008,onUpdate:v=>gpu.setActive(v)});c.cleanup(()=>[follow,pool,flood].forEach(s=>s.stop()));
    c.listen(root,'pointermove',ev=>{last=local(ev,root);if(!inside){inside=true;follow.set(last);}else follow.to(last);pool.to(1);});
    c.listen(root,'pointerleave',()=>{inside=false;pool.to(0);});
    c.listen(root,'focus',()=>{if(!root.matches(':focus-visible'))return;gpu.setOrigin(.5,.5);flood.to(1);});c.listen(root,'blur',()=>flood.to(chosen?1:0));
    c.listen(root,'click',ev=>{chosen=!chosen;root.setAttribute('aria-pressed',String(chosen));const at=ev.detail?last:[.5,.5];gpu.setOrigin(...at);flood.to(chosen?1:0);S.play('paper',{at:root,pitch:chosen?1:.8});c.emit({value:chosen});});return root;
  });
  O.define('CompareLens',(p,c)=>{const src=p.src||photo('red-silk.png');const id=O.uid('compare');const root=html(`<div class="ov-compare" style="--split:50%"><img src="${e(src)}" alt="黑白版本" class="ov-compare__base"><div class="ov-compare__color"><img src="${e(src)}" alt="彩色版本"></div><span class="ov-compare__line">${icon('frame')}</span><span class="ov-compare__label">MONOCHROME</span><span class="ov-compare__label ov-compare__label--right">DEVELOPED</span><input id="${id}" type="range" min="0" max="100" value="50" aria-label="黑白与彩色比较分界"></div>`),input=root.querySelector('input');const edge=M.spring({preset:'snap',value:50,precision:.02,onUpdate:v=>root.style.setProperty('--split',`${v}%`)});c.cleanup(()=>edge.stop());const set=v=>{input.value=O.model.clamp(v,0,100);edge.to(+input.value);input.setAttribute('aria-valuetext',`彩色区域 ${input.value}%`);c.emit({value:+input.value});};c.listen(input,'input',()=>set(input.value));c.setValue=set;return root;});
  O.define('FocusGallery',(p,c)=>{
    const items=p.items||photos.slice(0,4);let index=0,from=null,leaving=null;const id=O.uid('gallery');const root=html(`<div class="ov-gallery"><div class="ov-gallery__grid">${items.map((v,i)=>`<button type="button" aria-label="放大 ${e(v[1])}"><img src="${photo(v[0])}" alt="${e(v[1])}"><span class="ov-focus-corners"></span><span>${e(v[1])}</span></button>`).join('')}</div><dialog class="ov-lightbox" aria-label="照片查看器"><button type="button" class="ov-icon-button ov-dialog__close" aria-label="关闭照片">${icon('close')}</button><button type="button" class="ov-icon-button ov-lightbox__previous" aria-label="上一张">${icon('back')}</button><figure><img alt=""><figcaption aria-live="polite"></figcaption></figure><button type="button" class="ov-icon-button ov-lightbox__next" aria-label="下一张">${icon('next')}</button></dialog></div>`),dialog=root.querySelector('dialog'),thumbs=[...root.querySelectorAll('.ov-gallery__grid>button')],big=dialog.querySelector('figure img');
    const show=(n,dir=0)=>{index=(n+items.length)%items.length;big.src=photo(items[index][0]);big.alt=items[index][1];dialog.querySelector('figcaption').textContent=`${items[index][1]} · ${index+1} / ${items.length}`;if(dir&&!O.reduced()){big.animate([{transform:`translateX(${dir*48}px)`,opacity:0},{transform:'translateX(0)',opacity:1}],{duration:M.time('settle'),easing:M.easing('settle')});M.develop(big,{duration:760,from:'gray'});S.play('paper',{at:big,pitch:dir>0?1.05:.95});}c.emit({index});};
    // The print leaves the sheet and flies to the light table; closing flies it back to its place.
    const fitted=()=>{const box=big.getBoundingClientRect(),ratio=(big.naturalWidth/big.naturalHeight)||box.width/Math.max(1,box.height);let w=box.width,h=w/ratio;if(h>box.height){h=box.height;w=h*ratio;}return {left:box.left+(box.width-w)/2,top:box.top+(box.height-h)/2,width:w,height:h};};
    function fly(a,b,reverse){if(O.reduced()||!a||!b.width)return Promise.resolve();const proxy=document.createElement('img');proxy.src=big.src;proxy.alt='';proxy.className='ov-flight';dialog.append(proxy);big.style.opacity='0';const box=r=>({left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});const frames=[{...box(a),filter:'grayscale(1)'},{...box(b),filter:'grayscale(0)'}];if(reverse)frames.reverse();return proxy.animate(frames,{duration:reverse?360:M.time('stage'),easing:reverse?M.exit:M.easing('settle'),fill:'forwards'}).finished.catch(()=>{}).then(()=>{proxy.remove();big.style.opacity='';});}
    async function open(i){from=thumbs[i];show(i);leaving=null;dialog.classList.remove('is-closing');if(!O.reduced())big.style.opacity='0';if(!dialog.open)dialog.showModal();S.play('paper',{at:from});if(O.reduced())return;await Promise.resolve(big.decode?.()).catch(()=>{});if(dialog.open&&!leaving)await fly(from.querySelector('img').getBoundingClientRect(),fitted(),false);big.style.opacity='';}
    function close(){if(!dialog.open||leaving)return leaving;const back=thumbs[index],r=back.querySelector('img').getBoundingClientRect(),visible=r.bottom>0&&r.top<innerHeight;dialog.classList.add('is-closing');S.play('paper',{at:back,pitch:.8});leaving=(visible?fly(r,fitted(),true):Promise.resolve()).then(()=>{if(!leaving)return;leaving=null;dialog.classList.remove('is-closing');if(dialog.open)dialog.close();});return leaving;}
    thumbs.forEach((b,i)=>c.listen(b,'click',()=>open(i)));c.listen(dialog.querySelector('.ov-dialog__close'),'click',close);c.listen(dialog.querySelector('.ov-lightbox__previous'),'click',()=>show(index-1,-1));c.listen(dialog.querySelector('.ov-lightbox__next'),'click',()=>show(index+1,1));c.listen(dialog,'keydown',ev=>{if(ev.key==='ArrowRight')show(index+1,1);if(ev.key==='ArrowLeft')show(index-1,-1);});c.listen(dialog,'cancel',ev=>{ev.preventDefault();close();});c.listen(dialog,'click',ev=>{if(ev.target===dialog)close();});c.listen(dialog,'close',()=>{leaving=null;dialog.classList.remove('is-closing');big.style.opacity='';dialog.querySelectorAll('.ov-flight').forEach(x=>x.remove());});c.cleanup(()=>{if(dialog.open)dialog.close();});return root;
  });
  O.define('SilkResonance',(p,c)=>{
    let value=p.value??56,paused=false,drag;
    const root=html(`<div class="ov-silk"><div class="ov-gpu ov-silk__scene" tabindex="0" role="slider" aria-label="丝绸张力，左右方向键调整" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><img class="ov-silk-fallback" src="${photo('resonance-silk.png')}" alt="象牙色半透明褶皱丝绸与红色缝线"><span class="ov-focus-corners"></span><span class="ov-silk-loupe" aria-hidden="true"><img src="${photo('resonance-silk.png')}" alt=""><i></i></span></div>${p.chrome===false?'':`<div class="ov-silk__controls"><label>张力 <output>${value}</output><input type="range" min="0" max="100" value="${value}" aria-label="褶皱张力"></label><button class="ov-icon-button" aria-label="凝住这一瞬" aria-pressed="false">${icon('pause')}</button><button class="ov-icon-button" aria-label="下载雕塑图片">${icon('download')}</button></div><p class="ov-help" role="status">拖动衣料后松手，它会按张力回荡 · 凝住会停在回荡中途</p>`}</div>`),scene=root.querySelector('.ov-gpu'),gpu=hookGPU(scene,{type:'silk',src:photo('resonance-silk.png'),value:value/100},c);root.ovGPU=gpu;
    // Tension is a lightly damped spring: a release carries its velocity past the new tension and rings out.
    // Freezing holds the exact displacement and velocity; thawing lets the same ring continue.
    const tension=M.spring({preset:'resonance',value:value/100,precision:.0004,onUpdate:v=>gpu.setValue(v)}),look=M.spring({preset:'settle',value:[.5,.5],precision:.0005,onUpdate:([x,y])=>gpu.setPointer(x,y)});c.cleanup(()=>{tension.stop();look.stop();});
    const slider=root.querySelector('input'),output=root.querySelector('output');const set=(n,o={})=>{value=O.model.clamp(n,0,100);tension.to(value/100,o);scene.setAttribute('aria-valuenow',String(Math.round(value)));if(slider)slider.value=value;if(output)output.value=Math.round(value);c.emit({value});};
    if(slider){c.listen(slider,'input',()=>set(+slider.value,{preset:'snap'}));c.listen(slider,'change',()=>set(+slider.value,{preset:'resonance'}));}
    c.listen(scene,'pointermove',ev=>{const [x,y]=local(ev,scene),r=scene.getBoundingClientRect();look.to([x,y]);scene.style.setProperty('--loupe-x',Math.max(10,Math.min(78,x*100))+'%');scene.style.setProperty('--loupe-y',Math.max(8,Math.min(58,y*100))+'%');if(drag){const now=performance.now(),next=drag.value+(ev.clientX-drag.x)/r.width*90;drag.v=drag.v*.5+((next-drag.last)/Math.max(8,now-drag.t))*500;drag.t=now;drag.last=next;set(next,{preset:'snap'});}});
    c.listen(scene,'pointerleave',()=>{if(!drag)look.to([.5,.5]);});
    c.listen(scene,'pointerdown',ev=>{if(ev.button!==0)return;drag={x:ev.clientX,value,last:value,t:performance.now(),v:0};scene.setPointerCapture(ev.pointerId);});
    ['pointerup','pointercancel'].forEach(n=>c.listen(scene,n,()=>{if(!drag)return;const v=drag.v;drag=null;tension.to(value/100,{preset:'resonance'});if(Math.abs(v)>20)S.play('silk',{at:scene,gain:Math.min(1.4,Math.abs(v)/160)});}));
    c.listen(scene,'keydown',ev=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(ev.key)){ev.preventDefault();set(ev.key==='Home'?0:ev.key==='End'?100:value+(['ArrowRight','ArrowUp'].includes(ev.key)?5:-5),{preset:'resonance'});}});
    const bs=root.querySelectorAll('button');if(bs.length){c.listen(bs[0],'click',()=>{paused=!paused;tension.freeze(paused);gpu.setPaused(paused);S.play(paused?'shutter':'tick',{at:bs[0]});bs[0].setAttribute('aria-pressed',String(paused));bs[0].setAttribute('aria-label',paused?'继续共振':'凝住这一瞬');bs[0].innerHTML=icon(paused?'play':'pause');c.emit({paused});});c.listen(bs[1],'click',async()=>{try{const canvas=await gpu.capture();canvas.toBlob(blob=>{if(blob)O.download(blob,'overture-resonance.png');},'image/png');root.querySelector('.ov-help').textContent='这一瞬已导出。';}catch(err){root.querySelector('.ov-help').textContent=err.message;}});}
    c.setValue=v=>set(v,{preset:'resonance'});root.ovSilk={get tension(){return tension.value;},get target(){return tension.target;},get velocity(){return tension.velocity;},get frozen(){return tension.frozen;}};return root;
  });
  O.define('CuePlayer',(p,c)=>{
    let audio=null,playing=false,starting=false,started=0,elapsed=0,raf=0;const length=12;
    const root=html(`<div class="ov-player"><button class="ov-button ov-button--circle" aria-label="播放合成音色示意">${icon('play')}</button><div><span>ÉTUDE / FOR SILK</span><p>三音共振 · 合成音色示意</p><input type="range" min="0" max="12" step=".1" value="0" aria-label="播放位置"><output>00:00 / 00:12</output></div><button class="ov-icon-button" aria-label="静音" aria-pressed="false">${icon('sound')}</button></div>`),bs=root.querySelectorAll('button'),range=root.querySelector('input'),out=root.querySelector('output');let muted=false;
    function stop(){playing=false;starting=false;cancelAnimationFrame(raf);if(audio){if(audio.state!=='closed')audio.close().catch(()=>{});audio=null;}root.ovGain=null;bs[0].innerHTML=icon('play');bs[0].setAttribute('aria-label','播放合成音色示意');c.emit({playing:false});}
    async function play(){if(starting)return;if(playing){stop();return;}starting=true;try{const Audio=window.AudioContext||window.webkitAudioContext;const context=new Audio();audio=context;await context.resume();if(!c.alive||audio!==context){if(context.state!=='closed')await context.close();return;}const gain=context.createGain();gain.gain.value=muted?0:.045;gain.connect(context.destination);root.ovGain=gain;[220,329.63,440].forEach((f,i)=>{const osc=context.createOscillator(),env=context.createGain();osc.type='sine';osc.frequency.value=f;env.gain.value=.7/(i+1);osc.connect(env).connect(gain);osc.start();});starting=false;playing=true;started=performance.now()-elapsed*1000;bs[0].innerHTML=icon('pause');bs[0].setAttribute('aria-label','暂停合成音色');c.emit({playing:true});function tick(){if(!playing)return;elapsed=(performance.now()-started)/1000;range.value=elapsed;out.value=`00:${String(Math.floor(elapsed)).padStart(2,'0')} / 00:12`;if(elapsed>=length){elapsed=0;range.value=0;out.value='00:00 / 00:12';stop();}else raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);}catch{out.value='此浏览器无法播放合成音色。';stop();}}
    c.listen(bs[0],'click',play);c.listen(bs[1],'click',()=>{muted=!muted;bs[1].setAttribute('aria-pressed',String(muted));bs[1].setAttribute('aria-label',muted?'取消静音':'静音');root.ovGain?.gain.setTargetAtTime(muted?0:.045,audio?.currentTime||0,.08);});c.listen(range,'input',()=>{elapsed=+range.value;started=performance.now()-elapsed*1000;out.value=`00:${String(Math.floor(elapsed)).padStart(2,'0')} / 00:12`;c.emit({position:elapsed});});c.cleanup(stop);return root;
  });
})(globalThis.Overture);

(function(O){
  'use strict';
  // Where a thrown strip comes to rest: its release position carried by velocity, rounded to a frame.
  O.model.filmRest=(offset,velocity,step,throwTime=.22)=>step>0?Math.round(-(offset+(Number(velocity)||0)*throwTime)/step):0;
  O.define('ContactSheet',(p,c)=>{
    const items=p.items?.length?p.items:O.photos,e=O.escape,photo=v=>O.asset('photos/'+v),M=O.motion,S=O.sound;
    let current=0,position=items.length,paused=p.autoplay===false,visible=false,hovered=false,focused=false,timer=0,resetTimer=0,drag=null,suppress=false,suppressTimer=0,transition=null,measureRaf=0;
    const interval=Math.max(1800,p.interval||4800);
    const frame=(v,i,copy)=>`<${copy===1?'button type="button"':'span aria-hidden="true"'} class="ov-film__frame" data-index="${i}" ${copy===1?`aria-pressed="${i===0}" aria-label="选择 ${e(v[1])}"`:''}><img src="${photo(v[0])}" alt="${copy===1?e(v[1]):''}" draggable="false"><span>${String(i+1).padStart(2,'0')} ${e(v[2])}</span></${copy===1?'button':'span'}>`;
    const sheet=(incoming=false)=>`<figure class="ov-contact__sheet${incoming?' ov-contact__incoming-sheet':''}" ${incoming?'aria-hidden="true"':''}><div class="ov-contact__print"><img src="${photo(items[0][0])}" alt="${incoming?'':e(items[0][1])}"></div><figcaption><span>${e(items[0][1])}</span><span>01 / ${String(items.length).padStart(2,'0')}</span></figcaption></figure>`;
    const root=O.html(`<div class="ov-contact"><div class="ov-film" role="group" aria-label="可拖动的循环底片带"><div class="ov-film__track">${[0,1,2].map(copy=>items.map((v,i)=>frame(v,i,copy)).join('')).join('')}</div></div><div class="ov-contact__selected"><section class="ov-contact__stack" aria-label="当前印相">${sheet()}${sheet(true)}</section><div><span class="ov-contact__rule"></span><p>一帧经过，<br>一瞬留下。</p></div></div><div class="ov-contact__transport"><button type="button" class="ov-icon-button" aria-label="上一张">${O.icon('back')}</button><button type="button" class="ov-contact__play" aria-label="暂停自动走片" aria-pressed="false">${O.icon('pause','ov-pause-icon')}${O.icon('play','ov-play-icon')}<span class="ov-contact__play-label">自动走片</span></button><button type="button" class="ov-icon-button" aria-label="下一张">${O.icon('next')}</button><span class="ov-contact__timer" aria-hidden="true"><i></i></span><span class="ov-contact__status" role="status"></span></div></div>`);
    const rail=root.querySelector('.ov-film'),track=root.querySelector('.ov-film__track'),frames=[...track.children],buttons=[...track.querySelectorAll('button')],stack=root.querySelector('.ov-contact__stack'),figure=stack.children[0],incoming=stack.children[1],play=root.querySelector('.ov-contact__play'),transport=root.querySelectorAll('.ov-contact__transport>.ov-icon-button'),meter=root.querySelector('.ov-contact__timer i');
    let animation=null,meterAnimation=null,carrierAnimation=null,step=190,width=175,passed=0,coasting=false;
    // The carrier is a sprung object: drags move it 1:1, releases and auto-advance hand their velocity to the settle spring.
    const carrier=M.spring({preset:'settle',value:0,precision:.2,onUpdate:x=>{track.style.transform=`translate3d(${x}px,0,0)`;const f=Math.floor(-x/step);if((drag||coasting)&&f!==passed){passed=f;S.play('tick',{at:rail});}},onRest:()=>{coasting=false;normalize();}});
    const home=()=>rail.clientWidth*.42-width/2;
    const offsetOf=pos=>home()-pos*step;
    function canRun(){return !paused&&!hovered&&!focused&&visible&&!document.hidden&&!O.reduced()&&items.length>1;}
    function schedule(){clearTimeout(timer);meterAnimation?.cancel();const run=canRun();root.dataset.playing=String(run);play.setAttribute('aria-label',paused?'继续自动走片':'暂停自动走片');play.setAttribute('aria-pressed',String(paused));play.querySelector('.ov-contact__play-label').textContent=paused?'继续走片':O.reduced()?'手动走片':run?'自动走片':'停格观看';if(run){meterAnimation=meter.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:interval,fill:'forwards'});timer=setTimeout(()=>select(current+1,{auto:true,direction:1}),interval);}}
    function measure(){width=frames[0].offsetWidth||width;step=width+parseFloat(getComputedStyle(track).gap||0);}
    function center(animate=true,velocity){measure();const x=offsetOf(position);if(animate&&!O.reduced())carrier.to(x,velocity===undefined?{}:{velocity});else carrier.set(x);}
    // The strip repeats three times; once it rests, it is re-seated on the middle copy without a visible jump.
    function normalize(){clearTimeout(resetTimer);resetTimer=setTimeout(()=>{if(!c.alive||drag||carrier.moving)return;const home=items.length+current;if(position!==home){position=home;center(false);}},60);}
    function fillSheet(target,index){const img=target.querySelector('img'),caps=target.querySelectorAll('figcaption span');img.src=photo(items[index][0]);img.alt=target===figure?items[index][1]:'';caps[0].textContent=items[index][1];caps[1].textContent=`${String(index+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;}
    function finishImage(){animation?.cancel();transition?.cancel();carrierAnimation?.cancel();animation=transition=carrierAnimation=null;fillSheet(figure,current);incoming.style.opacity='0';root.dataset.transitioning='false';}
    function develop(next,direction){
      // Commit the interrupted target before starting the next physical print.
      finishImage();fillSheet(incoming,next);
      if(O.reduced()){fillSheet(figure,next);return;}
      incoming.style.opacity='1';root.dataset.transitioning='true';S.play('paper',{at:stack,pitch:direction>0?1.05:.95});
      const rest=getComputedStyle(figure).transform,railRest=getComputedStyle(rail).transform;
      animation=incoming.animate([{opacity:0,transform:`${rest} translate(${direction*34}%,18%) rotate(${direction*12}deg) scale(.93)`,filter:'brightness(1.14)'},{opacity:1,transform:rest,filter:'brightness(1)'}],{duration:1050,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
      transition=figure.animate([{opacity:1,transform:rest},{opacity:0,transform:`${rest} translate(${-direction*22}%,-12%) rotate(${-direction*9}deg) scale(.93)`}],{duration:700,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
      carrierAnimation=rail.animate([{transform:`${railRest} translateY(-5px) rotate(${-direction*.8}deg)`},{transform:railRest}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});
      const thisAnimation=animation;animation.onfinish=()=>{if(c.alive&&animation===thisAnimation)finishImage();};
    }
    function select(n,{auto=false,direction,focus=false,at,velocity}={}){
      clearTimeout(resetTimer);const next=((Math.round(Number(n)||0)%items.length)+items.length)%items.length,dir=direction??(next>=current?1:-1);
      if(next!==current)develop(next,dir);
      position=at??(auto?items.length+current+1:(Number(n)===current+1||Number(n)===current-1)?items.length+current+dir:items.length+next);current=next;root.dataset.index=String(current);
      frames.forEach(b=>{const selected=+b.dataset.index===current;b.classList.toggle('is-selected',selected);if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(selected));});
      center(true,velocity);
      if(focus)buttons[current].focus({preventScroll:true});if(!auto)root.querySelector('[role=status]').textContent=`${items[current][1]}，第 ${current+1} 张`;
      c.emit({index:current,value:items[current][1],autoplay:!paused});schedule();
    }
    c.listen(track,'click',ev=>{const frame=ev.target.closest('[data-index]');if(frame&&!suppress)select(+frame.dataset.index);});
    buttons.forEach((b,i)=>c.listen(b,'keydown',ev=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(ev.key)){ev.preventDefault();select(ev.key==='Home'?0:ev.key==='End'?items.length-1:i+(ev.key==='ArrowRight'?1:-1),{focus:true});}}));
    c.listen(transport[0],'click',()=>select(current-1,{direction:-1}));c.listen(transport[1],'click',()=>select(current+1,{direction:1}));
    c.listen(play,'click',()=>{paused=!paused;schedule();c.emit({paused});});
    // Direct manipulation: the strip follows the pointer, a throw carries on and snaps to the nearest frame.
    c.listen(rail,'pointerdown',ev=>{if(ev.button!==0)return;measure();drag={x:ev.clientX,id:ev.pointerId,from:carrier.value,t:performance.now(),lx:ev.clientX,v:0};passed=Math.floor(-drag.from/step);suppress=false;clearTimeout(timer);clearTimeout(resetTimer);carrier.stop();});
    c.listen(rail,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;const dx=ev.clientX-drag.x;if(!suppress&&Math.abs(dx)>8){suppress=true;try{rail.setPointerCapture(ev.pointerId);}catch{}}if(!suppress)return;const now=performance.now(),dt=Math.max(1,now-drag.t);drag.v=drag.v*.55+((ev.clientX-drag.lx)/dt*1000)*.45;drag.t=now;drag.lx=ev.clientX;carrier.set(drag.from+dx);});
    const release=ev=>{const d=drag;drag=null;if(d&&suppress&&ev.type==='pointerup'){const stale=performance.now()-d.t>90,v=stale?0:Math.max(-4200,Math.min(4200,d.v)),x=carrier.value,lead=home();let pos=O.model.filmRest(x-lead,v,step);pos=Math.max(Math.ceil(items.length*.5),Math.min(Math.floor(items.length*2.5),pos));const n=((pos%items.length)+items.length)%items.length,dir=Math.sign(pos-(items.length+current))||(v<0?1:-1);carrier.set(x);coasting=Math.abs(v)>300;select(n,{direction:dir,at:pos,velocity:v});}else if(d)center();clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>{suppress=false;},0);schedule();};
    c.listen(rail,'pointerup',release);c.listen(rail,'pointercancel',release);
    [rail,stack].forEach(target=>{c.listen(target,'pointerenter',()=>{hovered=true;schedule();});c.listen(target,'pointerleave',()=>{hovered=false;schedule();});});
    c.listen(root,'focusin',ev=>{focused=ev.target!==play&&!play.contains(ev.target);schedule();});c.listen(root,'focusout',ev=>{focused=root.contains(ev.relatedTarget)&&ev.relatedTarget!==play;schedule();});
    c.listen(document,'visibilitychange',schedule);c.listen(window,'ov:motion',()=>{if(O.reduced())finishImage();schedule();});
    const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.1});io.observe(root);
    const ro=new ResizeObserver(()=>{cancelAnimationFrame(measureRaf);measureRaf=requestAnimationFrame(()=>{if(!drag)center(false);});});ro.observe(rail);
    c.cleanup(()=>{io.disconnect();ro.disconnect();carrier.stop();clearTimeout(timer);clearTimeout(resetTimer);clearTimeout(suppressTimer);cancelAnimationFrame(measureRaf);animation?.cancel();transition?.cancel();carrierAnimation?.cancel();meterAnimation?.cancel();});
    c.setValue=n=>select(n);select(p.index??0);finishImage();center(false);return root;
  });
})(globalThis.Overture);

(function(O){
  'use strict';
  const e=O.escape,html=O.html,icon=O.icon,clamp=O.model.clamp,M=O.motion,S=O.sound;
  const layout=[[520,560,-7],[1190,360,6],[1810,810,-5],[2480,430,8],[3100,890,-6],[3760,560,5]];
  O.model.wallCamera=(progress,stops)=>{
    if(!stops.length)return {x:0,y:0,index:0};
    const position=clamp(progress)*(stops.length-1),from=Math.floor(position),to=Math.min(from+1,stops.length-1),t=position-from,s=t*t*(3-2*t);
    return {x:stops[from][0]+(stops[to][0]-stops[from][0])*s,y:stops[from][1]+(stops[to][1]-stops[from][1])*s,index:Math.round(position)};
  };
  // Small trackpad deltas accumulate; each large event is capped at one physical notch.
  O.model.wheelStep=(state={},delta=0,mode=0,notches=2)=>{
    if(!Number.isFinite(delta)||Math.abs(delta)<.5)return {...state,step:0};
    const direction=Math.sign(delta),unit=Math.min(1,Math.abs(delta)/(mode===1?3:mode===2?1:100));
    const pending=(state.direction===direction?state.pending||0:0)+unit;
    const ready=pending>=Math.max(1,Math.round(Number(notches)||2))-1e-6;
    return {direction,pending:ready?0:pending,step:ready?direction:0};
  };
  // A brush across a pinned print: horizontal pointer speed (px/ms) and where it was touched (0 = pin, 1 = foot)
  // become an angular kick in deg/s, bounded so a print never swings wildly.
  O.model.swingKick=(vx,lever=1,limit=40)=>Math.max(-limit,Math.min(limit,(Number(vx)||0)*clamp(lever,.15,1)*30));
  function light(host,c,value){
    const layer=html('<div class="ov-light-mask" aria-hidden="true"><div class="ov-light-fallback"></div></div>');host.append(layer);
    const gpu=O.gpu.mount(layer,{type:'light',value,dpr:1.25},c);let aperture=1;
    // Position, opening and iris (k) change together while a beam travels; the CSS fallback follows the same numbers.
    const set=(x,y,v=value,k=aperture)=>{value=v;aperture=k;layer.dataset.x=x;layer.dataset.y=y;layer.style.setProperty('--light-x',x*100+'%');layer.style.setProperty('--light-y',y*100+'%');layer.style.setProperty('--light-radius',(.3+v*.5)*k*Math.min(host.clientWidth,host.clientHeight)+'px');layer.style.setProperty('--light-ry',(.3+v*.5)*k*host.clientHeight/.92+'px');gpu.setBeam(x,y,v,k);};
    const ro=new ResizeObserver(()=>set(+(layer.dataset.x||.5),+(layer.dataset.y||.5)));ro.observe(host);c.cleanup(()=>ro.disconnect());
    return {set,gpu};
  }
  // Prints hang from their pin: a brush sets them swinging about the pin head, then they settle.
  function swingOnBrush(figures,c){
    let last=null;
    const springs=figures.map(el=>M.spring({preset:'swing',value:0,precision:.02,onUpdate:v=>el.style.setProperty('--swing',`${v.toFixed(2)}deg`)}));
    figures.forEach((el,i)=>{
      c.listen(el,'pointermove',ev=>{if(ev.pointerType==='touch')return;const t=performance.now();if(last&&last.el===el&&t-last.kick>110){const vx=(ev.clientX-last.x)/Math.max(8,t-last.t),r=el.getBoundingClientRect(),kick=O.model.swingKick(vx,(ev.clientY-r.top)/Math.max(1,r.height));if(Math.abs(kick)>6){const v=springs[i].velocity;springs[i].impulse(clamp(v+kick,-40,40)-v);last.kick=t;}}last={el,x:ev.clientX,t,kick:last?.el===el?last.kick:0};});
      c.listen(el,'pointerleave',()=>{last=null;});
    });
    c.cleanup(()=>springs.forEach(s=>s.stop()));
  }
  const pin=()=>'<span class="ov-wall__pin" aria-hidden="true"><img src="'+e(O.asset('photos/brass-pin.png'))+'" alt=""></span>';
  O.define('FlashlightFocus',(p,c)=>{
    const items=p.items?.length?p.items:O.photos,page=p.mode==='page';let value=clamp((p.value??25)/100),raf=0,current=0,shown=-1,stops=[],wheel={},touch=null;
    const root=html('<div class="ov-flashlight '+(page?'ov-flashlight--page':'')+'"><div class="ov-flashlight__scroller" tabindex="0" role="region" aria-label="三格滚轮切换追光照片，方向键逐张观看"><div class="ov-flashlight__journey"><div class="ov-flashlight__stage"><div class="ov-flashlight__word" aria-hidden="true">LOOK<br><em>CLOSER.</em></div><div class="ov-flashlight__photos">'+items.map((v,i)=>'<figure style="--order:'+i+';--photo-turn:'+[-8,4,-5,6,-4,7][i%6]+'deg">'+pin()+'<img src="'+e(O.asset('photos/'+v[0]))+'" alt="'+e(v[1])+'" draggable="false"><figcaption>'+String(i+1).padStart(2,'0')+' / '+e(v[2])+'</figcaption></figure>').join('')+'</div><span class="ov-flashlight__reticle" aria-hidden="true"></span><div class="ov-flashlight__caption"><span>墙不动，光向前。</span><strong>'+e(items[0][1])+'</strong></div><div class="ov-flashlight__hint">三格滚轮，一张照片 · 0 / 3</div><div class="ov-flashlight__progress" aria-hidden="true"><i></i></div></div></div></div><div class="ov-light-tools"><label>光束开度 <input type="range" min="0" max="100" value="'+value*100+'" aria-label="光束开度"><output>'+Math.round(value*100)+'%</output></label><button type="button" class="ov-icon-button" aria-label="光束移至上一张">'+icon('back')+'</button><button type="button" class="ov-icon-button" aria-label="光束移至下一张">'+icon('next')+'</button><span class="ov-help">方向键逐张观看</span></div></div>');
    const scroller=root.querySelector('.ov-flashlight__scroller'),stage=root.querySelector('.ov-flashlight__stage'),photos=[...root.querySelectorAll('figure')],range=root.querySelector('input'),out=root.querySelector('output'),buttons=root.querySelectorAll('button'),mask=light(stage,c,value),reticle=root.querySelector('.ov-flashlight__reticle'),fill=root.querySelector('.ov-flashlight__progress i'),hint=root.querySelector('.ov-flashlight__hint'),title=root.querySelector('strong');
    // The reticle is a focus ring: each pending notch turns it a third.
    // The beam is a sprung object: on the third notch it travels to the next photo centre, tightening a little on the way
    // and opening again on arrival. The six centres are its only resting places; reduced motion dissolves instead of travelling.
    const ring=M.spring({preset:'snap',value:0,precision:.05,onUpdate:v=>reticle.style.setProperty('--ring',`${v}deg`)}),beam=M.spring({preset:'settle',value:[.5,.5],precision:.0004,onUpdate:([x,y],[vx,vy])=>aim(x,y,Math.hypot(vx,vy))});c.cleanup(()=>{ring.stop();beam.stop();});
    function aim(x,y,speed=0){mask.set(x,y,value,1-Math.min(.3,speed*.25));reticle.style.left=x*100+'%';reticle.style.top=y*100+'%';}
    function measure(){const r=stage.getBoundingClientRect();stops=photos.map(el=>{const b=el.getBoundingClientRect();return [(b.left+b.width/2-r.left)/Math.max(1,r.width),(b.top+b.height/2-r.top)/Math.max(1,r.height)];});if(shown>=0&&stops[shown]){if(beam.moving)beam.to(stops[shown]);else beam.set(stops[shown]);}schedule();}
    function steer(n){const stop=stops[n];if(!stop)return;const first=shown<0;shown=n;ring.set(0);photos.forEach((el,i)=>el.classList.toggle('is-lit',i===n));if(first){beam.set(stop);return;}if(O.reduced()){M.dissolve(stage,()=>beam.set(stop),{duration:420,color:'#0b0907'});return;}S.play('cut',{at:stage});beam.to(stop,{preset:'settle'}).then(done=>{if(done&&c.alive)M.imprint(reticle);});}
    function draw(){raf=0;if(!c.alive)return;const [x,y]=stops[current]||[.5,.5],progress=current/Math.max(1,items.length-1);if(shown!==current)steer(current);else if(!beam.moving){const [bx,by]=beam.value;aim(bx,by);}fill.style.transform='scaleX('+progress+')';range.value=Math.round(value*100);out.value=Math.round(value*100)+'%';if(title.textContent!==items[current][1]){title.textContent=items[current][1];M.develop(title,{duration:620});}buttons[0].disabled=current===0;buttons[1].disabled=current===items.length-1;root.dataset.index=current;root.dataset.progress=progress.toFixed(4);c.emit({x:+x.toFixed(3),y:+y.toFixed(3),value:Math.round(value*100),progress:+progress.toFixed(4),index:current});}
    function schedule(){if(!raf)raf=requestAnimationFrame(draw);}
    function feedback(){const pending=wheel.pending||0,notch=Math.min(2,Math.floor(pending));root.dataset.wheelPending=pending.toFixed(2);hint.textContent='三格滚轮，一张照片 · '+notch+' / 3';ring.to(notch*30*(wheel.direction||1));c.emit({pending});}
    function go(n){const next=Math.round(clamp(n,0,items.length-1));wheel={};feedback();if(next!==current)ring.set(0);current=next;schedule();}
    function canMove(direction){return direction>0?current<items.length-1:current>0;}
    function align(){if(!page)return;const top=stage.getBoundingClientRect().top;if(Math.abs(top)>1)window.scrollTo({top:window.scrollY+top,behavior:'instant'});}
    c.listen(stage,'wheel',ev=>{if(ev.ctrlKey||Math.abs(ev.deltaX)>Math.abs(ev.deltaY)||Math.abs(ev.deltaY)<.5)return;const direction=Math.sign(ev.deltaY);if(!canMove(direction)){wheel={};feedback();return;}ev.preventDefault();align();wheel=O.model.wheelStep(wheel,ev.deltaY,ev.deltaMode,3);if(wheel.step)go(current+wheel.step);else{S.play('tick',{at:stage,pitch:.9+(wheel.pending||0)*.08});feedback();}},{passive:false});
    c.listen(stage,'touchstart',ev=>{touch=ev.touches.length===1?{x:ev.touches[0].clientX,y:ev.touches[0].clientY,dy:0,handled:false}:null;},{passive:true});
    c.listen(stage,'touchmove',ev=>{if(!touch||ev.touches.length!==1)return;const dy=touch.y-ev.touches[0].clientY,dx=touch.x-ev.touches[0].clientX;touch.dy=dy;if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)&&canMove(Math.sign(dy))){ev.preventDefault();touch.handled=true;}},{passive:false});
    c.listen(stage,'touchend',()=>{if(touch?.handled&&Math.abs(touch.dy)>35){align();go(current+Math.sign(touch.dy));}touch=null;});c.listen(stage,'touchcancel',()=>{touch=null;});
    c.listen(scroller,'keydown',ev=>{if(ev.target!==scroller)return;const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1,PageDown:1,PageUp:-1}[ev.key];if((direction&&canMove(direction))||ev.key==='Home'||ev.key==='End'){ev.preventDefault();go(ev.key==='Home'?0:ev.key==='End'?items.length-1:current+direction);}});
    c.listen(buttons[0],'click',()=>go(current-1));c.listen(buttons[1],'click',()=>go(current+1));c.listen(range,'input',()=>{value=+range.value/100;schedule();});c.listen(window,'ov:motion',schedule);
    swingOnBrush(photos,c);
    const ro=new ResizeObserver(measure);ro.observe(stage);photos.forEach(photo=>ro.observe(photo));c.cleanup(()=>{ro.disconnect();cancelAnimationFrame(raf);});c.setValue=n=>{value=clamp(n/100);schedule();};feedback();return root;
  });
  O.define('PinnedPhotoWall',(p,c)=>{
    const items=p.items?.length?p.items:O.photos,stops=items.map((_,i)=>[layout[i%6][0]+Math.floor(i/6)*3900,layout[i%6][1],layout[i%6][2]]),page=p.mode==='page';let position=0,speed=0,current=0,raf=0,wheel={},touch=null;
    const lines=stops.slice(1).map((to,i)=>{const from=stops[i];return '<path d="M'+from[0]+' '+(from[1]-216)+' Q'+(from[0]+to[0])/2+' '+(Math.max(from[1],to[1])-125)+' '+to[0]+' '+(to[1]-216)+'"/>';}).join('');
    const root=html('<div class="ov-wall ov-wall--step '+(page?'ov-wall--page':'')+'"><div class="ov-wall__scroller" tabindex="0" role="region" aria-label="两格滚轮切换一张照片，方向键逐张观看"><div class="ov-wall__journey"><div class="ov-wall__viewport"><div class="ov-wall__world"><svg class="ov-wall__threads" width="'+(stops.at(-1)[0]+700)+'" height="1500" aria-hidden="true">'+lines+'</svg><div class="ov-wall__type" aria-hidden="true">THE THREAD<br>BETWEEN US.</div>'+items.map((v,i)=>'<figure class="ov-wall__photo" style="left:'+stops[i][0]+'px;top:'+stops[i][1]+'px;--turn:'+stops[i][2]+'deg">'+pin()+'<img src="'+e(O.asset('photos/'+v[0]))+'" alt="'+e(v[1])+'" draggable="false"><figcaption><span>'+e(v[1])+'</span><span>'+String(i+1).padStart(2,'0')+' / '+e(v[2])+'</span></figcaption></figure>').join('')+'</div><div class="ov-wall__fixed"><h3>循着光，<br>遇见下一帧。</h3><div class="ov-wall__instruction"><span>两格滚轮，一张照片</span><span class="ov-wall__detents" aria-hidden="true"><i></i><i></i></span><span class="ov-wall__wheel-status">0 / 2</span></div><div class="ov-wall__caption"><span class="ov-wall__count">01</span><div><strong></strong><span>光留在这里，记忆向前。</span></div></div><div class="ov-wall__navigation"><button type="button" class="ov-icon-button" aria-label="上一张照片">'+icon('back')+'</button><button type="button" class="ov-icon-button" aria-label="下一张照片">'+icon('next')+'</button></div><div class="ov-wall__progress" aria-hidden="true"><i></i></div></div></div></div></div><div class="ov-wall__map" aria-label="照片墙索引">'+items.map((v,i)=>'<button type="button" aria-label="前往 '+e(v[1])+'" aria-current="'+(i===0)+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+e(v[1])+'</button>').join('')+'</div></div>');
    const scroller=root.querySelector('.ov-wall__scroller'),viewport=root.querySelector('.ov-wall__viewport'),world=root.querySelector('.ov-wall__world'),figures=[...root.querySelectorAll('figure')],indexes=[...root.querySelectorAll('.ov-wall__map button')],buttons=root.querySelectorAll('.ov-wall__navigation button'),fill=root.querySelector('.ov-wall__progress i'),mask=light(viewport,c,.72),status=root.querySelector('.ov-wall__wheel-status'),count=root.querySelector('.ov-wall__count'),caption=root.querySelector('.ov-wall__caption strong');
    // The camera is on the stage spring (~780 ms to rest). Chained inputs keep its velocity;
    // while it travels it eases back a little, and pushes in again as it arrives.
    const camera=M.spring({preset:'stage',value:0,precision:.0004,onUpdate:(x,v)=>{position=x;speed=v;draw();},onRest:()=>{root.dataset.moving='false';}});c.cleanup(()=>camera.stop());
    function canMove(direction){return direction>0?current<items.length-1:current>0;}
    function feedback(){const pending=wheel.pending||0;root.dataset.wheelPending=pending.toFixed(2);root.style.setProperty('--wheel-half',clamp(pending));status.textContent=pending>0?'1 / 2':'0 / 2';}
    function draw(){raf=0;if(!c.alive)return;
      const point=O.model.wallCamera(position/Math.max(1,items.length-1),stops),w=viewport.clientWidth,h=viewport.clientHeight,dolly=1-Math.min(.08,Math.abs(speed)*.03),scale=Math.min(1.1,w*.86/560,h*.77/470)*dolly;world.style.transform='translate3d('+(w/2-point.x*scale)+'px,'+(h/2-point.y*scale)+'px,0) scale('+scale+')';fill.style.transform='scaleX('+position/Math.max(1,items.length-1)+')';root.dataset.position=position.toFixed(4);
    }
    function schedule(){if(!raf)raf=requestAnimationFrame(draw);}
    function go(n){n=Math.round(clamp(n,0,items.length-1));wheel={};feedback();const dir=Math.sign(n-current)||1;current=n;root.dataset.index=current;M.count(count,String(current+1).padStart(2,'0'),dir);caption.textContent=items[current][1];figures.forEach((el,i)=>el.classList.toggle('is-current',i===current));indexes.forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));buttons[0].disabled=current===0;buttons[1].disabled=current===items.length-1;
      // Reduced motion: no camera travel; the viewport dissolves through the wall's darkness to the next photograph.
      if(Math.abs(position-n)<.001){camera.set(n);root.dataset.moving='false';}else if(O.reduced()){root.dataset.moving='false';M.dissolve(viewport,()=>camera.set(n),{duration:420,color:'#14100c'});}else{camera.to(n);root.dataset.moving='true';}c.emit({index:current,progress:current/Math.max(1,items.length-1),pending:0});
    }
    function align(){if(!page)return;const top=viewport.getBoundingClientRect().top;if(Math.abs(top)>1)window.scrollTo({top:window.scrollY+top,behavior:'instant'});}
    c.listen(viewport,'wheel',ev=>{if(ev.ctrlKey||Math.abs(ev.deltaX)>Math.abs(ev.deltaY)||Math.abs(ev.deltaY)<.5)return;const direction=Math.sign(ev.deltaY);if(!canMove(direction)){wheel={};feedback();return;}ev.preventDefault();align();wheel=O.model.wheelStep(wheel,ev.deltaY,ev.deltaMode);feedback();S.play('tick',{at:viewport,pitch:wheel.step?1.2:.95});if(wheel.step)go(current+wheel.step);else c.emit({pending:wheel.pending});},{passive:false});
    // Preserve native vertical page scrolling at both ends. An interior swipe advances one photo.
    c.listen(viewport,'touchstart',ev=>{if(ev.touches.length===1)touch={x:ev.touches[0].clientX,y:ev.touches[0].clientY,dy:0,handled:false};},{passive:true});
    c.listen(viewport,'touchmove',ev=>{if(!touch||ev.touches.length!==1)return;const dy=touch.y-ev.touches[0].clientY,dx=touch.x-ev.touches[0].clientX;touch.dy=dy;if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)&&canMove(Math.sign(dy))){ev.preventDefault();touch.handled=true;}},{passive:false});
    c.listen(viewport,'touchend',()=>{if(touch?.handled&&Math.abs(touch.dy)>35){align();go(current+Math.sign(touch.dy));}touch=null;});c.listen(viewport,'touchcancel',()=>{touch=null;});
    indexes.forEach((b,i)=>c.listen(b,'click',()=>go(i)));c.listen(buttons[0],'click',()=>go(current-1));c.listen(buttons[1],'click',()=>go(current+1));
    c.listen(scroller,'keydown',ev=>{if(ev.target!==scroller)return;const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1,PageDown:1,PageUp:-1}[ev.key];if((direction&&canMove(direction))||ev.key==='Home'||ev.key==='End'){ev.preventDefault();go(ev.key==='Home'?0:ev.key==='End'?items.length-1:current+direction);}});
    swingOnBrush(figures,c);
    const ro=new ResizeObserver(()=>{mask.set(.5,.5,.72);schedule();});ro.observe(viewport);c.cleanup(()=>{ro.disconnect();cancelAnimationFrame(raf);});c.listen(window,'ov:motion',()=>go(current));c.setValue=go;go(0);return root;
  });
})(globalThis.Overture);

(function(O){
  'use strict';
  const e=O.escape,html=O.html,icon=O.icon,M=O.motion,S=O.sound;
  // Film leaves the canister to the right; the spool turns by the pulled length over its radius.
  O.model.rollPull=(pull,min,max)=>Math.min(max,Math.max(min,Number.isFinite(+pull)?+pull:min));
  O.model.spoolTurn=(pull,min,max)=>max>min?O.model.rollPull(pull,min,max)/max:0;
  // A frame becomes a print once it is pulled clearly downward (or released over the table).
  O.model.printDrop=(dx,dy,overTable=false,threshold=64)=>!!overTable||(dy>threshold&&dy>Math.abs(dx)*.6);
  // Past either end the strip stretches with growing resistance and never more than `reach` pixels.
  O.model.rubber=(x,min,max,reach=140,k=.55)=>{if(!Number.isFinite(+x))return min;const over=d=>(1-1/(d*k/reach+1))*reach;return x<min?min-over(min-x):x>max?max+over(x-max):+x;};
  // The inverse: where the pointer would have to be for the strip to show x (grabbing a strip mid-bounce).
  O.model.unrubber=(x,min,max,reach=140,k=.55)=>{const back=o=>(1/(1-Math.min(.999,o/reach))-1)*reach/k;return x<min?min-back(min-x):x>max?max+back(x-max):+x;};
  const ROLL=[...(O.photos||[]),['dance-stage.jpg','光中起舞','OPERA'],['textile-panorama.png','褶','FASHION']];
  const TURN=[-4,3,-2,5,-3,2,-5,4];
  O.define('FilmCanister',(p,c)=>{
    const items=(p.items?.length?p.items:ROLL).slice(0,12),n=items.length,roll=p.roll||'ROLL 01',dates=p.dates||'FEB 2026 — JUN 2026';
    const pad=n=>String(n).padStart(2,'0');
    const root=html(`<div class="ov-roll"><div class="ov-roll__meta"><span>${e(roll)} · ${e(dates)}</span><span>${n} EXP · C-41</span><span class="ov-roll__table-label">${icon('chevron')}TABLE · 相纸桌面</span></div><div class="ov-roll__bench"><div class="ov-gpu ov-roll__canister" aria-hidden="true"><div class="ov-roll__can"><span class="ov-roll__label"><b>OVERTURE</b><strong>400</strong><small>COLOR NEGATIVE · C-41</small></span></div></div><div class="ov-roll__strip" tabindex="0" role="group" aria-label="胶片：左右方向键拉出或卷回；在照片上按回车，把它放到相纸桌面"><div class="ov-roll__track">${items.map((v,i)=>`<button type="button" class="ov-roll__frame" data-index="${i}" aria-label="第 ${i+1} 张 ${e(v[1])}：拖到桌面或按回车冲印"><span class="ov-roll__edge" aria-hidden="true">OVERTURE 400 ▸ ${pad(i+1)}A</span><img src="${e(O.asset('photos/'+v[0]))}" alt="" draggable="false"><span class="ov-roll__no" aria-hidden="true">${i%2?'▸'+pad(i+1):pad(i+1)}</span><span class="ov-focus-corners"></span></button>`).join('')}</div></div></div><div class="ov-roll__table" aria-label="相纸桌面"><p class="ov-roll__empty">把一帧向下拖到这里冲印</p></div><p class="ov-help" role="status">拖动胶片拉出底片 · 把一帧向下拖出，放到桌面冲印</p></div>`);
    const bench=root.querySelector('.ov-roll__bench'),can=root.querySelector('.ov-roll__canister'),strip=root.querySelector('.ov-roll__strip'),track=root.querySelector('.ov-roll__track'),frames=[...root.querySelectorAll('.ov-roll__frame')],table=root.querySelector('.ov-roll__table'),status=root.querySelector('[role=status]'),empty=root.querySelector('.ov-roll__empty');
    const gpu=O.gpu.mount(can,{type:'canister',value:.5,dpr:1.5},c);let turn0=null;root.ovGPU=gpu;
    let pull=0,min=0,max=1,pitch=1,raf=0,fling=null,drag=null,z=10,slot=0,suppress=false,notch=null;const out=new Map();
    // The ends of the strip are elastic: a fling that hits one hands its speed to a spring and bounces back.
    const band=M.spring({preset:'settle',value:0,precision:.3,onUpdate:x=>{pull=x;apply(true);}});
    function measure(){const f=frames[0].getBoundingClientRect(),g=parseFloat(getComputedStyle(track).columnGap)||26;pitch=f.width+g;min=pitch*.55;max=track.scrollWidth+40;if(!pull)pull=(p.pulled??3.2)*pitch;apply();}
    function apply(free){if(!free)pull=O.model.rollPull(pull,min,max);track.style.transform=`translate3d(${pull-track.scrollWidth}px,0,0)`;const turn=O.model.spoolTurn(pull,min,max);turn0??=turn;gpu.setValue(.5+(turn-turn0)*.5);can.style.setProperty('--turn',turn);root.dataset.pull=Math.round(pull);const f=Math.floor(O.model.rollPull(pull,min,max)/Math.max(1,pitch));if(notch!==null&&f!==notch)S.play('tick',{at:strip,pitch:.9});notch=f;}
    function emit(){c.emit({pull:Math.round(pull),turn:+O.model.spoolTurn(pull,min,max).toFixed(4),out:[...out.keys()].sort((a,b)=>a-b)});}
    function stopFling(){cancelAnimationFrame(raf);raf=0;fling=null;band.stop();}
    function bounce(to,v=0){band.set(pull);band.to(to,{velocity:v}).then(ok=>{if(ok)emit();});}
    function flingStep(){if(!fling||!c.alive)return;const now=performance.now(),dt=Math.min(.05,(now-fling.t)/1000);fling.t=now;fling.v*=Math.exp(-dt*5.5);pull+=fling.v*dt;if(pull<min||pull>max){const v=fling.v;cancelAnimationFrame(raf);raf=0;fling=null;bounce(pull<min?min:max,v*.55);return;}apply();if(Math.abs(fling.v)<12){stopFling();emit();return;}raf=requestAnimationFrame(flingStep);}
    const local=(x,y,el=root)=>{const r=el.getBoundingClientRect();return [x-r.left,y-r.top];};
    function makePrint(i){const v=items[i];const b=html(`<button type="button" class="ov-roll__print" data-index="${i}" aria-label="相纸 ${pad(i+1)} ${e(v[1])}：拖动摆放，回车放回胶片"><img src="${e(O.asset('photos/'+v[0]))}" alt="${e(v[1])}" draggable="false"><span><b>${pad(i+1)}</b><em>${e(v[1])}</em></span></button>`);return b;}
    function place(b,x,y,r){b.style.setProperty('--x',x+'px');b.style.setProperty('--y',y+'px');b.style.setProperty('--r',r+'deg');}
    function frameBox(i){const im=frames[i].querySelector('img').getBoundingClientRect(),t=table.getBoundingClientRect();return {x:im.left-t.left-8,y:im.top-t.top-8,w:im.width};}
    function flip(b,from,to,done){let finished=false;const fin=()=>{if(!finished){finished=true;done?.();}};if(O.reduced()||!b.animate){fin();return;}b.animate([{transform:`translate(${from.x}px,${from.y}px) rotate(${from.r||0}deg) scale(${from.s||1})`},{transform:`translate(${to.x}px,${to.y}px) rotate(${to.r||0}deg) scale(${to.s||1})`}],{duration:520,easing:'cubic-bezier(.16,1,.3,1)'}).onfinish=fin;c.timeout(fin,640);}
    // Landing: the print travels on a settle spring, its angle on a snap spring, and it squashes once on impact.
    function land(b,from,to){b.getAnimations().forEach(a=>a.cancel());b.classList.add('is-landing');const spot=M.spring({preset:'settle',value:[from.x,from.y],precision:.15}),turn=M.spring({preset:'snap',value:from.r,precision:.02});const paint=()=>{const [x,y]=spot.value;place(b,x,y,turn.value);};
      const moving=[spot,turn].map(s=>{s.to(s===spot?[to.x,to.y]:to.r);return s;});const tick=()=>{if(!b.isConnected)return;paint();if(moving.some(s=>s.moving))requestAnimationFrame(tick);else{place(b,to.x,to.y,to.r);b.classList.remove('is-landing');}};requestAnimationFrame(tick);
      if(!O.reduced())b.animate([{scale:'1.06'},{scale:'.962',offset:.3},{scale:'1'}],{duration:440,easing:'cubic-bezier(.3,.7,.3,1)'});S.play('drop',{at:b});}
    function develop(i,b,x,y,from){const r=TURN[i%TURN.length];const tw=table.clientWidth,th=table.clientHeight,w=b.offsetWidth||200,h=b.offsetHeight||170;x=Math.max(0,Math.min(tw-w,x));y=Math.max(0,Math.min(th-h,y));b.style.zIndex=++z;b.classList.remove('is-flying');b.style.removeProperty('--s');if(from&&!O.reduced())land(b,from,{x,y,r});else place(b,x,y,r);b.classList.add('is-developing');frames[i].classList.add('is-out');frames[i].setAttribute('aria-disabled','true');out.set(i,b);empty.hidden=true;table.classList.remove('is-target');status.textContent=`${pad(i+1)} ${items[i][1]} 已放到桌面，正在显影。`;emit();}
    function toTable(i){if(out.has(i))return;const b=makePrint(i);table.append(b);const f=frameBox(i),tw=table.clientWidth,w=b.offsetWidth,col=Math.max(1,Math.floor((tw-24)/(w*.72))),x=24+(slot%col)*w*.72,y=26+Math.floor(slot/col)%2*36;slot++;place(b,f.x,f.y,0);develop(i,b,x,y,{x:f.x,y:f.y,r:0});b.focus({preventScroll:true});}
    function toFilm(i){const b=out.get(i);if(!b)return;out.delete(i);const f=frameBox(i),x=parseFloat(b.style.getPropertyValue('--x'))||0,y=parseFloat(b.style.getPropertyValue('--y'))||0;b.style.pointerEvents='none';S.play('paper',{at:b,pitch:.85});flip(b,{x,y,r:TURN[i%TURN.length]},{x:f.x,y:f.y,s:.96},()=>{b.remove();frames[i].classList.remove('is-out');frames[i].removeAttribute('aria-disabled');empty.hidden=out.size>0;});place(b,f.x,f.y,0);status.textContent=`${pad(i+1)} 已放回胶片。`;frames[i].focus({preventScroll:true});emit();}
    // Pointer: horizontal drag pulls film; a mostly downward drag on a frame lifts it out as a print.
    c.listen(strip,'pointerdown',ev=>{if(ev.button!==0)return;stopFling();const frame=ev.target.closest('.ov-roll__frame');drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,lx:ev.clientX,t:performance.now(),v:0,start:O.model.unrubber(pull,min,max),frame:frame&&!frame.classList.contains('is-out')?+frame.dataset.index:-1,mode:null};});
    c.listen(window,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
      if(!drag.mode&&Math.hypot(dx,dy)>9){drag.mode=drag.frame>=0&&dy>Math.abs(dx)*.9?'print':'film';try{strip.setPointerCapture(ev.pointerId);}catch{}}
      if(drag.mode==='film'){const now=performance.now(),dt=Math.max(1,now-drag.t);drag.v=drag.v*.6+((ev.clientX-drag.lx)/dt*1000)*.4;drag.t=now;drag.lx=ev.clientX;pull=O.model.rubber(drag.start+dx,min,max);apply(true);suppress=true;}
      else if(drag.mode==='print'){suppress=true;if(!drag.print){const i=drag.frame,b=makePrint(i),f=frameBox(i);b.classList.add('is-flying');table.append(b);drag.print=b;drag.origin=f;drag.rot=0;drag.px=ev.clientX;frames[i].classList.add('is-out');S.play('paper',{at:b});}const [tx,ty]=local(ev.clientX,ev.clientY,table);const over=ty>0;table.classList.toggle('is-target',over);drag.rot=drag.rot*.8+Math.max(-14,Math.min(14,(ev.clientX-drag.px)*.9))*.2;drag.px=ev.clientX;place(drag.print,drag.origin.x+dx,drag.origin.y+dy,drag.rot);drag.print.style.setProperty('--s',1.06);}
    });
    const end=ev=>{if(!drag||ev.pointerId!==drag.id)return;const d=drag;drag=null;
      if(d.mode==='film'){const v=performance.now()-d.t>90?0:d.v;if(pull<min||pull>max)bounce(pull<min?min:max,v*.3);else if(!O.reduced()&&Math.abs(v)>120){fling={v,t:performance.now()};raf=requestAnimationFrame(flingStep);}else emit();}
      else if(d.mode==='print'&&d.print){const dx=ev.clientX-d.x,dy=ev.clientY-d.y,[,ty]=local(ev.clientX,ev.clientY,table);if(ev.type!=='pointercancel'&&O.model.printDrop(dx,dy,ty>0)){develop(d.frame,d.print,d.origin.x+dx,d.origin.y+dy,{x:d.origin.x+dx,y:d.origin.y+dy,r:d.rot});}else{const b=d.print;S.play('paper',{at:b,pitch:.8});flip(b,{x:d.origin.x+dx,y:d.origin.y+dy,r:d.rot},{x:d.origin.x,y:d.origin.y},()=>{b.remove();frames[d.frame].classList.remove('is-out');});place(b,d.origin.x,d.origin.y,0);table.classList.remove('is-target');}}
      setTimeout(()=>{suppress=false;},0);};
    c.listen(window,'pointerup',end);c.listen(window,'pointercancel',end);
    c.listen(strip,'click',ev=>{const frame=ev.target.closest('.ov-roll__frame');if(!frame||suppress)return;const i=+frame.dataset.index;if(!out.has(i))toTable(i);});
    c.listen(strip,'wheel',ev=>{const d=Math.abs(ev.deltaX)>Math.abs(ev.deltaY)?ev.deltaX:ev.shiftKey?ev.deltaY:0;if(!d)return;const next=O.model.rollPull(pull-d,min,max);if(next===pull)return;ev.preventDefault();stopFling();pull=next;apply();emit();},{passive:false});
    c.listen(strip,'keydown',ev=>{const k={ArrowRight:1,ArrowLeft:-1}[ev.key];if(k){ev.preventDefault();stopFling();const target=O.model.rollPull(pull+k*pitch,min,max);if(O.reduced()){pull=target;apply();emit();}else bounce(target);}else if(ev.key==='Home'||ev.key==='End'){ev.preventDefault();stopFling();const target=ev.key==='Home'?min:max;if(O.reduced()){pull=target;apply();emit();}else bounce(target);}});
    // Prints on the table: drag to rearrange, Enter / double-click / Backspace returns them to the roll.
    let move=null;
    c.listen(table,'pointerdown',ev=>{const b=ev.target.closest('.ov-roll__print');if(!b||ev.button!==0||b.classList.contains('is-flying'))return;move={b,id:ev.pointerId,x:ev.clientX,y:ev.clientY,ox:parseFloat(b.style.getPropertyValue('--x'))||0,oy:parseFloat(b.style.getPropertyValue('--y'))||0,r:parseFloat(b.style.getPropertyValue('--r'))||0,moved:false};b.style.zIndex=++z;b.setPointerCapture(ev.pointerId);b.classList.add('is-lifted');});
    c.listen(window,'pointermove',ev=>{if(!move||ev.pointerId!==move.id)return;const dx=ev.clientX-move.x,dy=ev.clientY-move.y;if(Math.hypot(dx,dy)>4)move.moved=true;const tw=table.clientWidth,th=table.clientHeight,w=move.b.offsetWidth,h=move.b.offsetHeight;place(move.b,Math.max(0,Math.min(tw-w,move.ox+dx)),Math.max(-h*.4,Math.min(th-h,move.oy+dy)),move.r);});
    const lift=ev=>{if(!move||ev.pointerId!==move.id)return;move.b.classList.remove('is-lifted');if(move.moved){move.b.dataset.moved='1';S.play('drop',{at:move.b,gain:.55});}move=null;};c.listen(window,'pointerup',lift);c.listen(window,'pointercancel',lift);
    c.listen(table,'click',ev=>{const b=ev.target.closest('.ov-roll__print');if(b&&b.dataset.moved){delete b.dataset.moved;ev.preventDefault();}});
    c.listen(table,'dblclick',ev=>{const b=ev.target.closest('.ov-roll__print');if(b)toFilm(+b.dataset.index);});
    c.listen(table,'keydown',ev=>{const b=ev.target.closest('.ov-roll__print');if(b&&['Enter',' ','Backspace','Delete'].includes(ev.key)){ev.preventDefault();toFilm(+b.dataset.index);}});
    c.listen(table,'animationend',ev=>ev.target.closest?.('.ov-roll__print')?.classList.remove('is-developing'));
    c.listen(can,'pointermove',ev=>{const r=can.getBoundingClientRect();gpu.setPointer((ev.clientX-r.left)/r.width,(ev.clientY-r.top)/r.height);});
    const ro=new ResizeObserver(measure);ro.observe(bench);c.cleanup(()=>{ro.disconnect();stopFling();});
    c.setValue=v=>{stopFling();pull=min+(max-min)*O.model.clamp(v/100);apply();emit();};
    root.ovRoll={toTable,toFilm,get pull(){return pull;},get out(){return [...out.keys()];}};
    return root;
  });
})(globalThis.Overture);

(function(O){
  'use strict';const e=O.escape,icon=O.icon,html=O.html;
  O.define('Wordmark',(p,c)=>html(`<div class="ov-wordmark">${e(p.name||'OVERTURE')}<small>${e(p.tagline||'LIGHT. EMOTION. FORM.')}</small></div>`));
  O.define('TypeSpecimen',(p,c)=>html(`<div class="ov-type-specimen"><p>${e(p.text||'A life in three acts.')}</p><p>用光去观察，用声音去感受，用形式去表达。<br>Bodoni Moda / Manrope / 中文系统字体</p></div>`));
  O.define('PullQuote',(p,c)=>html(`<blockquote class="ov-quote"><p>${e(p.text||'The way you look changes what you see.')}</p><footer>${e(p.source||'OVERTURE · 创作示例文案')}</footer></blockquote>`));
  O.define('Poster',(p,c)=>html(`<figure class="ov-poster"><img src="${e(p.src||O.asset('photos/red-silk.png'))}" alt="红色褶皱时装宣传示例"><figcaption class="ov-poster__type"><strong>${e(p.title||'THE\nRED\nACT').replaceAll('\n','<br>')}</strong><div><small>PHOTOGRAPHY<br>OPERA / FASHION</small><small>OVERTURE<br>视觉示例</small></div></figcaption></figure>`));
  // Two drapes (oxblood and indigo, alternating) close from both wings, the act changes behind them, and they part again.
  O.define('CurtainTransition',(p,c)=>{let act=0,busy=false;const root=html(`<div class="ov-curtain"><h3>Act I. The light.</h3><p>让转场成为内容的一次呼吸。</p><button class="ov-button" type="button">进入下一幕${icon('arrow')}</button><div class="ov-curtain__veil ov-curtain__veil--left" aria-hidden="true"></div><div class="ov-curtain__veil ov-curtain__veil--right" aria-hidden="true"></div></div>`);c.listen(root.querySelector('button'),'click',()=>{if(busy)return;busy=true;root.classList.remove('is-changing');void root.offsetWidth;root.classList.add('is-changing');root.style.setProperty('--veil',act%2?'#601018':'var(--ov-indigo)');root.style.setProperty('--veil-2',act%2?'var(--ov-indigo)':'#601018');O.sound.play('silk',{at:root,gain:.9});c.timeout(()=>{act=(act+1)%3;root.querySelector('h3').textContent=['Act I. The light.','Act II. The voice.','Act III. The form.'][act];c.emit({index:act});},O.reduced()?0:380);c.timeout(()=>{root.classList.remove('is-changing');busy=false;},O.reduced()?1:960);});return root;});

  const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('素材读取失败，请刷新重试。'));image.src=src;});
  function cover(ctx,image,x,y,w,h,pan=0){const ratio=Math.max(w/image.width,h/image.height),sw=w/ratio,sh=h/ratio,sx=(image.width-sw)*.5+pan*Math.min(image.width-sw,50);ctx.drawImage(image,sx,(image.height-sh)*.5,sw,sh,x,y,w,h);}
  function fit(ctx,text,maxWidth,start,min=20){let size=start;ctx.font=`400 ${size}px "Bodoni Moda", "SimSun", serif`;while(ctx.measureText(text).width>maxWidth&&size>min){size-=2;ctx.font=`400 ${size}px "Bodoni Moda", "SimSun", serif`;}return size;}
  O.define('BrandComposer',(p,c)=>{
    const id=O.uid('brand');let images=null,gpu=null,dirty=true,raf=0,recording=false,recorder=null,recordTimer=null,recordStarted=0,stream=null;
    const settings={title:p.title||'OVERTURE',subtitle:p.subtitle||'Light. Emotion. Form.',mode:'overture',format:'1920x1080',intensity:58};
    const root=html(`<div class="ov-composer"><div class="ov-composer__preview"><canvas aria-label="品牌画面实时预览"></canvas><div class="ov-composer__source" aria-hidden="true" style="position:absolute;inset:0;visibility:hidden;pointer-events:none"></div></div><div class="ov-composer__form"><label class="ov-field"><span>标题</span><input data-field="title" value="${e(settings.title)}" maxlength="40"></label><label class="ov-field"><span>副标题</span><input data-field="subtitle" value="${e(settings.subtitle)}" maxlength="100"></label><label class="ov-field"><span>视觉语言</span><span class="ov-select"><select data-field="mode"><option value="overture">序曲 · 光圈剧场</option><option value="contact">私藏 · 印纸与显影</option><option value="resonance">共鸣 · 褶皱雕塑</option><option value="nocturne">夜场 · 冷光剧场</option></select>${icon('chevron')}</span></label><label class="ov-field"><span>画幅</span><span class="ov-select"><select data-field="format"><option value="1920x1080">横幅 · 1920 × 1080</option><option value="1080x1350">海报 · 1080 × 1350</option><option value="1080x1920">竖屏 · 1080 × 1920</option><option value="1080x1080">方形 · 1080 × 1080</option></select>${icon('chevron')}</span></label><label class="ov-range"><span>动势 / 张力</span><output>58</output><input type="range" data-field="intensity" min="0" max="100" value="58" aria-label="品牌画面动势"></label><div class="ov-composer__actions"><button class="ov-button ov-button--solid" type="button" data-export="png" disabled>${icon('download')}<span>导出 PNG</span></button><button class="ov-button" type="button" data-export="video" disabled>${icon('play')}<span>录制 6 秒</span></button></div><p class="ov-help ov-composer__status" role="status">正在准备本地字体与素材……</p><p class="ov-help">示例素材由 AI 生成。导出在本机完成。动画录制为无声 WebM。</p></div></div>`),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),status=root.querySelector('[role=status]'),png=root.querySelector('[data-export=png]'),video=root.querySelector('[data-export=video]');
    const source=root.querySelector('.ov-composer__source');source.style.minHeight='380px';
    const gpuProxy=O.gpu.mount(source,{type:'silk',src:O.asset('photos/resonance-silk.png'),value:.58,dpr:1},c);gpu=gpuProxy;
    function dimensions(){const [w,h]=settings.format.split('x').map(Number);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
    function paint(now=0){
      if(!images)return;dimensions();const w=canvas.width,h=canvas.height,pad=w*.047,portrait=h>w,t=now/1000;
      const light=settings.mode==='contact',ink=light?'#201810':settings.mode==='nocturne'?'#ecf0f6':'#f1ebdf';ctx.fillStyle=light?'#eee8dc':settings.mode==='nocturne'?'#0a0f1f':'#090706';ctx.fillRect(0,0,w,h);
      if(settings.mode==='overture'){
        cover(ctx,images.overture,0,0,w,h,Math.sin(t*.22)*.25*(settings.intensity/100));
        ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(0,0,w,h);
      }else if(settings.mode==='nocturne'){
        // Nocturne: the opera plate re-lit by cold light, a warm follow-spot kept at its centre.
        cover(ctx,images.overture,0,0,w,h,Math.sin(t*.22)*.25*(settings.intensity/100));ctx.save();ctx.globalCompositeOperation='color';ctx.globalAlpha=.78;ctx.fillStyle='#2a4488';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;ctx.globalCompositeOperation='multiply';ctx.fillStyle='#9aa8d4';ctx.fillRect(0,0,w,h);ctx.restore();
        const cx=w*.59,cy=h*.55,r=Math.min(w,h)*(.2+settings.intensity/400);const g=ctx.createRadialGradient(cx,cy,r*.1,cx,cy,r);g.addColorStop(0,'rgba(255,206,156,.55)');g.addColorStop(1,'rgba(255,214,168,0)');ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();
        ctx.strokeStyle='rgba(157,188,255,.8)';ctx.lineWidth=Math.max(1,w*.0012);ctx.beginPath();ctx.arc(cx,cy,r*1.05,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(10,15,31,.18)';ctx.fillRect(0,0,w,h);
      }else if(settings.mode==='contact'){
        ctx.save();ctx.translate(w*.5,h*.55);ctx.rotate(-.1);ctx.fillStyle='#16110d';ctx.fillRect(-w*.65,-h*.13,w*1.3,h*.27);
        [images.backstage,images.bow,images.red,images.runway].forEach((im,i)=>{ctx.save();ctx.filter='grayscale(1)';cover(ctx,im,-w*.59+i*w*.3,-h*.11,w*.28,h*.22);ctx.restore();});ctx.restore();
        const iw=portrait?w*.70:w*.36,ih=portrait?h*.43:h*.58,x=portrait?w*.18:w*.53,y=portrait?h*.37:h*.32;ctx.save();ctx.translate(x+iw/2,y+ih/2);ctx.rotate(.075);ctx.fillStyle='#faf3e8';ctx.shadowColor='rgba(24,12,4,.22)';ctx.shadowBlur=24;ctx.shadowOffsetY=14;ctx.fillRect(-iw/2-10,-ih/2-10,iw+20,ih+45);ctx.shadowColor='transparent';cover(ctx,images.red,-iw/2,-ih/2,iw,ih,Math.sin(t*.2)*.1);ctx.restore();
      }else{
        const scene=gpu.engine?.canvas,art=scene&&gpu.state.backend!=='static'&&source.classList.contains('is-gpu-ready')?scene:images.silk;const areaH=h*(portrait?.60:.76),scale=Math.min(w/art.width,areaH/art.height);ctx.drawImage(art,(w-art.width*scale)/2,h*(portrait?.24:.14)+(areaH-art.height*scale)/2,art.width*scale,art.height*scale);
      }
      ctx.fillStyle=ink;ctx.textBaseline='alphabetic';ctx.font=`400 ${Math.max(12,w*.008)}px "Manrope", sans-serif`;ctx.fillText('PHOTOGRAPHY / OPERA / FASHION',pad,pad);
      const size=fit(ctx,settings.title||'OVERTURE',w-pad*2,portrait?w*.19:w*.171,w*.035);ctx.fillText(settings.title||'OVERTURE',pad,pad+size*1.04);
      ctx.font=`400 ${w*.014}px "Manrope", "Microsoft YaHei", sans-serif`;const subtitle=settings.subtitle;const subY=portrait?pad+size*1.40:pad+size*1.42;fitSans(subtitle,w-pad*2,w*.014);ctx.fillText(subtitle,pad,subY);
      ctx.strokeStyle=ink;ctx.lineWidth=Math.max(.8,w*.0007);ctx.beginPath();ctx.moveTo(pad,h-pad*1.25);ctx.lineTo(w-pad,h-pad*1.25);ctx.stroke();
      ctx.font=`400 ${w*.009}px "Manrope", sans-serif`;ctx.fillText('OVERTURE / STUDIO',pad,h-pad*.65);ctx.textAlign='right';ctx.fillText('LIGHT. EMOTION. FORM.',w-pad,h-pad*.65);ctx.textAlign='left';
      dirty=false;
    }
    function fitSans(text,width,start){let size=start;ctx.font=`400 ${size}px "Manrope", "Microsoft YaHei", sans-serif`;while(ctx.measureText(text).width>width&&size>8){size-=.5;ctx.font=`400 ${size}px "Manrope", "Microsoft YaHei", sans-serif`;}}
    // A new format morphs the preview from its old frame; a new visual language develops in.
    root.querySelectorAll('[data-field]').forEach(input=>c.listen(input,'input',()=>{const name=input.dataset.field;const before=name==='format'&&images?canvas.getBoundingClientRect():null;settings[name]=name==='intensity'?+input.value:input.value;if(name==='intensity'){root.querySelector('output').value=input.value;gpu.setValue(input.value/100);}dirty=true;if(before){paint(performance.now());const after=canvas.getBoundingClientRect();if(!O.reduced()&&after.width&&after.height)canvas.animate([{transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})`,transformOrigin:'0 0'},{transform:'none',transformOrigin:'0 0'}],{duration:O.motion.time('settle'),easing:O.motion.easing('settle')});O.sound.play('paper',{at:canvas});}if(name==='mode'&&images){paint(performance.now());O.motion.develop(canvas,{duration:700});O.sound.play('paper',{at:canvas});}c.emit({settings:{...settings}});}));
    function loop(now){if(!c.alive)return;raf=requestAnimationFrame(loop);if(document.hidden&&!recording)return;if(dirty||recording||settings.mode==='resonance'&&!O.reduced())paint(now);}
    Promise.all([loadImage(O.asset('photos/overture-art.png')),loadImage(O.asset('photos/red-silk.png')),loadImage(O.asset('photos/hero-backstage.jpg')),loadImage(O.asset('photos/stage-bow.jpg')),loadImage(O.asset('photos/runway.jpg')),loadImage(O.asset('photos/resonance-silk.png')),document.fonts.load('40px "Bodoni Moda"'),document.fonts.load('16px "Manrope"')]).then(([overture,red,backstage,bow,runway,silk])=>{if(!c.alive)return;images={overture,red,backstage,bow,runway,silk};png.disabled=false;video.disabled=!window.MediaRecorder||!canvas.captureStream;status.textContent='可以开始创作。导出尺寸与所选画幅一致。';if(video.disabled)status.textContent+=' 此浏览器仅支持 PNG 导出。';paint();raf=requestAnimationFrame(loop);}).catch(err=>{status.textContent=err.message;});
    c.listen(png,'click',()=>{paint(performance.now());O.sound.play('shutter',{at:png});canvas.toBlob(blob=>{if(!c.alive)return;if(!blob){status.textContent='图片导出失败，请重试。';return;}O.download(blob,`overture-${settings.mode}-${settings.format}.png`);status.textContent=`PNG 已生成，已启动下载（${settings.format}）。`;c.emit({exported:'png',width:canvas.width,height:canvas.height});},'image/png');});
    c.listen(video,'click',()=>{
      if(recording){recorder?.stop();return;}
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));if(!mime){status.textContent='此浏览器不支持 WebM 录制，请使用 PNG 导出。';return;}
      try{
        stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});const chunks=[];const filename=`overture-${settings.mode}-${settings.format}.webm`;recording=true;recordStarted=performance.now();png.disabled=true;root.querySelectorAll('[data-field]').forEach(x=>x.disabled=true);video.querySelector('span').textContent='结束录制';status.textContent='正在录制 6 秒，请保持此页面可见。';
        recorder.ondataavailable=ev=>{if(ev.data.size)chunks.push(ev.data);};
        recorder.onstop=()=>{recording=false;clearTimeout(recordTimer);stream?.getTracks().forEach(t=>t.stop());stream=null;if(!c.alive)return;png.disabled=false;root.querySelectorAll('[data-field]').forEach(x=>x.disabled=false);video.querySelector('span').textContent='录制 6 秒';const duration=(performance.now()-recordStarted)/1000;if(chunks.length){O.download(new Blob(chunks,{type:'video/webm'}),filename);status.textContent=`已生成 ${duration.toFixed(1)} 秒无声 WebM。`;c.emit({exported:'webm',duration});}else status.textContent='没有录制到画面，请重试。';};
        recorder.onerror=()=>{status.textContent='录制中断，请改用 PNG 导出。';if(recorder.state!=='inactive')recorder.stop();};recorder.start(250);recordTimer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},6000);
      }catch(err){recording=false;status.textContent='无法开始录制：'+err.message;stream?.getTracks().forEach(t=>t.stop());png.disabled=false;root.querySelectorAll('[data-field]').forEach(x=>x.disabled=false);}
    });
    c.cleanup(()=>{cancelAnimationFrame(raf);clearTimeout(recordTimer);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());});
    root.ovComposer={settings,paint,canvas};return root;
  });
})(globalThis.Overture);
