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
