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
