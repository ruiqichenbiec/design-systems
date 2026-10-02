import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const endpoint=process.argv[2],socket=new WebSocket(endpoint),pending=new Map(),events=[];
let sequence=0;
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const task=pending.get(msg.id);pending.delete(msg.id);clearTimeout(task?.timeout);msg.error?task?.reject(msg.error):task?.resolve(msg.result);}else if(['Runtime.exceptionThrown','Log.entryAdded'].includes(msg.method))events.push(msg);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timeout=setTimeout(()=>reject(new Error(method+' timed out')),15000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const output=resolve(import.meta.dirname,'../verification/android');await mkdir(output,{recursive:true});
const steps=[];
const inspect=`(() => {
  const docs=[document,...[...document.querySelectorAll('iframe')].map(f=>f.contentDocument).filter(Boolean)];
  const surfaces=docs.flatMap(doc=>[...doc.querySelectorAll('canvas[data-gpu-state]')].map(canvas=>{
    const stage=canvas.parentElement,r=stage.getBoundingClientRect(),w=doc.defaultView;
    const visible=stage.getClientRects().length>0&&r.bottom>0&&r.right>0&&r.top<w.innerHeight&&r.left<w.innerWidth&&!doc.hidden;
    const gl=canvas.dataset.gpuState==='active'?canvas.getContext('webgl2'):null;
    let painted=false;
    if(gl&&!gl.isContextLost()&&!canvas.hidden){const pixel=new Uint8Array(4);gl.readPixels(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);painted=pixel[3]>0;}
    return {stage:stage.className,state:canvas.dataset.gpuState,visible:!!visible,active:!!gl&&!gl.isContextLost(),painted};
  }));
  return {leases:[...window[Symbol.for('lens.viewport-gpu-budget.v1')].budget.clients].map(e=>({active:e.active,priority:e.priority()})),count:document.querySelectorAll('[data-component-name]').length,active:surfaces.filter(s=>s.active).length,bad:surfaces.filter(s=>s.visible&&(!s.active||!s.painted)),surfaces};
})()`;
async function verify(label){
  let result;
  for(let i=0;i<30;i++){await wait(150);result=await evaluate(inspect);if(!result.bad.length)break;}
  steps.push({label,...result});
  console.log(JSON.stringify({label,active:result.active,bad:result.bad}));
  assert(result.active<=6,'GPU budget exceeded');assert.equal(result.bad.length,0,`${label}: a visible surface is not painted`);
}
async function shot(name){const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(output,name+'.png'),Buffer.from(data,'base64'));}
async function touch(selector,dx=0,dy=0){
  const point=await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await verify('touch-ready');
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  if(dx||dy)for(let i=1;i<=8;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx*i/8,y:point.y+dy*i/8}]});await wait(20);}
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(250);
}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');events.length=0;
  const protocol=await evaluate('location.protocol');
  if(protocol==='http:'||protocol==='https:')await send('Page.reload',{ignoreCache:true});
  await wait(800);
  await verify('initial');await shot('initial');
  assert.equal(await evaluate('document.querySelectorAll("[data-component-name]").length'),22);
  await touch('.sc-material-stage [role=slider]',65,20);
  assert.notEqual(await evaluate('document.querySelector(".sc-material-stage [role=slider]").getAttribute("aria-valuenow")'),'50','Touch lens did not move');
  await touch('#component-button button:not(:disabled)');
  assert(await evaluate('document.querySelector("#component-button").textContent.includes("已保存")'),'Touch save did not respond');
  const names=await evaluate('[...document.querySelectorAll("[data-component-name]")].map(e=>e.dataset.componentName)');
  for(const name of names){await evaluate(`document.querySelector('[data-component-name="${name}"]').scrollIntoView({block:'center'})`);await verify(name);}
  await shot('records');
  await evaluate('document.querySelector(".sc-language").click()');await verify('English');
  assert(await evaluate('document.querySelector("#component-button").textContent.includes("Saved")'),'Language switch reset saved state');
  await evaluate('document.querySelector("#material").scrollIntoView()');await verify('return-to-top');await shot('return-top');
  await evaluate('document.querySelector(".sc-footer-links a:last-child").click()');await wait(500);await verify('embedded-lab');await shot('lab');
  await evaluate('document.querySelector(".offline-back").click()');await verify('close-lab');
  await evaluate('document.querySelector(".sc-language").click()');await verify('Chinese');
  await evaluate('document.querySelector("#material").scrollIntoView()');await verify('final');
  const errors=events.filter(e=>e.method==='Runtime.exceptionThrown'||/Too many active WebGL|Incomplete scene framebuffer|restoreContext:/.test(e.params?.entry?.text||''));
  assert.equal(errors.length,0,JSON.stringify(errors));
  await writeFile(resolve(output,'results.json'),JSON.stringify({status:'passed',steps,events},null,2));
  console.log('PASS: 22 examples, touch input, scrolling/restoration, language state, embedded lab, GPU pixels and budget.');
}catch(error){await writeFile(resolve(output,'results.json'),JSON.stringify({status:'failed',error:String(error),steps,events},null,2));throw error;}
finally{socket.close();}
