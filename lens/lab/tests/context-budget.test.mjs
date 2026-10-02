import test from 'node:test';
import assert from 'node:assert/strict';
import {ContextBudget,viewportPriority} from '../design-system/internal/context-budget.js';
import {GlassRenderer} from '../design-system/internal/renderer.js';
import {ChartGlass} from '../design-system/internal/chart-glass.js';

test('13 showcase surfaces never allocate more than six live contexts',()=>{
  const budget=new ContextBudget(6),ranks=Array(13).fill(-Infinity),events=[];let live=0,peak=0;
  for(let i=0;i<13;i++)budget.add({priority:()=>ranks[i],activate(){peak=Math.max(peak,++live);events.push(`+${i}`);},suspend(){live--;events.push(`-${i}`);}});
  budget.update();assert.equal(live,0);
  ranks.fill(1);budget.update();assert.equal(live,6);
  ranks.fill(-Infinity,0,6);budget.update();assert.equal(live,6);assert.equal(peak,6);
  assert.deepEqual(events.slice(6,12),['-0','-1','-2','-3','-4','-5']);
  ranks.fill(-Infinity);budget.update();assert.equal(live,0);
});

test('scrolling away and back restores a surface without resetting its model',()=>{
  const budget=new ContextBudget(1),state={value:72},visible={a:true,b:false};let mounts=0;
  const a=budget.add({priority:()=>visible.a?1:-Infinity,activate(){mounts++;assert.equal(state.value,72);},suspend(){}});
  budget.add({priority:()=>visible.b?1:-Infinity,activate(){},suspend(){}});
  budget.update();visible.a=false;visible.b=true;budget.update();visible.a=true;visible.b=false;budget.update();
  assert.equal(mounts,2);a.destroy();assert.equal(a.active,false);assert.equal(budget.clients.size,1);
});

test('hidden and detached hosts cannot claim a viewport lease',()=>{
  const win={innerWidth:400,innerHeight:800,getComputedStyle:()=>({visibility:'visible'})};
  const host={isConnected:true,ownerDocument:{defaultView:win,hidden:false},getClientRects:()=>[{}],getBoundingClientRect:()=>({left:0,right:300,top:900,bottom:1000,width:300,height:100})};
  assert.equal(viewportPriority(host),-Infinity);
  host.getBoundingClientRect=()=>({left:0,right:300,top:0,bottom:100,width:300,height:100});assert(Number.isFinite(viewportPriority(host)));
  host.ownerDocument.hidden=true;assert.equal(viewportPriority(host),-Infinity);
});

test('ordinary and chart glass restore through the cached extension after context loss',()=>{
  for(const Renderer of [GlassRenderer,ChartGlass]){
    let restores=0;
    const renderer={lossObserved:true,canvas:{dataset:{}},gl:{isContextLost:()=>true,getExtension(){assert.fail('Extensions cannot be queried on a lost context');}},contextExtension:{restoreContext(){restores++;}}};
    Renderer.prototype.resumeGPU.call(renderer);assert.equal(restores,1);
    renderer.lossObserved=false;Renderer.prototype.resumeGPU.call(renderer);assert.equal(restores,1,'Restoration must wait for the loss event');
  }
});
