import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Read-only inspection of the explicitly selected Android showcase via USB ADB.
const endpoint=process.argv[2];
if(!endpoint?.startsWith('ws://127.0.0.1:'))throw new Error('A local forwarded DevTools endpoint is required.');
const socket=new WebSocket(endpoint),pending=new Map(),events=[];
let sequence=0;
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
socket.onmessage=event=>{
  const message=JSON.parse(event.data);
  if(message.id){const task=pending.get(message.id);pending.delete(message.id);clearTimeout(task?.timeout);message.error?task?.reject(message.error):task?.resolve(message.result);}
  else if(['Runtime.exceptionThrown','Runtime.consoleAPICalled','Log.entryAdded'].includes(message.method))events.push(message);
};
function send(method,params={}){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout: ${method}`));},10000);
    pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));
  });
}
try{
  await send('Runtime.enable');await send('Log.enable');
  const result=await send('Runtime.evaluate',{returnByValue:true,expression:`(() => ({
    title:document.title, protocol:location.protocol, ready:document.readyState,
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
    samples:[...document.querySelectorAll('[data-component-name]')].map(x=>x.dataset.componentName),
    scripts:[...document.scripts].filter(x=>x.type!=='application/json').map(x=>({type:x.type,length:x.textContent.length,hasLostGuard:x.textContent.includes('this.gl.isContextLost?.()')})),
    canvases:[...document.querySelectorAll('canvas')].map(canvas=>{
      const gl=(!canvas.dataset.gpuState||canvas.dataset.gpuState==='active')?canvas.getContext('webgl2'):null,stage=canvas.parentElement,rect=canvas.getBoundingClientRect();
      return {className:canvas.className,gpuState:canvas.dataset.gpuState,stage:stage.className,sample:stage.closest('[data-component-name]')?.dataset.componentName,width:canvas.width,height:canvas.height,visible:rect.width>0&&rect.height>0,hidden:canvas.hidden,
        webgl:!!gl,lost:gl?.isContextLost(),renderer:gl&&!gl.isContextLost()?gl.getParameter(gl.RENDERER):null,
        maxTexture:gl&&!gl.isContextLost()?gl.getParameter(gl.MAX_TEXTURE_SIZE):null};
    }),
    fallbackStages:[...document.querySelectorAll('.fallback')].map(x=>({className:x.className,sample:x.closest('[data-component-name]')?.dataset.componentName})),
    controls:document.querySelectorAll('button,input,select').length
  }))()`});
  await new Promise(resolve=>setTimeout(resolve,400));
  const report={capturedAt:new Date().toISOString(),page:result.result?.value,exception:result.exceptionDetails,events};
  const output=resolve(import.meta.dirname,'../android-inspection.json');
  await writeFile(output,JSON.stringify(report,null,2));
  if(process.argv.includes('--check')){
    const lost=report.page?.canvases.filter(canvas=>canvas.lost)||[];
    const count=report.page?.samples.length||0;
    console.log(JSON.stringify({samples:count,canvases:report.page?.canvases.length,lost:lost.length,affected:lost.map(canvas=>canvas.sample||canvas.stage),report:output},null,2));
    if(count!==22||lost.length)process.exitCode=1;
  }else console.log(JSON.stringify(report,null,2));
}finally{socket.close();}
