import { GlassRenderer,JellyController,GlassSound,bindControlSounds,bindKeyboardFocus,materialPresets,bindSwitch,bindChoiceGroup,tokens } from './design-system/index.js';
import { createI18n } from './i18n.js';
import { mountOpticalDemo } from './design-system/optical-demo.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stage=$('#stage'),media=matchMedia('(prefers-reduced-motion: reduce)');
const unbindFocus=bindKeyboardFocus(document);
const i18n=createI18n(),t=(key,values)=>i18n.t(key,values);
const labOptics=mountOpticalDemo($('#optical-demo'),{language:i18n.language});
const presets=Object.fromEntries(Object.entries(materialPresets).map(([name,values])=>[name,Object.fromEntries(Object.entries(values).map(([key,value])=>[key,Math.round(value*100)]))]));
const state={...presets.thick,elasticity:70,scene:'aurora',preset:'thick',motion:!media.matches,opaque:false,compare:false,view:'components',favorite:false,focus:false,dock:'overview'};
let renderer,toastTimer,lastToast,renderMode='ready';
let duration=25,focusType='idea',feedbackKind='Idle',actionConfirmed=false,notificationTimer;
const feedbackTimers=new WeakMap();
const sound=new GlassSound({onChange:()=>syncSound()});
function syncSound(){
  $('#sound-enabled').checked=sound.enabled;$('#sound-volume').value=Math.round(sound.volume*100);$('#sound-volume').disabled=!sound.enabled;
  $('#sound-volume-value').value=`${Math.round(sound.volume*100)}%`;
  $('#sound-status').textContent=t(sound.status==='unavailable'?'soundUnavailable':sound.enabled?'soundHint':'soundMuted');
}

function notify(key,values){
  clearTimeout(toastTimer);lastToast={key,values};
  $('#toast').textContent=t(key,values);$('#toast').classList.add('visible');
  toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);
}
function feedback(element,kind='pop'){
  clearTimeout(feedbackTimers.get(element));
  element.classList.remove('feedback-pop','feedback-roll','feedback-turn','feedback-glow');
  void element.offsetWidth;
  element.classList.add(`feedback-${kind}`);
  feedbackTimers.set(element,setTimeout(()=>element.classList.remove(`feedback-${kind}`),650));
  renderer?.invalidate(700);
}
function status(mode){
  renderMode=mode;const fallback=mode!=='ready';
  $('#render-label').textContent=t(fallback?'fallback':'ready');
  $('#render-status .status-dot').style.background=fallback?'#b2894a':'#49a38b';
  stage.classList.toggle('fallback',fallback);syncStageLabels();
}
function syncStageLabels(){
  $('#stage-hint').textContent=t(renderMode!=='ready'?'fallbackHint':`hint${state.view[0].toUpperCase()+state.view.slice(1)}`);
  $('#stage-material').textContent=renderMode!=='ready'?'CSS FALLBACK':state.compare?'FROSTED GLASS':'LENS';
}
try{renderer=new GlassRenderer($('#glass-canvas'),stage,{motion:state.motion,onState:status});status('ready');}
catch(error){console.warn('Lens uses its CSS fallback:',error.message);status('fallback');}

