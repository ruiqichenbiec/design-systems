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
