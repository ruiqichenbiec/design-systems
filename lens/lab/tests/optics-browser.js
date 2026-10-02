import {createComponent, createGlassSystem, tokens, GlassSound, bindControlSounds} from '../design-system/index.js';
import {readOpticalState,setOpticalState,opticalSelection} from '../design-system/internal/optics.js';
import {mountShowcaseCharts} from '../design-system/showcase-charts.js';
import {ChartGlass} from '../design-system/internal/chart-glass.js';
import {RecordsGlass} from '../design-system/internal/records-glass.js';
import {showcaseView,showcaseLinePoints} from '../design-system/internal/showcase-data.js';

const fixture = document.querySelector('#fixture'), details = document.querySelector('#details');
const checks = [], assert = (condition, message) => {if (!condition) throw new Error(message);};
const test = async (name, run) => {try {await run(); checks.push({name, pass:true});} catch(error) {checks.push({name, pass:false, error:error.message});}};
let handles = [], systems = [];
const mount = (name, props) => {const handle = createComponent(name, props); handles.push(handle); fixture.append(handle.element); return handle;};
const cleanup = () => {systems.forEach(system => system.destroy()); handles.forEach(handle => handle.destroy()); systems = []; handles = []; fixture.replaceChildren();};
const keys = (element, key, shiftKey = false) => element.dispatchEvent(new KeyboardEvent('keydown', {key, shiftKey, bubbles:true, cancelable:true}));
const observeLoss=renderer=>new Promise(resolve=>{renderer.canvas.addEventListener('webglcontextlost',resolve,{once:true});renderer.gl.getExtension('WEBGL_lose_context').loseContext();});
const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const until=async(predicate,message,timeout=3000)=>{const start=performance.now();while(!predicate()&&performance.now()-start<timeout)await tick();assert(predicate(),message);};