const jelly=new JellyController(stage,renderer,{intensity:state.elasticity/100});
renderer?.setMotionSource(jelly);
const lens=$('#free-lens');let lensPos={x:.5,y:.5};
$$('#gallery-view [data-glass]').forEach(el=>jelly.register(el,{maxTravel:el.matches('button')?24:70}));
jelly.register($('.control-panel'));
jelly.register($('.floating-note'),{maxTravel:150});
jelly.register($('#more-button'),{maxTravel:20});
jelly.register($('#favorite'),{maxTravel:22});
jelly.register($('#demo-menu'),{maxTravel:0});
jelly.register($('.demo-slider-thumb'),{source:$('#brightness'),mode:'range'});
jelly.register($('.switch-thumb'),{source:$('#focus-switch'),mode:'toggle',onCommit:setFocus});
jelly.register($('.view-tab-indicator'),{source:$('.view-tabs'),mode:'segment',segments:()=>$$('.view-tabs [role=tab]'),onCommit:button=>setView(button.dataset.view)});
jelly.register($('.dock-indicator'),{source:$('.demo-dock'),mode:'segment',segments:()=>$$('.dock-button'),onCommit:button=>selectDock(button.dataset.dock)});
jelly.register(lens,{mode:'free',onPosition:(x,y)=>{
  const parent=$('#lens-view');lensPos={x:.5+x/parent.clientWidth,y:.5+y/parent.clientHeight};updateLensAria();
}});
$('.floating-note').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();jelly.pulse($('.floating-note'),.65);}});

