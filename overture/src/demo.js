(function(){
  'use strict';
  const O=window.Overture,M=O.motion,S=O.sound;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  // Per-viewer conveniences only; the page works the same when storage is unavailable.
  const store={get(k){try{return localStorage.getItem('overture-showcase:'+k);}catch{return null;}},set(k,v){try{localStorage.setItem('overture-showcase:'+k,v);}catch{}}};
  const instances=[];
  const mount=(name,selector,props={})=>{const host=$(selector);if(!host)return null;const control=O.mount(name,host,props);instances.push(control);return control;};
  // Acts mount as they come within a screen of the viewport, so the GPU scenes start one at a time.
  const soon=(el,fn)=>{if(!el)return;if(!('IntersectionObserver' in window)){fn();return;}const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){io.disconnect();fn();}},{rootMargin:'100% 0px'});io.observe(el);};
  const token=(el,name)=>getComputedStyle(el).getPropertyValue(name).trim();

  function start(){
    O.configure({assetBase:'assets/'});
    $$('[data-time]').forEach(el=>{el.textContent=M.time(el.dataset.time);});
    restore();bar();prologue();openAct();
    soon($('#develop'),developAct);soon($('#tension'),tensionAct);
    soon($('#roll'),()=>mount('FilmCanister','#dm-roll',{pulled:3.4}));
    soon($('#light'),()=>{mount('FlashlightFocus','#dm-flashlight',{value:30});mount('PinnedPhotoWall','#dm-wall');});
    soon($('#kernel'),kernel);mount('Wordmark','#dm-wordmark');
    addEventListener('pagehide',()=>instances.forEach(i=>i.destroy()),{once:true});
  }

  function restore(){
    const theme=store.get('theme'),motion=store.get('motion');
    if(O.themes.includes(theme))O.setTheme(theme);
    // This page exists to show motion. Windows with 'Show animations' off reports reduced motion to the browser,
    // so the page opens in full motion unless the viewer chose otherwise (header switch or ?motion=).
    if(motion==='full'||motion==='reduce')O.setMotion(motion);else if(!new URLSearchParams(location.search).has('motion'))O.setMotion('full');
    if(store.get('sound')==='on')O.setSound(true);
  }

  // The bar: a vermilion rule springs to the act in view; the three switches act on the whole page.
  function bar(){
    const el=$('#dm-bar'),nav=$('.dm-acts'),rule=$('.dm-acts__rule'),links=$$('.dm-acts a'),acts=links.map(a=>$(a.getAttribute('href'))),prologueEl=$('#prologue');
    const slide=M.spring({preset:'snap',value:[0,0],precision:.2,onUpdate:([x,w])=>{rule.style.transform=`translateX(${x}px) scaleX(${Math.max(0,w)/100})`;}});
    let current=-2;
    const show=i=>{if(i===current)return;current=i;links.forEach((a,j)=>a.setAttribute('aria-current',String(j===i)));if(i<0){slide.to([slide.value[0],0]);return;}const n=nav.getBoundingClientRect(),r=links[i].getBoundingClientRect();if(!n.width)return;slide.to([r.left-n.left,r.width]);};
    const pick=()=>{const line=innerHeight*.42;let i=-1;acts.forEach((a,j)=>{if(a&&a.getBoundingClientRect().top<line)i=j;});show(i);el.classList.toggle('is-clear',prologueEl.getBoundingClientRect().bottom>60);};
    let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;pick();});},{passive:true});
    addEventListener('resize',()=>{current=-2;pick();});pick();
    const names={stage:'暗场',paper:'印纸',nocturne:'夜场'},theme=$('#dm-theme'),sound=$('#dm-sound'),motion=$('#dm-motion');
    // A theme change lands inside a view transition, after this handler returns, so the label takes the new name directly.
    const label=(next=document.documentElement.dataset.theme)=>{theme.querySelector('span').textContent=names[next]||names.stage;sound.querySelector('span').textContent=S.enabled?'开':'关';sound.setAttribute('aria-pressed',String(S.enabled));motion.querySelector('span').textContent=O.reduced()?'减少':'完整';motion.setAttribute('aria-pressed',String(O.reduced()));};
    theme.addEventListener('click',()=>{S.play('iris',{at:theme});const next=O.nextTheme(document.documentElement,{origin:theme});store.set('theme',next);label(next);});
    sound.addEventListener('click',()=>{O.setSound(!S.enabled);store.set('sound',S.enabled?'on':'off');if(S.enabled)S.play('tick',{at:sound,pitch:1.2});label();});
    motion.addEventListener('click',()=>{O.setMotion(O.reduced()?'full':'reduce');store.set('motion',O.config.motion);label();});
    addEventListener('ov:motion',()=>label());label();
  }

  // Prologue: the film loops muted while in view. ENTER closes it into the button and opens the stage.
  function prologue(){
    const section=$('#prologue'),film=$('.dm-film'),button=$('#dm-film-sound'),icon=button.querySelector('.dm-film-sound__icon'),label=button.querySelector('.dm-film-sound__label');
    let inView=true,withSound=false;
    film.src=O.asset('video/overture-promo-15s.mp4');
    const still=()=>{film.pause();const seek=()=>{film.currentTime=5.2;};if(film.readyState>=1)seek();else film.addEventListener('loadedmetadata',seek,{once:true});};
    const run=()=>{if(withSound)return;if(O.reduced())still();else if(!inView||document.hidden)film.pause();else film.play().catch(()=>{});};
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;run();},{threshold:.05}).observe(section);
    document.addEventListener('visibilitychange',run);addEventListener('ov:motion',run);
    const state=$('.dm-screen__state');const ui=on=>{button.setAttribute('aria-pressed',String(on));icon.innerHTML=O.icon(on?'pause':'play');label.textContent=on?'停止有声播放':'有声观看宣传片 · 0:15';state.textContent=on?'有声播放':O.reduced()?'静帧':'静音循环';};ui(false);addEventListener('ov:motion',()=>ui(withSound));
    const quiet=()=>{withSound=false;film.muted=true;film.loop=true;ui(false);run();};
    button.addEventListener('click',()=>{if(withSound){quiet();return;}withSound=true;film.loop=false;film.muted=false;film.currentTime=0;ui(true);film.play().catch(quiet);});
    film.addEventListener('ended',()=>{film.currentTime=0;quiet();});
    mount('CueButton','#dm-enter',{label:'ENTER',variant:'circle',onActivate:enter});
  }
  async function enter(){
    const section=$('#prologue'),button=$('#dm-enter button'),act=$('#open'),heading=$('#open-title');
    if(!O.reduced()){S.play('iris',{at:button});await M.iris(section,{open:false,origin:button,duration:680,easing:'cubic-bezier(.62,0,.84,.3)'});}
    act.scrollIntoView({behavior:'instant',block:'start'});M.release(section);
    heading.tabIndex=-1;heading.focus({preventScroll:true});
    const aperture=$('#dm-aperture .ov-aperture')?.ovAperture;
    if(aperture&&!O.reduced()){aperture.set(.02);aperture.to(.74,{preset:'stage'});}
  }

  function openAct(){
    mount('ApertureStage','#dm-aperture');mount('CueButton','#dm-cue',{label:'按下快门'});
    mount('Dialog','#dm-dialog');mount('Drawer','#dm-drawer');mount('Popover','#dm-popover');mount('CommandPalette','#dm-command');mount('Toast','#dm-toast');mount('CurtainTransition','#dm-curtain');mount('Accordion','#dm-accordion');
  }
  function developAct(){
    mount('DevelopImage','#dm-develop-image',{caption:'FORM / 003'});mount('FocusGallery','#dm-gallery');mount('ContactSheet','#dm-contact',{index:1});
    mount('EditorialTable','#dm-table');mount('TagInput','#dm-tags',{value:['舞台','逆光','朱红']});mount('StageTabs','#dm-tabs');mount('Pagination','#dm-pages');
  }
  function tensionAct(){
    const silk=mount('SilkResonance','#dm-silk',{value:58});
    mount('Range','#dm-range',{label:'曝光 / EXPOSURE',min:-2,max:2,step:.1,value:0,unit:' EV'});mount('Switch','#dm-switch',{label:'取景标记',value:true});mount('Check','#dm-check',{label:'把这一帧加入精选'});mount('Stepper','#dm-stepper',{label:'印刷份数',value:3});
    mount('ChoiceGroup','#dm-choice',{label:'画面的情绪',items:['暗场 Stage','印纸 Paper','夜场 Nocturne']});mount('Progress','#dm-progress',{value:24});
    mount('TextField','#dm-field',{label:'电子邮箱',value:'name@',help:'离开输入框时检查格式。'});mount('IconButton','#dm-icon',{label:'收藏这一帧'});
    scope($('#dm-scope'),()=>{const s=silk?.element.ovSilk;return s?[s.tension,s.target]:[.58,.58];});
  }

  // Oscilloscope: the silk's real tension (cold) against the tension it was set to (vermilion), last three seconds.
  function scope(canvas,read){
    const ctx=canvas.getContext('2d'),samples=[],span=3000;let raf=0,timer=0,visible=false,w=0,h=0;
    const size=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);w=r.width;h=r.height;canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);draw(performance.now());};
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();}).observe(canvas);
    addEventListener('ov:motion',wake);document.addEventListener('visibilitychange',wake);
    function wake(){if(visible&&!document.hidden&&!raf&&!timer)raf=requestAnimationFrame(loop);}
    // Reduced motion: the trace does not scroll; the reading refreshes twice a second.
    function loop(t){raf=0;if(!visible||document.hidden)return;const [v,g]=read();if(O.reduced()){samples.length=0;samples.push([t-span,v,g],[t,v,g]);draw(t);timer=setTimeout(()=>{timer=0;wake();},500);return;}samples.push([t,v,g]);while(samples.length>2&&t-samples[0][0]>span)samples.shift();draw(t);raf=requestAnimationFrame(loop);}
    function line(points,color,width,dash){ctx.setLineDash(dash||[]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);}
    function draw(t){if(!w)return;ctx.clearRect(0,0,w,h);const y=v=>h-10-Math.max(-.1,Math.min(1.1,v))*(h-20),x=s=>w-(t-s)/span*w;
      ctx.strokeStyle='#3d312a';ctx.lineWidth=1;for(let i=1;i<4;i++){const yy=Math.round(h*i/4)+.5;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();}
      if(!samples.length)return;
      line(samples.map(s=>[x(s[0]),y(s[2])]),'#ff6654',1,[4,5]);line(samples.map(s=>[x(s[0]),y(s[1])]),'#8fb1ff',2);
      const last=samples.at(-1);ctx.fillStyle='#8fb1ff';ctx.beginPath();ctx.arc(x(last[0]),y(last[1]),3.5,0,Math.PI*2);ctx.fill();}
  }

  // The kernel lab: throw a print along a rail and watch the chosen spring settle it; the curve is its displacement.
  function kernel(){
    const rail=$('#dm-rail'),print=$('#dm-print'),plot=$('#dm-plot'),section=$('#kernel'),names=['snap','settle','stage','resonance','swing'];
    const usage={snap:'拨杆、勾选、刻度针、取景框、按压',settle:'相纸落位、底片、排序、灯箱',stage:'开幕、照片墙运镜',resonance:'丝绸松手后的回荡',swing:'图钉相纸被拂过后摆动'};
    $('#dm-token-rows').innerHTML=names.map(n=>{const p=M.presets[n];return `<tr data-preset="${n}"><td>${n}</td><td>k ${p.stiffness} · c ${p.damping}</td><td>${M.time(n)} ms</td><td>${usage[n]}</td></tr>`;}).join('');
    print.querySelector('span').style.backgroundImage=`url("${O.asset('photos/red-silk.png')}")`;
    let preset='snap',slot=0,drag=null,raf=0;const trace=[],span=2600;
    const slots=()=>{const width=rail.clientWidth,half=print.offsetWidth/2,edge=innerWidth<=560?48:62;return [edge-half,width/2-half,width-edge-half];};
    const chip=M.spring({preset,value:0,precision:.1,onUpdate:x=>{print.style.transform=`translateX(${x}px)`;trace.push([performance.now(),x]);wake();}});
    const mark=()=>$$('#dm-token-rows tr').forEach(tr=>tr.classList.toggle('is-active',tr.dataset.preset===preset));mark();
    const place=()=>{chip.set(slots()[slot]);wake();};requestAnimationFrame(place);new ResizeObserver(place).observe(rail);
    print.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;drag={x:ev.clientX,from:chip.value,t:performance.now(),lx:ev.clientX,v:0,moved:false};chip.stop();print.setPointerCapture(ev.pointerId);});
    print.addEventListener('pointermove',ev=>{if(!drag)return;const now=performance.now(),dt=Math.max(1,now-drag.t),dx=ev.clientX-drag.x;if(Math.abs(dx)>4)drag.moved=true;drag.v=drag.v*.5+((ev.clientX-drag.lx)/dt*1000)*.5;drag.t=now;drag.lx=ev.clientX;const s=slots();chip.set(O.model.rubber(drag.from+dx,s[0],s[2],90));});
    const drop=ev=>{if(!drag)return;const d=drag;drag=null;const s=slots();if(!d.moved&&ev.type==='pointerup'){slot=(slot+1)%3;}else{const v=performance.now()-d.t>90?0:d.v,aim=chip.value+v*.22;slot=s.reduce((best,x,i)=>Math.abs(x-aim)<Math.abs(s[best]-aim)?i:best,0);chip.to(s[slot],{velocity:v,preset});S.play('drop',{at:print,gain:.7});return;}chip.to(s[slot],{preset});S.play('paper',{at:print});};
    print.addEventListener('pointerup',drop);print.addEventListener('pointercancel',drop);
    print.addEventListener('keydown',ev=>{const d={ArrowRight:1,ArrowLeft:-1}[ev.key];if(!d)return;ev.preventDefault();slot=Math.max(0,Math.min(2,slot+d));chip.to(slots()[slot],{preset});S.play('tick',{at:print});});
    mount('ChoiceGroup','#dm-preset',{label:'选一种弹簧，再扔一次',items:names,onChange:({index})=>{if(index===undefined)return;preset=names[index];mark();slot=(slot+1)%3;chip.to(slots()[slot],{preset});}});
    const ctx=plot.getContext('2d');
    function wake(){if(!raf)raf=requestAnimationFrame(draw);}
    function draw(){raf=0;const r=plot.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);if(!r.width)return;if(plot.width!==Math.round(r.width*dpr)||plot.height!==Math.round(r.height*dpr)){plot.width=Math.round(r.width*dpr);plot.height=Math.round(r.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);
      const w=r.width,h=r.height,now=performance.now(),s=slots(),lo=s[0]-70,hi=s[2]+70,y=x=>h-12-(x-lo)/Math.max(1,hi-lo)*(h-24);
      if(trace.length&&!chip.moving&&now-trace.at(-1)[0]>16)trace.push([now,chip.value]);while(trace.length>2&&now-trace[0][0]>span)trace.shift();
      ctx.clearRect(0,0,w,h);ctx.lineWidth=1;ctx.strokeStyle=token(section,'--ov-line-soft');s.forEach(v=>{ctx.beginPath();ctx.moveTo(0,Math.round(y(v))+.5);ctx.lineTo(w,Math.round(y(v))+.5);ctx.stroke();});
      ctx.setLineDash([4,5]);ctx.strokeStyle=token(section,'--ov-accent');ctx.beginPath();ctx.moveTo(0,y(chip.target));ctx.lineTo(w,y(chip.target));ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle=token(section,'--ov-cold');ctx.lineWidth=2;ctx.beginPath();trace.forEach(([t,x],i)=>{const px=w-(now-t)/span*w;if(i)ctx.lineTo(px,y(x));else ctx.moveTo(px,y(x));});ctx.stroke();
      const flat=trace.every(([,x])=>Math.abs(x-trace[0][1])<.5);if(chip.moving||drag||!flat)raf=requestAnimationFrame(draw);}
    const labels={tick:'齿轮',shutter:'快门',lever:'拨杆',paper:'相纸',drop:'落桌',silk:'丝绸',iris:'光圈',cut:'移光'},list=$('#dm-voices');
    list.innerHTML=S.voices.map(v=>`<button type="button" class="ov-button" data-voice="${v}"><b>${labels[v]||v}</b><span>${v}</span></button>`).join('');
    list.addEventListener('click',ev=>{const b=ev.target.closest('[data-voice]');if(b)S.play(b.dataset.voice,{force:true,at:b});});
  }

  (window.OvertureEmbed?.ready||Promise.resolve()).then(start,err=>{console.error(err);start();});
})();