document.querySelector('#run').addEventListener('click', async () => {
  document.querySelector('#run').disabled = true; checks.length = 0; details.textContent = ''; cleanup();
  await test('Friction: real Web Audio output, speed envelope, stationary fade and mute', async () => {
    const sound=new GlassSound({storage:null,volume:.18});
    try{
      assert(await sound.startFriction(), 'AudioContext must unlock from the Run gesture');
      const analyser=sound.context.createAnalyser();analyser.fftSize=512;sound.master.connect(analyser);
      const samples=new Float32Array(analyser.fftSize),rms=()=>{analyser.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);};
      let moving=0;
      // A newly opened device may take several render quanta to begin output.
      // Continue a real movement envelope while waiting for its first signal.
      for(let frame=0;frame<50&&moving<=.00005;frame++){sound.updateFriction(850);await new Promise(resolve=>setTimeout(resolve,40));moving=rms();}
      assert(moving>.00005, `Moving audio signal=${moving}, context=${sound.context.state}, time=${sound.context.currentTime}, gain=${sound.friction?.gain.gain.value}`);
      sound.updateFriction(0);await new Promise(resolve=>setTimeout(resolve,150));assert(rms()<moving*.2, 'Stationary audio must fade away');
      sound.updateFriction(700);sound.set({enabled:false});assert(!sound.friction&&!sound.snapshot().frictionActive, 'Mute must release the friction voice');
      analyser.disconnect();
    }finally{sound.destroy();}
  });
  await test('Friction bindings: lenses only, pointer cancel, Escape and teardown', () => {
    const calls=[],sound={play(){},stop(){},startFriction(){calls.push('start');},updateFriction(speed){calls.push(speed);},endFriction(){calls.push('end');}};
    const unbind=bindControlSounds(fixture,sound),lens=mount('lens',{label:'Sound test'}).element;
    const pointer=(target,type,x)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,isPrimary:true,pointerId:81,clientX:x,clientY:20}));
    try{
      pointer(lens,'pointerdown',20);pointer(lens,'pointermove',45);pointer(lens,'pointercancel',45);
      assert(calls[0]==='start'&&calls[1]>0&&calls[2]==='end', 'Lens movement and cancellation');
      const pointWrapper=document.createElement('div'),point=document.createElement('div');pointWrapper.dataset.variant='point';point.className='lg-xy-pad';pointWrapper.append(point);fixture.append(pointWrapper);pointer(point,'pointerdown',20);assert(calls.length===3, 'Point variant must remain silent');
      pointer(lens,'pointerdown',20);keys(lens,'Escape');assert(calls.at(-1)==='end', 'Escape must finish the drag');
      pointer(lens,'pointerdown',20);unbind();const count=calls.length;pointer(lens,'pointermove',80);assert(calls.length===count&&calls.at(-1)==='end', 'Unbind stops and removes handlers');
    }finally{unbind();}
  });cleanup();
  await test('Charts: period/category/search/sort/page controls and selection survive language changes', () => {
    let charts=mountShowcaseCharts(fixture);
    try{
      const click=selector=>fixture.querySelector(selector).click();
      click('.viz-toolbar .sc-segment button:last-child');assert(fixture.querySelector('.viz-row-count').textContent==='56 条记录', '14-day period');
      click('.viz-legend-button');assert(fixture.querySelector('.viz-row-count').textContent==='14 条记录', 'Category filter');
      const search=fixture.querySelector('input[type=search]');search.value='9 月 18 日';search.dispatchEvent(new Event('input',{bubbles:true}));assert(fixture.querySelector('.viz-row-count').textContent==='1 条记录', 'Visible Chinese date must match');
      click('.viz-row-select');const snapshot=charts.snapshot();assert(fixture.querySelector('.viz-insight').textContent.includes('9 月 18 日'), 'Selected detail');
      charts.destroy();charts=mountShowcaseCharts(fixture,{language:'en',initialState:snapshot});
      assert(fixture.querySelector('.viz-row-select').getAttribute('aria-pressed')==='true'&&fixture.querySelector('.viz-insight').textContent.includes('Selected record：Interface sketches · Sep 18'), 'Language keeps and translates selected detail');
      const englishSearch=fixture.querySelector('input[type=search]');englishSearch.value='no matching activity';englishSearch.dispatchEvent(new Event('input',{bubbles:true}));assert(!fixture.querySelector('.viz-empty').hidden, 'Empty state');
      click('.viz-search-clear');assert(englishSearch.value===''&&document.activeElement===englishSearch&&fixture.querySelector('.viz-row-count').textContent==='14 records', 'Clear restores results, preserves category and returns focus');
      englishSearch.value='missing';englishSearch.dispatchEvent(new Event('input',{bubbles:true}));keys(englishSearch,'Escape');assert(englishSearch.value===''&&fixture.querySelector('.viz-search-clear').hidden,'Escape clears search without leaving a hidden clear button in the tab order');
      englishSearch.value='missing';englishSearch.dispatchEvent(new Event('input',{bubbles:true}));
      click('.viz-empty button');assert(fixture.querySelector('.viz-row-count').textContent==='56 records', 'Reset search and category');
      click('.viz-table th:nth-child(3) button');assert(fixture.querySelector('.viz-table tbody .viz-numeric').textContent==='160 min', 'Descending sort');
      click('.viz-table th:nth-child(3) button');assert(fixture.querySelector('.viz-table tbody .viz-numeric').textContent==='20 min', 'Ascending sort');
      click('.viz-pagination button:last-child');assert(fixture.querySelector('.viz-pagination span').textContent==='9–16 / 56', 'Pagination');
      const sort=fixture.querySelector('.viz-sort-control select');sort.value='progress:asc';sort.dispatchEvent(new Event('change',{bubbles:true}));assert(fixture.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='72'&&fixture.querySelector('.viz-table th:nth-child(4)').getAttribute('aria-sort')==='ascending', 'Compact sort uses the same data and announces the same direction');
    }finally{charts.destroy();}
  });cleanup();
  // Isolated fixture only: exercise the normal-motion branch even when the host
  // OS requests reduced motion. No browser/system preference is changed.
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function(query) {
    const result = originalMatchMedia.call(window,query);
    if(query !== '(prefers-reduced-motion: reduce)') return result;
    return new Proxy(result,{get(target,key) {if(key === 'matches') return false; const item=Reflect.get(target,key,target); return typeof item === 'function' ? item.bind(target) : item;}});
  };
  await test('Record glass: original search refraction, optical selection, reduced motion and context cleanup', async () => {
    const stage=document.createElement('div');stage.className='lg-stage';stage.style.cssText='width:380px;height:260px;padding:22px';fixture.append(stage);
    const canvas=document.createElement('canvas');canvas.className='lg-canvas';stage.append(canvas);
    const search=createComponent('search',{label:'Search records',placeholder:'Search an activity'}),surface=document.createElement('div');surface.className='lg-surface';surface.dataset.glass='optical-well';surface.style.cssText='height:72px;margin-top:22px;border-radius:16px';stage.append(search.element,surface);setOpticalState(surface,{kind:2,selected:0},{animate:false});
    const renderer=new RecordsGlass(canvas,stage);
    try{
      assert(canvas.hidden&&stage.classList.contains('fallback'),'An unpainted canvas must not obscure a newly mounted table');
      stage.scrollIntoView({block:'center'});await until(()=>renderer.gl&&!renderer.suspended&&!renderer.lost,'Record GPU becomes ready');const gl=renderer.gl;
      const pixels=now=>{cancelAnimationFrame(renderer.frame);renderer.frame=0;renderer.visible=true;renderer.render(now);const data=new Uint8Array(renderer.width*renderer.height*4);gl.readPixels(0,0,renderer.width,renderer.height,gl.RGBA,gl.UNSIGNED_BYTE,data);assert(gl.getError()===gl.NO_ERROR,'Record material GPU error');return data;};
      const difference=(a,b)=>{let count=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)count++;return count;};
      const now=performance.now();renderer.set({refraction:0});const flat=pixels(now);renderer.set({refraction:.9});const glass=pixels(now+20);assert(difference(flat,glass)>100,'Search and records must bend the actual paper scene');
      opticalSelection(surface,true);const start=performance.now(),early=pixels(start+120),flow=pixels(start+650);assert(difference(early,flow)>100,'Selection must raise the concave surface and move its light');
      renderer.reducedMotion=true;const stillA=pixels(start+1600),stillB=pixels(start+2100);assert(difference(stillA,stillB)===0,'Reduced motion must settle without a permanent animation');
      assert(!canvas.hidden&&stage.classList.contains('webgl-ready'),'A painted frame enables the optical material');
      stage.style.width='360px';renderer.resize();assert(canvas.hidden&&stage.classList.contains('fallback'),'A resized drawing buffer must not flash black');pixels(start+2300);assert(!canvas.hidden,'Rendering replaces the temporary fallback after resize');
      await observeLoss(renderer);assert(stage.classList.contains('fallback')&&canvas.hidden,'Context loss exposes the CSS material');
      search.setValue('Readable fallback');assert(search.value==='Readable fallback','The native input remains usable');
    }finally{renderer.destroy();search.destroy();stage.remove();assert(!canvas.isConnected,'Record canvas must be released');}
  });cleanup();
  await test('Record selection: one flowing raised row, quiet initial state and stale control teardown', () => {
    const charts=mountShowcaseCharts(fixture);
    try{
      const [first,second]=fixture.querySelectorAll('.viz-row-select'),[firstGlass,secondGlass]=fixture.querySelectorAll('.viz-row-glass');
      assert(readOpticalState(firstGlass).flow===-1,'Initial rows stay quiet');first.click();assert(readOpticalState(firstGlass,performance.now()+100).flow>=0,'Selection starts travelling light');second.click();assert(readOpticalState(secondGlass,performance.now()+100).flow>=0&&readOpticalState(firstGlass,performance.now()+2000).selected===0,'Changing selection releases the previous row');
      const before=charts.snapshot().record,search=fixture.querySelector('input[type=search]');search.value='9月18日';search.dispatchEvent(new Event('input',{bubbles:true}));first.click();assert(charts.snapshot().record===before,'Discarded row controls must no longer change state');
    }finally{charts.destroy();}
  });cleanup();
  await test('Glass charts: real refraction, moving liquid/light, reduced motion, context loss and disposal', async () => {
    const points=showcaseLinePoints(showcaseView().daily).points;
    const difference=(a,b)=>{let count=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)count++;return count;};
    for(const kind of ['line','ring','bars']){
      const host=document.createElement('div');host.style.cssText='position:relative;width:400px;height:230px';fixture.append(host);
      const renderer=new ChartGlass(host,{kind,measure:()=>[[30,12,330,34],[30,67,330,34],[30,122,330,34],[30,177,330,34]]});
      try{
        host.scrollIntoView({block:'center'});await until(()=>renderer.ready,`${kind} GPU becomes ready`);assert(renderer.ready,`${kind} shader failed: ${renderer.error}`);
        renderer.set({points,values:kind==='bars'?[1,.42,.72,.24]:[.42,.18,.30,.10],lens:points.at(-1)});await tick();
        const gl=renderer.gl,read=now=>{cancelAnimationFrame(renderer.frame);renderer.frame=0;renderer.visible=true;renderer.render(now);const data=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);assert(gl.getError()===gl.NO_ERROR,`${kind} GPU error`);return data;};
        const time=performance.now()+2000;renderer.set({refraction:0});const flat=read(time);renderer.set({refraction:1});const refracted=read(time+20);
        assert(difference(flat,refracted)>60,`${kind} must refract the actual measuring field`);
        renderer.set({selected:1,animate:true});const movingA=read(renderer.flowStart+150),movingB=read(renderer.flowStart+520);assert(difference(movingA,movingB)>40,`${kind} liquid/light must travel after a selection`);
        renderer.motion={matches:true};const stillA=read(time+3000),stillB=read(time+3400);assert(difference(stillA,stillB)===0,`${kind} must honor reduced motion`);
        await observeLoss(renderer);assert(host.dataset.glassReady==='false'&&renderer.canvas.hidden,`${kind} must reveal its semantic fallback`);
      }finally{renderer.destroy();assert(!renderer.canvas.isConnected&&renderer.frame===0,`${kind} cleanup`);host.remove();}
    }
  });cleanup();
  await test('Progress: bounds, ARIA, one completion per crossing, reset and invalid input', () => {
    let completed = 0; const bar = mount('progress', {label:'Export', value:25, onComplete:() => completed++});
    bar.setValue(140, {emit:true}); bar.setValue(100, {emit:true});
    assert(bar.value === 100 && completed === 1, 'Completion must fire exactly once');
    assert(bar.element.querySelector('[role=progressbar]').getAttribute('aria-valuenow') === '100', 'ARIA progress');
    bar.setValue(-3, {emit:true}); assert(bar.value === 0, 'Lower clamp');
    bar.setValue(100, {emit:true}); assert(completed === 2, 'A new crossing should complete again');
    let rejected = false; try {bar.setValue(NaN);} catch {rejected = true;} assert(rejected, 'Reject NaN');
    bar.setCompletionColor('gold'); assert(bar.element.style.getPropertyValue('--lg-optical-color') === tokens.optics.gold, 'Gold completion color');
  }); cleanup();
  await test('Choice capsules: selection changes start an optical flow; initial mount stays quiet', () => {
    const choice = mount('choices', {label:'Choice', options:[{value:'a',label:'A'},{value:'b',label:'B'}]});
    const [a, b] = choice.element.querySelectorAll('button');
    assert(readOpticalState(a).flow === -1, 'Initial selection must not celebrate');
    b.click(); assert(choice.value === 'b', 'Click selects');
    assert(readOpticalState(b, performance.now()+100).flow >= 0, 'Selection needs a travelling rim');
    keys(b, 'ArrowLeft'); assert(choice.value === 'a', 'Keyboard selection');
    choice.destroy(); b.click(); assert(choice.value === 'a', 'Destroyed handlers must be inert');
  }); cleanup();
  await test('Drop selector: disabled options, keyboard, external value, disabled control and teardown', async () => {
    let changes = 0;
    const drop = mount('drop-select', {label:'Drop', options:[{value:'a',label:'A',icon:'focus'},{value:'b',label:'B',icon:'sun',disabled:true},{value:'c',label:'C',icon:'moon'}], onChange:() => changes++});
    await tick(); const selector = drop.element.querySelector('.lg-drop-selector');
    const originWell = drop.element.querySelector('[data-value=a] .lg-drop-well');
    assert(selector.offsetWidth === originWell.offsetWidth && selector.offsetHeight === originWell.offsetHeight, 'Held outline must match the destination size');
    assert(readOpticalState(selector).deformation?.bend.length === 2, 'Drop motion must drive the same shader deformation as the original lens');
    assert(selector.textContent === '' && !selector.querySelector('svg'), 'Clear cursor must not repeat the well icon or label');
    assert(readOpticalState(selector,performance.now()+2000).opacity === 0, 'Resting cursor must yield to the raised well');
    keys(selector, 'ArrowRight'); assert(drop.value === 'c' && changes === 1, 'Skip disabled option');
    const chosen = drop.element.querySelector('[data-value=c] .lg-drop-well');
    assert(drop.element.dataset.phase==='travelling'&&chosen.dataset.selected==='false','A keyboard change must travel before the well rises');
    await until(()=>drop.element.dataset.phase==='merging','The lens must merge at its destination');
    assert(readOpticalState(chosen,performance.now()+100).flow >= 0, 'The destination receives the travelling highlight');
    assert(readOpticalState(chosen,performance.now()+2000).selected === 1 && chosen.dataset.selected === 'true', 'Selection raises the destination');
    assert(drop.setValue('b') === false && drop.value === 'c', 'Do not programmatically select a disabled option');
    drop.setDisabled(true); keys(selector, 'Home'); assert(drop.value === 'c', 'Disabled means inert');
    drop.setDisabled(false); keys(selector, 'Home'); assert(drop.value === 'a', 'Home selects first');
    drop.destroy(); keys(selector, 'End'); assert(drop.value === 'a', 'Teardown removes keyboard handlers');
    assert(!readOpticalState(chosen) && chosen.getAnimations({subtree:true}).length === 0, 'Teardown releases well state and animation');
  }); cleanup();
  await test('Drop attraction: gap release, visible travel, flowing merge, re-grab continuity and cancellation', async()=>{
    let changes=0;const drop=mount('drop-select',{label:'Flow',options:[{value:'a',label:'A'},{value:'b',label:'B'},{value:'c',label:'C',disabled:true}],onChange:()=>changes++});await tick();
    const cursor=drop.element.querySelector('.lg-drop-selector'),a=drop.element.querySelector('[data-value=a] .lg-drop-well'),b=drop.element.querySelector('[data-value=b] .lg-drop-well');
    // Synthetic events only in this fixture: native capture requires a trusted pointer.
    let captured=false;cursor.setPointerCapture=()=>{captured=true;};cursor.hasPointerCapture=()=>captured;cursor.releasePointerCapture=()=>{captured=false;};
    const center=el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};};
    const pointer=(type,p)=>cursor.dispatchEvent(new PointerEvent(type,{pointerId:7,isPrimary:true,button:0,clientX:p.x,clientY:p.y,bubbles:true,cancelable:true}));
    const origin=center(cursor),wellB=center(b),gap={x:wellB.x+12,y:wellB.y+b.offsetHeight/2+22};
    pointer('pointerdown',origin);await until(()=>readOpticalState(cursor).opacity>.95,'Pick up fades into view');assert(a.dataset.selected==='false','Origin recedes while held');
    // Pointerup alone must use its final coordinates, even without a pointermove.
    pointer('pointerup',gap);assert(drop.value==='b'&&changes===1,'Release outside the ellipse chooses nearest enabled well');
    assert(drop.element.dataset.phase==='travelling'&&readOpticalState(cursor).opacity>.95,'Release keeps glass visible');assert(b.dataset.selected==='false','Destination cannot appear before arrival');
    await tick();const before=center(cursor);pointer('pointerdown',before);const after=center(cursor);assert(Math.hypot(before.x-after.x,before.y-after.y)<1,'Re-grab must preserve the on-screen pose');pointer('pointercancel',before);
    assert(drop.value==='b'&&changes===1,'Cancellation returns without a new selection');await until(()=>drop.element.dataset.phase==='merging','Return reaches the current well');
    await new Promise(resolve=>setTimeout(resolve,80));assert(readOpticalState(cursor).opacity>0&&readOpticalState(cursor).opacity<1,'The lens flows away gradually after arrival');assert(readOpticalState(b).selected>0&&readOpticalState(b).selected<1,'The well rises during the merge');
    await until(()=>drop.element.dataset.phase==='rest','Merge settles');assert(readOpticalState(cursor).opacity===0&&readOpticalState(b).selected===1,'One settled glass well remains');
    drop.setVariant('capsule');await tick();assert(cursor.offsetWidth===b.offsetWidth&&cursor.offsetHeight===b.offsetHeight,'Variant keeps the exact well dimensions');
    const start=center(cursor);pointer('pointerdown',start);pointer('pointermove',{x:start.x-80,y:start.y+20});keys(cursor,'Escape');await until(()=>drop.element.dataset.phase==='rest','Escape animates home');assert(drop.value==='b'&&changes===1,'Escape preserves the selection');
  });cleanup();
  await test('Restored controls: icon/tile state, disabled options, tabs/dock navigation and menu focus',async()=>{
    let changes=0,action='';const icon=mount('icon-button',{label:'Favorite',icon:'heart',pressed:false,onChange:()=>changes++}),tile=mount('toggle-tile',{label:'Wi-Fi',checked:false});icon.element.click();tile.element.click();assert(icon.value&&tile.value&&changes===1,'Icon and tile toggle');assert(tile.element.getAttribute('aria-checked')==='true','Tile announces state');icon.setDisabled(true);icon.element.click();assert(changes===1,'Disabled icon is inert');
    const options=[{value:'a',label:'A',content:'Alpha'},{value:'b',label:'B',disabled:true},{value:'c',label:'C',content:'Charlie'}];
    for(const kind of ['tabs','dock']){const handle=mount(kind,{label:kind,options,onChange:()=>changes++});const buttons=handle.element.querySelectorAll('.lg-segment-option');keys(buttons[0],'ArrowRight');assert(handle.value==='c'&&document.activeElement===buttons[2],`${kind} skips disabled options`);if(kind==='tabs')assert(handle.element.querySelector('[role=tabpanel]:not([hidden])').textContent==='Charlie','Tabs reveal their matching content');else assert(buttons[2].getAttribute('aria-current')==='page','Dock exposes the current view');keys(buttons[2],'Home');assert(handle.value==='a','Home returns to first');handle.destroy();buttons[2].click();assert(handle.value==='a','Destroyed navigation is inert');}
    const menu=mount('menu',{label:'Actions',options:[{value:'save',label:'Save'},{value:'disabled',label:'Unavailable',disabled:true},{value:'reset',label:'Reset'}],onAction:value=>{action=value;}}),trigger=menu.element.querySelector('button'),items=menu.element.querySelectorAll('[role=menuitem]');trigger.click();assert(document.activeElement===items[0],'Opening focuses first menu item');keys(items[0],'ArrowDown');assert(document.activeElement===items[2],'Menu skips disabled items');items[2].click();assert(action==='reset'&&document.activeElement===trigger,'Action closes and restores trigger focus');await until(()=>menu.element.querySelector('[role=menu]').hidden,'Menu closes with animation');trigger.click();keys(items[0],'Escape');assert(trigger.getAttribute('aria-expanded')==='false'&&document.activeElement===trigger,'Escape closes and restores focus');menu.destroy();trigger.click();assert(trigger.getAttribute('aria-expanded')==='false','Destroyed menu is inert');
  });cleanup();
  await test('XY slider: signed axes, keyboard, variant preserves value, disabled and detached value object', () => {
    const xy = mount('xy-slider', {label:'XY', xLabel:'Warmth', yLabel:'Tone', value:{x:0,y:0}, step:5});
    const pad = xy.element.querySelector('.lg-xy-pad'); keys(pad, 'ArrowUp'); keys(pad, 'ArrowRight', true);
    assert(xy.value.x === 50 && xy.value.y === 5, 'Arrow axes and Shift multiplier');
    xy.setVariant('lens'); assert(xy.value.x === 50 && xy.element.querySelector('[data-glass=optical-lens]'), 'Variant preserves coordinates');
    xy.setValue({x:900,y:-900}); assert(xy.value.x === 100 && xy.value.y === -100, 'Clamp both axes');
    const copy = xy.value; copy.x = 0; assert(xy.value.x === 100, 'Value must be a copy');
    xy.setDisabled(true); keys(pad, 'Home'); assert(xy.value.x === 100, 'Disabled pad');
    xy.setDisabled(false); keys(pad, 'Home'); assert(xy.value.x === 0 && xy.value.y === 0, 'Home resets');
    xy.destroy(); keys(pad, 'ArrowRight'); assert(xy.value.x === 0, 'Teardown removes pointer/key handlers');
  }); cleanup();
  await test('WebGL: shaders compile; fill and completion color change actual framebuffer pixels', async () => {
    const bar = mount('progress', {label:'Render',value:0,motion:'off'}), system = createGlassSystem(fixture, {scene:'grid', motion:false, audio:{enabled:false}}); systems.push(system);
    assert(system.renderer, 'WebGL2 unavailable');fixture.scrollIntoView({block:'center'});await until(()=>system.renderer.gl&&!system.renderer.suspended,'GPU becomes ready');
    const renderer = system.renderer, gl = renderer.gl;
    const pixels = (now = performance.now()+2000) => {cancelAnimationFrame(renderer.frame); renderer.visible = true; renderer.render(now); const data = new Uint8Array(renderer.width*renderer.height*4); gl.readPixels(0,0,renderer.width,renderer.height,gl.RGBA,gl.UNSIGNED_BYTE,data); assert(gl.getError() === gl.NO_ERROR, 'WebGL error'); return data;};
    const difference = (a,b) => {let count=0; for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12) count++; return count;};
    const empty = pixels(); bar.setValue(65,{animate:false}); const partial = pixels();
    assert(difference(empty,partial)>100, 'Progress must affect optical pixels');
    bar.setValue(100,{animate:false}); const green = pixels(); bar.setCompletionColor('gold'); const gold = pixels();
    assert(difference(green,gold)>100, 'Gold and green should visibly differ');
    renderer.reducedMotion = true; bar.setValue(65,{animate:false}); bar.setMotion('on');
    const waveTime = performance.now()+2000, waveA = pixels(waveTime), waveB = pixels(waveTime+600);
    assert(difference(waveA,waveB)>30, 'The completed fiber must actually ripple over time, including explicit motion opt-in');
    bar.setMotion('off'); const stillA = pixels(waveTime+800), stillB = pixels(waveTime+1400);
    assert(difference(stillA,stillB)===0, 'Still mode must stop the wave');
    bar.setMotion('system'); bar.setValue(0); bar.setValue(100); pixels();
    assert(readOpticalState(bar.element.querySelector('.lg-progress-track'),performance.now(),true).flow === -1, 'Reduced motion must settle without flow');
  }); cleanup();
  await test('WebGL: the lens magnifies the rendered coordinate grid', async () => {
    const xy = mount('xy-slider', {label:'Magnifier',variant:'lens',value:{x:25,y:10}}), system = createGlassSystem(fixture,{scene:'grid',motion:false,audio:{enabled:false}}); systems.push(system);fixture.scrollIntoView({block:'center'});await until(()=>system.renderer.gl&&!system.renderer.suspended,'GPU becomes ready');
    assert(system.renderer, 'WebGL2 unavailable');
    const renderer = system.renderer, gl = renderer.gl;
    renderer.visible = true; renderer.render(performance.now()+2000);
    const thumb = xy.element.querySelector('.lg-xy-thumb'), effect = readOpticalState(thumb);
    assert(effect.kind === 4 && effect.zoom === 1.8, 'Magnification is connected to the compositor');
    assert(renderer.geometry.find(geometry => geometry.kind === 'xy-field') && renderer.geometry.find(geometry => geometry.el === thumb), 'Both the field and lens must be composited');
    assert(gl.getError() === gl.NO_ERROR, 'Lens shader failure');
  }); cleanup();
  await test('CSS fallback: controls still work after real WebGL context loss', async () => {
    const xy = mount('xy-slider',{label:'Fallback',variant:'lens'}), system = createGlassSystem(fixture,{motion:false,audio:{enabled:false}}); systems.push(system);fixture.scrollIntoView({block:'center'});await until(()=>system.renderer.gl&&!system.renderer.suspended,'GPU becomes ready');
    const extension = system.renderer?.gl.getExtension('WEBGL_lose_context'); assert(extension, 'Context loss extension unavailable');
    await observeLoss(system.renderer);
    assert(fixture.classList.contains('fallback'), 'Fallback styling not enabled');
    keys(xy.element.querySelector('.lg-xy-pad'),'ArrowRight'); assert(xy.value.x === 1, 'Fallback keyboard control');
    xy.setVariant('point'); assert(xy.value.x === 1, 'Fallback variant change');
  }); cleanup();
  const passed = checks.filter(check => check.pass).length;
  window.matchMedia = originalMatchMedia;
  details.textContent = checks.map(check => `${check.pass?'PASS':'FAIL'} ${check.name}${check.error?` — ${check.error}`:''}`).join('\n');
  document.querySelector('#result').textContent = `${passed}/${checks.length} checks passed`;
  document.querySelector('#result').dataset.passed = String(passed === checks.length);
  document.querySelector('#run').disabled = false;
});
