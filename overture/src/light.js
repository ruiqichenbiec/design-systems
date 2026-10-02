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