function track(input){
  const min=Number(input.min)||0,max=Number(input.max)||100,p=(Number(input.value)-min)/(max-min);
  input.style.setProperty('--fill',`${p*100}%`);
  if(input.id==='brightness'){
    const thumb=$('.demo-slider-thumb');jelly.target(thumb,(input.clientWidth-20)*p,jelly.bodies.get(thumb)?.y.target||0);renderer?.invalidate(200);
  }
}
$$('input[type="range"]').forEach(input=>{track(input);input.addEventListener('input',()=>track(input));});
function syncMaterial(){
  for(const key of ['refraction','blur','dispersion','elasticity']){
    const input=$(`#${key}`);input.value=state[key];track(input);$(`#${key}-value`).innerHTML=`${state[key]}<span>%</span>`;
  }
  $$('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===state.preset)));
  renderer?.set({refraction:state.refraction/100,blur:state.blur/100,dispersion:state.dispersion/100,opaque:state.opaque,compare:state.compare});
  jelly.setIntensity(state.elasticity/100);stage.style.setProperty('--fallback-blur',`${2+state.blur*.15}px`);
}
function setPreset(name){Object.assign(state,presets[name],{preset:name});syncMaterial();jelly.pulse($('.control-panel'),.25);}
$$('[data-preset]').forEach(button=>button.addEventListener('click',()=>{setPreset(button.dataset.preset);feedback(button.querySelector('.material-sample'));}));
['refraction','blur','dispersion','elasticity'].forEach(key=>$(`#${key}`).addEventListener('input',event=>{
  state[key]=Number(event.target.value);state.preset=Object.keys(presets).find(p=>Object.keys(presets[p]).every(k=>presets[p][k]===state[k]))||null;
  syncMaterial();if(key==='elasticity')jelly.setIntensity(state.elasticity/100,true);jelly.pulse($('.control-panel'),.13);
}));
function syncSceneText(){
  $('#scene-caption').textContent=t(state.scene)+(state.focus?` · ${t('focus')}`:'');
  $('#scene-name').replaceChildren(document.createTextNode(t(state.scene)));
  const desc=document.createElement('span');desc.textContent=t(`${state.scene}Desc`);$('#scene-name').append(desc);
}
function setScene(name){
  state.scene=name;stage.dataset.scene=name;
  $$('button[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===name)));
  syncSceneText();renderer?.set({scene:name});
}
$$('button[data-scene]').forEach(b=>b.addEventListener('click',()=>{setScene(b.dataset.scene);feedback(b.querySelector('.icon'));}));
function setMotion(value){
  state.motion=value;$('#motion').checked=value;
  if(renderer)renderer.reducedMotion=!value&&media.matches;
  $('#scene-motion').setAttribute('aria-pressed',String(value));$('#scene-motion').setAttribute('aria-label',t(value?'pause':'play'));
  $('#scene-motion use').setAttribute('href',value?'#i-pause':'#i-play');renderer?.set({motion:value});
}
$('#motion').addEventListener('change',e=>setMotion(e.target.checked));
$('#scene-motion').addEventListener('click',()=>{setMotion(!state.motion);feedback($('#scene-motion .icon'));});
media.addEventListener('change',e=>{jelly.reduced=e.matches;if(renderer)renderer.reducedMotion=e.matches;setMotion(!e.matches);});
$('#opaque').addEventListener('change',e=>{state.opaque=e.target.checked;stage.classList.toggle('opaque',state.opaque);syncMaterial();});

function alignIndicator(){
  const button=$('.view-tabs [aria-selected="true"]'),indicator=$('.view-tab-indicator');
  indicator.style.width=`${button.offsetWidth}px`;jelly.target(indicator,button.offsetLeft);
  const dock=$('.dock-button[aria-current]');
  if(dock){$('.dock-indicator').style.width=`${dock.offsetWidth}px`;jelly.target($('.dock-indicator'),dock.offsetLeft);}
  renderer?.invalidate(650);
}
function setView(view){
  jelly.cancel();state.view=view;closeMenu();
  $$('.view-tabs [role=tab]').forEach(b=>{const selected=b.dataset.view===view;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  for(const name of ['components','gallery','lens'])$(`#${name}-view`).hidden=view!==name;
  syncStageLabels();alignIndicator();jelly.pulse(view==='components'?$('.control-panel'):view==='gallery'?$('.gallery-search'):lens,.35);
}
$$('.view-tabs [role=tab]').forEach(button=>{
  button.addEventListener('click',()=>setView(button.dataset.view));
  button.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const views=['components','gallery','lens'],index=views.indexOf(state.view),view=e.key==='Home'?views[0]:e.key==='End'?views.at(-1):views[(index+(e.key==='ArrowRight'?1:-1)+views.length)%views.length];setView(view);$(`[data-view="${view}"]`).focus();}});
});
new ResizeObserver(alignIndicator).observe($('.view-tabs'));
function syncConnections(){
  for(const name of ['wifi','bluetooth'])$(`#${name}-status`).textContent=t($(`#${name}`).getAttribute('aria-pressed')==='true'?(name==='wifi'?'connected':'enabled'):'disabled');
}
function resetDemo(){
  for(const name of ['wifi','bluetooth']){$(`#${name}`).setAttribute('aria-pressed','true');$(`#${name}`).classList.add('active');}
  syncConnections();$('#brightness').value=82;track($('#brightness'));$('#brightness-value').value='82%';renderer?.set({brightness:.95});
  state.favorite=false;state.focus=false;syncFavorite();selectDock('overview',false);
}
for(const name of ['wifi','bluetooth'])$(`#${name}`).addEventListener('click',()=>{
  const button=$(`#${name}`),enabled=button.getAttribute('aria-pressed')!=='true';
  button.setAttribute('aria-pressed',String(enabled));button.classList.toggle('active',enabled);syncConnections();feedback(button.querySelector('.connection-icon'));
});
$('#brightness').addEventListener('input',e=>{const value=Number(e.target.value);$('#brightness-value').value=`${value}%`;renderer?.set({brightness:.55+value/100*.49});});
new ResizeObserver(()=>track($('#brightness'))).observe($('.demo-range-wrap'));
function syncPanelText(){
  const name=state.dock;
  $('.panel-heading h2').textContent=t(name==='favorites'&&state.favorite?'favoritesSavedTitle':`${name}Title`);
  $('.panel-subtitle').textContent=t(`${name}Subtitle`);
  $('#panel-message').textContent=t(state.focus?'focusMessage':state.favorite?'favoriteMessage':name==='favorites'?'noFavorite':'panelMessage');
}
function syncFocus(){
  const button=$('#focus-switch');button.setAttribute('aria-checked',String(state.focus));stage.classList.toggle('focus-active',state.focus);
  jelly.target($('.switch-thumb'),state.focus?jelly.toggleTravel(button):0);$('#focus-state').textContent=t(state.focus?'on':'off');
  syncPanelText();syncSceneText();renderer?.invalidate(600);
}
function setFocus(checked){state.focus=checked;syncFocus();feedback($('.focus-label .icon'));if(checked)setMotion(false);}
const focusControl=bindSwitch($('#focus-switch'),{onChange:setFocus});
function syncFavorite(){
  $('#favorite').setAttribute('aria-pressed',String(state.favorite));$('#favorite').setAttribute('aria-label',t(state.favorite?'unsave':'save'));syncFocus();
}
$('#favorite').addEventListener('click',()=>{state.favorite=!state.favorite;syncFavorite();jelly.pulse($('#favorite'),.6);feedback($('#favorite .icon'));});
function selectDock(name,announce=true){
  state.dock=name;
  $$('.dock-button').forEach(b=>{if(b.dataset.dock===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(name==='material'){setPreset('clear');if(announce)notify('materialToast');}
  if(name==='settings'){$('#refraction').focus({preventScroll:true});if(announce)notify('settingsToast');}
  syncPanelText();alignIndicator();if(announce)feedback($(`.dock-button[data-dock="${name}"] .icon`));
}
$$('.dock-button').forEach(b=>b.addEventListener('click',()=>selectDock(b.dataset.dock)));

const menu=$('#demo-menu'),more=$('#more-button');
function closeMenu(restore=false){menu.hidden=true;more.setAttribute('aria-expanded','false');if(restore)more.focus();renderer?.invalidate(400);}
more.addEventListener('click',()=>{
  const open=menu.hidden;menu.hidden=!open;more.setAttribute('aria-expanded',String(open));
  if(open){menu.querySelector('button').focus();feedback(menu,'glow');jelly.pulse(menu,.6);}renderer?.invalidate(600);
});
$('#menu-reset').addEventListener('click',()=>{resetDemo();closeMenu(true);notify('demoResetToast');});
$('#menu-lens').addEventListener('click',()=>{setView('lens');setScene('grid');lens.focus();});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-wrap'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();closeMenu(true);}});
menu.addEventListener('keydown',e=>{
  const items=[...menu.querySelectorAll('[role=menuitem]')];
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const index=items.indexOf(document.activeElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}
  if(e.key==='Tab')closeMenu();
});
menu.addEventListener('focusout',e=>{if(e.relatedTarget&&!menu.contains(e.relatedTarget)&&e.relatedTarget!==more)closeMenu();});
function syncCompare(){
  $('#compare-button').setAttribute('aria-pressed',String(state.compare));$('#compare-button [data-i18n]').textContent=t(state.compare?'returnGlass':'compare');syncStageLabels();
}
$('#compare-button').addEventListener('click',()=>{state.compare=!state.compare;syncCompare();syncMaterial();notify(state.compare?'compareToast':'liquidToast');});
function updateLensAria(){
  lens.setAttribute('aria-valuenow',String(Math.round(lensPos.x*100)));
  lens.setAttribute('aria-valuetext',t('lensPosition',{x:Math.round(lensPos.x*100),y:Math.round(lensPos.y*100)}));
}
function moveLens(x,y){
  const parent=$('#lens-view'),padding=14,lw=lens.offsetWidth/2+padding,lh=lens.offsetHeight/2+padding;
  const px=Math.max(lw,Math.min(parent.clientWidth-lw,x*parent.clientWidth)),py=Math.max(lh,Math.min(parent.clientHeight-lh,y*parent.clientHeight));
  lensPos={x:px/parent.clientWidth,y:py/parent.clientHeight};jelly.target(lens,px-parent.clientWidth/2,py-parent.clientHeight/2);updateLensAria();renderer?.invalidate(150);
}
lens.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const steps={ArrowLeft:[-.035,0],ArrowRight:[.035,0],ArrowUp:[0,-.035],ArrowDown:[0,.035]};if(steps[e.key]){e.preventDefault();moveLens(lensPos.x+steps[e.key][0],lensPos.y+steps[e.key][1]);}if(e.key==='Home'){e.preventDefault();moveLens(.5,.5);}});

function galleryValues(){return {type:t(focusType),duration};}
function syncGallery(){
  $('#duration-value').replaceChildren(document.createTextNode(String(duration)));
  const unit=document.createElement('span');unit.textContent=` ${t('minutes')}`;$('#duration-value').append(unit);
  $('#duration-minus').disabled=duration<=5;$('#duration-plus').disabled=duration>=60;
  $('#notification-title').textContent=t('notificationTitle',galleryValues());$('#notification-text').textContent=t('notificationText',galleryValues());
  choiceControl.setValue(focusType);
  $('#gallery-feedback').textContent=t(`feedback${feedbackKind}`,galleryValues());
  $('#gallery-action').classList.toggle('is-confirmed',actionConfirmed);$('#gallery-action [data-i18n]').textContent=t(actionConfirmed?'chosen':'choose');
}
function changeDuration(delta){
  duration=Math.max(5,Math.min(60,duration+delta));actionConfirmed=false;feedbackKind='Idle';syncGallery();
  $('#duration-value').style.setProperty('--roll-direction',delta>0?1:-1);feedback($('#duration-value'),'roll');jelly.pulse($('.stepper'),.4);
}
$('#duration-minus').addEventListener('click',()=>changeDuration(-5));$('#duration-plus').addEventListener('click',()=>changeDuration(5));
const choiceControl=bindChoiceGroup($('.choice-pills'),{value:focusType,onChange:(value,button)=>{
  focusType=value;actionConfirmed=false;feedbackKind='Idle';syncGallery();jelly.pulse(button,.65);feedback(button.querySelector('.choice-check'));feedback($('#notification-title'),'roll');
}});
function setNotification(visible,animate=true){
  clearTimeout(notificationTimer);const card=$('#notification-card'),restore=$('#restore-notification');card.classList.remove('is-leaving');
  if(visible){
    card.hidden=false;restore.hidden=true;jelly.target(card,0,0);
    if(animate){feedback(card,'glow');jelly.pulse(card,.55);$('#notification-close').focus({preventScroll:true});}
  }else{
    card.classList.add('is-leaving');jelly.target(card,12,-4);
    notificationTimer=setTimeout(()=>{card.hidden=true;restore.hidden=false;card.classList.remove('is-leaving');restore.focus({preventScroll:true});jelly.pulse(restore,.3);renderer?.invalidate(350);},animate&&!media.matches?180:0);
  }
  renderer?.invalidate(400);
}
$('#notification-close').addEventListener('click',()=>{setNotification(false);notify('dismissedToast');});
$('#restore-notification').addEventListener('click',()=>setNotification(true));
$('#gallery-action').addEventListener('click',()=>{
  actionConfirmed=true;feedbackKind='Selected';syncGallery();feedback($('#gallery-action .icon'));feedback($('#gallery-feedback'),'roll');jelly.pulse($('#gallery-action'),.7);notify('selectedToast',galleryValues());
});
$('#gallery-like').addEventListener('click',()=>{
  const button=$('#gallery-like'),selected=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(selected));feedbackKind=selected?'Liked':'Unliked';syncGallery();jelly.pulse(button,.7);feedback(button.querySelector('.icon'));
});
function resetGallery(animate=true){
  duration=25;focusType='idea';actionConfirmed=false;feedbackKind=animate?'Reset':'Idle';syncGallery();
  $('#gallery-like').setAttribute('aria-pressed','false');setNotification(true,false);$('#gallery-search').value='';syncSearch();
  if(animate){feedback($('#gallery-reset .icon'),'turn');jelly.pulse($('.stepper'),.4);}
}
$('#gallery-reset').addEventListener('click',()=>resetGallery());
function syncSearch(){
  const query=$('#gallery-search').value.trim().toLowerCase();let count=0;
  $$('[data-component]').forEach(el=>{el.hidden=!el.dataset.component.toLowerCase().includes(query);if(!el.hidden)count++;});
  $('#search-count').textContent=t('searchCount',{count});$('#gallery-empty').hidden=count!==0;renderer?.invalidate(400);
}
$('#gallery-search').addEventListener('input',syncSearch);
$('#gallery-search').addEventListener('focus',()=>jelly.pulse($('.gallery-search'),.3));

function refreshLanguage(){
  labOptics.setLanguage(i18n.language);
  status(renderMode);syncSceneText();syncConnections();syncFavorite();setMotion(state.motion);syncCompare();syncGallery();syncSearch();updateLensAria();syncSound();
  if(lastToast)$('#toast').textContent=t(lastToast.key,lastToast.key==='selectedToast'?galleryValues():lastToast.values);
  requestAnimationFrame(alignIndicator);
}
$$('[data-language]').forEach(button=>button.addEventListener('click',()=>{
  i18n.set(button.dataset.language);refreshLanguage();
  try{const url=new URL(location.href);url.searchParams.set('lang',i18n.language);history.replaceState(null,'',url);}catch{}
}));
$('#reset').addEventListener('click',()=>{
  Object.assign(state,presets.thick,{elasticity:70,preset:'thick',opaque:false,compare:false});jelly.reset();
  $('#opaque').checked=false;stage.classList.remove('opaque');syncMaterial();syncCompare();setScene('aurora');setMotion(!media.matches);setView('components');resetDemo();resetGallery(false);
  lensPos={x:.5,y:.5};lens.style.left='50%';lens.style.top='50%';updateLensAria();feedback($('#reset .icon'),'turn');notify('resetToast');
});
$('#copy-button').addEventListener('click',async()=>{
  const configuration={refraction:state.refraction/100,blur:state.blur/100,dispersion:state.dispersion/100,elasticity:state.elasticity/100,scene:state.scene,motion:state.motion,opaque:state.opaque,compare:state.compare};
  const text=JSON.stringify(configuration,null,2);
  try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);notify('copied');}
  catch{const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='lens-material.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('downloaded');}
  $('#copy-button use').setAttribute('href','#i-check');feedback($('#copy-button .icon'));setTimeout(()=>$('#copy-button use').setAttribute('href','#i-code'),1800);
  sound.play('success');
});

