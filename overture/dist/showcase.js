document.addEventListener('DOMContentLoaded',()=>{
  const O=Overture;O.configure({assetBase:'assets/'});
  const hero=O.mount('ApertureStage','#hero-engine',{chrome:false});
  const contact=O.mount('ContactSheet','#contact-act',{index:2,onChange:({index})=>{if(index!==undefined)document.querySelectorAll('[data-frame]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.frame===index)));}});
  const roll=O.mount('FilmCanister','#roll-act',{pulled:3.4});
  const silk=O.mount('SilkResonance','#silk-act',{value:58});
  const player=O.mount('CuePlayer','#cue-player');
  document.querySelectorAll('[data-frame]').forEach(b=>b.addEventListener('click',()=>contact.setValue(+b.dataset.frame)));
  document.querySelectorAll('[data-gesture]').forEach(b=>b.addEventListener('click',()=>{const kind=b.dataset.gesture;if(kind==='focus')document.querySelector('#silk-act .ov-silk__scene').focus({preventScroll:true});if(kind==='resonate'){silk.setValue(85);document.querySelector('#silk-act input').focus({preventScroll:true});}if(kind==='capture')document.querySelector('#silk-act button[aria-label="下载雕塑图片"]').click();}));
  const enter=document.getElementById('enter');
  enter.addEventListener('click',()=>{hero.setValue(100);document.getElementById('work').scrollIntoView({behavior:O.reduced()?'instant':'smooth'});});
  let ticking=false;
  window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{const h=document.getElementById('overture');const r=h.getBoundingClientRect();if(r.bottom>0)hero.setValue(74+Math.min(26,-r.top/r.height*35));ticking=false;});}},{passive:true});
  const toggle=document.getElementById('motion-toggle');const refresh=()=>{const reduced=O.reduced();toggle.textContent=reduced?'启用完整动态':'减少动态';toggle.setAttribute('aria-pressed',String(reduced));};refresh();toggle.addEventListener('click',()=>{O.setMotion(O.reduced()?'full':'reduce');refresh();});
  window.addEventListener('pagehide',()=>{hero.destroy();contact.destroy();roll.destroy();silk.destroy();player.destroy();},{once:true});
});
