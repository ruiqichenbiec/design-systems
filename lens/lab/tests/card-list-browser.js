import {createComponent,createGlassSystem} from '../design-system/index.js';
import {runCardRendererChecks} from './card-list-renderer-browser.js';

const fixture=document.querySelector('#fixture'),result=document.querySelector('#result'),details=document.querySelector('#details');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const until=async(predicate,message,timeout=3500)=>{const start=performance.now();while(!predicate()&&performance.now()-start<timeout)await tick();assert(predicate(),message);};
const checks=[];
const test=async(name,run)=>{try{await run();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}details.textContent=checks.map(check=>`${check.pass?'PASS':'FAIL'} ${check.name}${check.error?' — '+check.error:''}`).join('\n');};
const pointer=(target,type,x=70,y=90)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,button:0,isPrimary:true,pointerId:91,clientX:x,clientY:y}));
const mountList=(props,options={})=>{
  fixture.replaceChildren();fixture.style.width='min(720px,100%)';
  const list=createComponent('card-list',props);fixture.append(list.element);
  const system=createGlassSystem(fixture,{scene:'grid',motion:false,audio:{enabled:false,storage:null},...options});
  return {list,system,close(){system.destroy();list.destroy();fixture.replaceChildren();fixture.className='';}};
};
document.querySelector('#run').addEventListener('click',async()=>{
  const run=document.querySelector('#run');run.disabled=true;checks.length=0;result.textContent='Running';details.textContent='';
  // Test both motion policies explicitly, independent of the host OS preference.
  const systemMatchMedia=window.matchMedia,standardMotion=new EventTarget();standardMotion.matches=false;
  window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?standardMotion:systemMatchMedia(query);
  await test('Composition: flat icon and text coexist with multiple live child controls',async()=>{
    let clicks=0;
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');
    const progress=createComponent('progress',{label:'Reading progress',value:31,completionColor:'gold',motion:'off'});
    const slider=createComponent('slider',{label:'Adjust reading',value:31,onChange:value=>progress.setValue(value)});
    const button=createComponent('button',{label:'Complete reading',onPress:()=>{clicks++;progress.setValue(100);}});
    const view=mountList({label:'Library',items:[{id:'reader',label:'Reader',icon,description:'An app with three controls',children:[slider,progress,button]}]});
    try{
      await tick();const card=fixture.querySelector('.lg-lens-card');
      assert(card.dataset.lgLens==='panel','Card reuses the panel lens foundation');
      assert(button.element.dataset.lgLens==='button'&&slider.element.querySelector('[data-lg-lens=thumb]'),'Nested actions reuse lens bodies');
      assert(card.contains(icon)&&card.querySelector('h3').textContent==='Reader','Flat icon and title are present together');
      const input=slider.element.querySelector('input');input.value='83';input.dispatchEvent(new Event('input',{bubbles:true}));
      assert(progress.value===83,'Nested slider updates the actual progress component');
      button.element.click();assert(clicks===1&&progress.value===100,'Nested button acts once');
      assert(fixture.querySelector('.lg-card-list-navigation').hidden,'Navigation hides when cards fit');
      const free=createComponent('lens',{label:'Shared free lens'});assert(free.element.dataset.lgLens==='free','Free lens shares the same foundation');free.destroy();
    }finally{view.close();}
  });
  await test('Native pan and nested controls: the card never steals button or slider gestures',async()=>{
    const button=createComponent('button',{label:'Action'}),slider=createComponent('slider',{label:'Level'});
    const view=mountList({label:'Gesture list',items:[{id:'controls',label:'Controls',children:[button,slider]},{id:'second',label:'Second'},{id:'third',label:'Third'}]});
    try{
      await tick();const card=fixture.querySelector('.lg-lens-card'),heading=card.querySelector('h3'),body=view.system.jelly.bodies.get(card);
      assert(body.mode==='press','List cards use the non-capturing shared press mode');
      assert(pointer(heading,'pointerdown'),'A card press must not prevent native scrolling');
      assert(view.system.jelly.gesture.body===body,'Blank card region starts its lens response');
      pointer(window,'pointermove',125,100);await tick();
      assert(body.press.value>0&&body.x.target>0,'The card lifts and deforms using shared springs');
      pointer(window,'pointercancel',125,100);
      assert(!view.system.jelly.gesture&&body.x.target===0&&body.press.target===0,'Native pan cancellation releases the card');
      button.element.setPointerCapture=()=>{};button.element.hasPointerCapture=()=>false;
      pointer(button.element,'pointerdown');
      assert(view.system.jelly.gesture.body.element===button.element&&!body.held,'Button owns its gesture');
      pointer(window,'pointerup');
      pointer(slider.element.querySelector('input'),'pointerdown');
      assert(view.system.jelly.gesture.body.mode==='range'&&!body.held,'Slider owns its gesture');
      pointer(window,'pointerup');
    }finally{view.close();}
  });
  await test('Horizontal navigation: buttons, keyboard, narrow width and stable card IDs',async()=>{
    const view=mountList({label:'Scrollable apps',items:Array.from({length:4},(_,i)=>({id:`app-${i}`,label:`App ${i}`}))});
    try{
      fixture.style.width='320px';await tick();
      const viewport=fixture.querySelector('.lg-card-list-viewport'),buttons=fixture.querySelectorAll('.lg-card-list-navigation button:not(.lg-card-list-playback)');
      assert(viewport.scrollWidth>viewport.clientWidth&&!buttons[1].disabled,'List overflows internally and can advance');
      const card=fixture.querySelector('.lg-lens-card');assert(Math.abs(card.offsetWidth/card.offsetHeight-16/9)<.025,'Cards keep a landscape ratio in a narrow embedded list');
      assert(!view.list.scrollTo('missing'),'Unknown card IDs are rejected');
      viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
      await until(()=>buttons[1].disabled&&viewport.scrollLeft>0,'End reaches the last card');
      const end=viewport.scrollLeft;buttons[0].click();await until(()=>viewport.scrollLeft<end-20,'Previous reveals an earlier card');
      view.list.scrollTo('app-0',{behavior:'auto'});await until(()=>buttons[0].disabled,'First card disables previous');
      const before=viewport.scrollLeft;
      const child=document.createElement('input');child.type='range';card.append(child);
      child.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
      assert(viewport.scrollLeft===before,'Arrow keys from nested controls must not navigate the row');
    }finally{view.close();}
  });
  await test('Validation, optional headings, empty state and owned lifecycle',async()=>{
    let destroyed=0;
    const child={element:document.createElement('button'),destroy(){destroyed++;}};
    const origin=document.createElement('div');origin.append(child.element);
    let rejected=false;
    try{createComponent('card-list',{label:'Invalid',items:[{id:'same',label:'One',children:[child]},{id:'same',label:'Two'}]});}catch{rejected=true;}
    assert(rejected&&child.element.parentElement===origin&&destroyed===0,'Invalid input does not move or destroy caller content');
    rejected=false;try{createComponent('card-list',{label:'Invalid',items:[{id:'one',label:'One',children:[child,child]}]});}catch{rejected=true;}
    assert(rejected,'A child handle cannot be owned twice');
    const view=mountList({label:'Only controls',items:[{id:'one',label:'Accessible app name',title:'',children:[child]}]});
    try{
      const card=fixture.querySelector('.lg-lens-card');assert(card.getAttribute('aria-label')==='Accessible app name'&&!card.hasAttribute('aria-labelledby'),'Hidden visible titles keep the accessible name');
      view.list.destroy();view.list.destroy();assert(destroyed===1,'Child handles are destroyed once');
      assert(!view.list.scrollTo('one'),'Destroyed list rejects navigation');
    }finally{view.close();}
    const empty=mountList({label:'Empty',items:[],emptyLabel:'Nothing here'});
    try{assert(!fixture.querySelector('.lg-card-list-empty').hidden&&fixture.querySelector('.lg-card-list-empty').textContent==='Nothing here','Empty copy is visible');assert(fixture.querySelector('.lg-card-list-navigation').hidden,'Empty list has no navigation');}finally{empty.close();}
  });
  await test('Reduced motion and unavailable WebGL preserve native controls',async()=>{
    const canvas=document.createElement('canvas');canvas.getContext=()=>null;
    let pressed=0;
    const button=createComponent('button',{label:'Fallback action',onPress:()=>pressed++});
    const view=mountList({label:'Fallback list',items:[{id:'one',label:'One',children:[button]},{id:'two',label:'Two'},{id:'three',label:'Three'}]},{canvas});
    const original=window.matchMedia;
    try{
      await tick();assert(fixture.classList.contains('fallback'),'Failed WebGL enables the shared CSS fallback');button.element.click();assert(pressed===1,'Fallback action works');
      let scrollBehavior;const viewport=fixture.querySelector('.lg-card-list-viewport');viewport.scrollTo=options=>{scrollBehavior=options.behavior;};
      window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?{matches:true}:original(query);
      view.list.scrollTo('three',{behavior:'smooth'});assert(scrollBehavior==='auto','Reduced motion overrides smooth navigation');
    }finally{window.matchMedia=original;view.close();}
  });
  await test('Card drag: background pans with inertia; controls and touch keep their own gestures',async()=>{
    const button=createComponent('button',{label:'Keep action'}),slider=createComponent('slider',{label:'Keep slider',value:42});
    const view=mountList({label:'Drag cards',items:[{id:'one',label:'One',children:[button,slider]},{id:'two',label:'Two'},{id:'three',label:'Three'}]});
    try{
      await tick();const viewport=fixture.querySelector('.lg-card-list-viewport'),heading=fixture.querySelector('h3');
      let captured=0;viewport.setPointerCapture=()=>captured++;viewport.hasPointerCapture=()=>false;
      pointer(heading,'pointerdown',300,90);pointer(window,'pointermove',210,92);
      assert(captured===1,'Blank card press captures immediately for release outside an iframe');
      assert(viewport.scrollLeft>=85&&view.list.element.dataset.dragging==='true','Mouse dragging card text pans the list');
      pointer(window,'pointerup',210,92);assert(!view.list.element.dataset.dragging,'Release clears grabbing state');
      pointer(heading,'pointerdown',210,92);pointer(window,'pointercancel',210,92);
      const start=viewport.scrollLeft;
      button.element.setPointerCapture=()=>{};button.element.hasPointerCapture=()=>false;
      pointer(button.element,'pointerdown',200,90);pointer(window,'pointermove',120,90);pointer(window,'pointerup',120,90);
      assert(viewport.scrollLeft===start,'Dragging a child button never scrolls the list');
      pointer(slider.element.querySelector('input'),'pointerdown',200,90);pointer(window,'pointermove',120,90);pointer(window,'pointerup',120,90);
      assert(viewport.scrollLeft===start,'A slider keeps its own gesture');
      heading.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true,pointerId:93,pointerType:'touch',clientX:300,clientY:90}));
      window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:93,pointerType:'touch',clientX:200,clientY:90}));
      assert(viewport.scrollLeft===start&&!view.list.element.dataset.dragging,'Touch remains native pan rather than double scrolling');
      window.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:93}));
    }finally{view.close();}
  });
  await test('Seamless auto loop: original controls survive recycling, with hover, focus and playback pauses',async()=>{
    let presses=0;const button=createComponent('button',{label:'Original action',onPress:()=>presses++});
    const view=mountList({label:'Loop cards',autoScroll:480,items:Array.from({length:4},(_,i)=>({id:`loop-${i}`,label:`Loop ${i}`,children:i===0?[button]:[]}))});
    try{
      fixture.scrollIntoView({block:'center'});await tick();
      const viewport=fixture.querySelector('.lg-card-list-viewport'),list=fixture.querySelector('.lg-card-list-items'),originals=[...list.children];
      assert(view.list.element.dataset.loop==='true','Enough overflow enables seamless looping');
      const card=originals[0].firstElementChild;assert(Math.abs(card.offsetWidth/card.offsetHeight-16/9)<.025,'Card has a landscape 16:9 body');
      let transitions=0,maxJump=0;const nativeAppend=list.append.bind(list);
      list.append=(node)=>{const anchor=list.children[1],before=anchor.getBoundingClientRect().left;nativeAppend(node);queueMicrotask(()=>{maxJump=Math.max(maxJump,Math.abs(anchor.getBoundingClientRect().left-before));transitions++;});};
      try{await until(()=>transitions>=2,'Autoplay crosses two seams without rewinding',6000);}catch(error){throw new Error(`${error.message}: seams=${transitions}, scroll=${viewport.scrollLeft}, hover=${view.list.element.matches(':hover')}, focus=${document.activeElement?.tagName}, bounds=${JSON.stringify(view.list.element.getBoundingClientRect().toJSON())}`);}
      assert(maxJump<28,'Recycling keeps the visible cards continuous within one animation step');
      assert(list.children.length===4&&originals.every(node=>node.parentElement===list),'No duplicate cards or action controls');
      assert(button.element===fixture.querySelector('button[aria-label="Original action"]')||card.contains(button.element),'Original live control survives loop');
      view.list.element.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));const stopped=viewport.scrollLeft;await new Promise(resolve=>setTimeout(resolve,120));
      assert(viewport.scrollLeft===stopped,'Hover pauses autoplay');
      view.list.element.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));
      view.list.pause();assert(!view.list.playing,'Pause changes user playback intent');
      const paused=viewport.scrollLeft;await new Promise(resolve=>setTimeout(resolve,120));assert(viewport.scrollLeft===paused,'Explicit pause persists');
      const next=fixture.querySelector('.lg-card-list-navigation button:last-child');next.focus({preventScroll:true});view.list.play();
      const focused=viewport.scrollLeft;await new Promise(resolve=>setTimeout(resolve,120));assert(view.list.playing&&viewport.scrollLeft===focused,'Navigation focus temporarily pauses playback intent');
      button.element.click();assert(presses===1,'Recycled action still fires once');
      viewport.scrollLeft=viewport.scrollWidth;await tick();const finalOrder=list.firstElementChild;
      next.click();await tick();assert(list.firstElementChild!==finalOrder,'Next at the physical end recycles into the next live card');
      view.list.destroy();const destroyedAt=viewport.scrollLeft;await new Promise(resolve=>setTimeout(resolve,120));assert(viewport.scrollLeft===destroyedAt,'Destroy stops autonomous scrolling');
    }finally{view.close();}
  });
  await test('Reduced-motion changes and short rows do not auto-scroll',async()=>{
    const original=window.matchMedia,reduced=new EventTarget();reduced.matches=true;
    window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?reduced:original(query);
    const view=mountList({label:'Reduced loop',autoScroll:true,items:Array.from({length:4},(_,i)=>({id:`reduced-${i}`,label:`Reduced ${i}`}))});
    try{
      fixture.scrollIntoView({block:'center'});await tick();const viewport=fixture.querySelector('.lg-card-list-viewport');
      await new Promise(resolve=>setTimeout(resolve,120));assert(viewport.scrollLeft===0&&!view.list.playing,'Reduced motion defaults to a still list');
      view.list.play();await until(()=>viewport.scrollLeft>5,'Explicit play opts in despite reduced motion',3500);
      reduced.matches=false;reduced.dispatchEvent(new Event('change'));view.list.play();
      await until(()=>viewport.scrollLeft>5,'Default low-speed autoplay advances subpixel deltas',3500);
      reduced.matches=true;reduced.dispatchEvent(new Event('change'));const start=viewport.scrollLeft;
      await new Promise(resolve=>setTimeout(resolve,120));assert(viewport.scrollLeft===start,'Preference change stops active motion');
    }finally{window.matchMedia=original;view.close();}
    const short=mountList({label:'Short list',autoScroll:true,items:[{id:'only',label:'Only'}]});
    try{await tick();assert(short.list.element.dataset.loop==='false'&&fixture.querySelector('.lg-card-list-playback').hidden,'Short content stays manual with no cloned filler');}finally{short.close();}
  });
  await runCardRendererChecks({test,assert,fixture,tick,until});
  window.matchMedia=systemMatchMedia;
  result.textContent=`${checks.filter(check=>check.pass).length}/${checks.length} passed`;
  document.documentElement.dataset.testResult=checks.every(check=>check.pass)?'passed':'failed';run.disabled=false;
});