const soundBindings={
  toggle:'#wifi,#bluetooth,#focus-switch,#motion,#opaque,#scene-motion,#sound-enabled',
  select:'button[data-preset],button[data-scene],button[data-view],button[data-dock],button[data-language],#more-button,#menu-lens,#compare-button',
  favorite:'#favorite,#gallery-like',tick:'input[type=range],#duration-minus,#duration-plus',
  success:'#gallery-action',dismiss:'#notification-close',restore:'#restore-notification',reset:'#reset,#gallery-reset,#menu-reset',type:'#gallery-search',
};
for(const [cue,selector] of Object.entries(soundBindings))$$(selector).forEach(element=>element.dataset.lgSound=cue);
lens.dataset.lgSoundKey='tick';
$('#sound-enabled').addEventListener('change',event=>sound.set({enabled:event.target.checked}));
$('#sound-volume').addEventListener('input',event=>sound.set({volume:Number(event.target.value)/100}));
const unbindSounds=bindControlSounds(document,sound);
syncMaterial();refreshLanguage();
window.addEventListener('pagehide',event=>{sound.stop();if(!event.persisted){labOptics.destroy();unbindSounds();unbindFocus();sound.destroy();focusControl.destroy();choiceControl.destroy();jelly.destroy();renderer?.destroy();}});
window.addEventListener('pageshow',event=>{if(event.persisted)renderer?.invalidate();});
Object.defineProperty(window,'glassDiagnostics',{get:()=>({renderer:renderer&&!renderer.lost&&!renderer.suspended?'webgl2':'css',settings:{...state},surfaces:renderer?.geometry.length||0,canvas:{width:$('#glass-canvas').width,height:$('#glass-canvas').height},glError:renderer?.gl?.getError()??null})});
