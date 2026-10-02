document.addEventListener('DOMContentLoaded',()=>{
  const O=Overture;O.configure({assetBase:'assets/'});const controls=[];
  const mount=(name,host,props)=>{const instance=O.mount(name,host,props);controls.push(instance);return instance;};
  mount('FlashlightFocus','#flashlight-demo',{mode:'page'});mount('PinnedPhotoWall','#wall-demo',{mode:'page'});
  const print=document.querySelector('.darkroom-print'),image=print.querySelector('img'),title=print.querySelector('.darkroom-print-title'),number=print.querySelector('.darkroom-print-number'),note=print.querySelector('.darkroom-note'),grid=print.querySelector('.darkroom-grid'),status=document.querySelector('.darkroom-status');
  let index=2,exposure=0,notes=true,frames=true,count=0,photoAnimation=null,titleField,stepper,exposureControl,tabs,syncing=false;
  function choose(n){index=O.model.clamp(n,0,O.photos.length-1);const item=O.photos[index];image.src=O.asset('photos/'+item[0]);image.alt=item[1];title.textContent=item[1];number.textContent=`${String(index+1).padStart(2,'0')} / 06`;const family=['PHOTOGRAPHY','OPERA','FASHION'].indexOf(item[2]);if(tabs&&tabs.getState().index!==family){syncing=true;tabs.setValue(family);syncing=false;}titleField?.setValue(item[1]);photoAnimation?.cancel();if(!O.reduced())photoAnimation=image.animate([{opacity:.35,transform:'translateX(6%) rotate(2deg)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});}
  tabs=mount('StageTabs','#room-tabs',{items:['摄影','歌剧','时装'],panels:['光线留下形状，观看赋予意义。','一段旋律，一个世界。','形式是情绪留下的轮廓。'],onChange:({index:i})=>{const n=[0,1,2][i];if(stepper&&!syncing)stepper.setValue(n+1);}});tabs.setValue(2);
  exposureControl=mount('Range','#room-exposure',{label:'曝光 / EXPOSURE',min:-2,max:2,step:.1,value:0,unit:' EV',onChange:({value})=>{exposure=value;image.style.filter=`brightness(${Math.pow(2,value)})`;}});
  stepper=mount('Stepper','#room-stepper',{label:'当前底片',min:1,max:6,value:3,onChange:({value})=>choose(value-1)});
  titleField=mount('TextField','#room-title',{label:'印相题名',type:'text',value:'形与色',placeholder:'为这一帧命名',help:'题名会印在相纸下方。',onChange:({value})=>{title.textContent=value;}});
  mount('Switch','#room-grid',{label:'取景标记',value:true,onChange:({value})=>{frames=value;grid.hidden=!value;}});
  mount('Check','#room-note',{label:'保留手记',value:true,onChange:({value})=>{notes=value;note.hidden=!value;}});
  mount('CueButton','#room-shutter',{label:'冲印这一帧',onActivate:async()=>{
    await image.decode();const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5efdf';ctx.fillRect(0,0,1200,1200);
    ctx.save();ctx.beginPath();ctx.rect(50,50,1100,900);ctx.clip();ctx.filter=`brightness(${Math.pow(2,exposure)})`;const scale=Math.max(1100/image.naturalWidth,900/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,50+(1100-w)/2,50+(900-h)/2,w,h);ctx.restore();
    if(frames){ctx.strokeStyle='#eae0c477';ctx.lineWidth=1;[1,2].forEach(n=>{ctx.beginPath();ctx.moveTo(50+1100*n/3,50);ctx.lineTo(50+1100*n/3,950);ctx.moveTo(50,50+900*n/3);ctx.lineTo(1150,50+900*n/3);ctx.stroke();});}
    ctx.fillStyle='#302518';ctx.font='36px sans-serif';ctx.fillText(title.textContent,50,1020,900);ctx.font='24px serif';ctx.fillText(number.textContent,1020,1020);if(notes){ctx.font='20px sans-serif';ctx.fillText(note.textContent,50,1080,1050);}ctx.font='16px sans-serif';ctx.fillText('OVERTURE / THE WAY I SEE',50,1140);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('未能生成印相，请再试一次。');O.download(blob,'overture-darkroom.png');
    print.classList.remove('is-exposing');void print.offsetWidth;print.classList.add('is-exposing');const thumb=document.createElement('img');thumb.src=canvas.toDataURL('image/png');thumb.alt=`冲印 ${title.textContent}`;const tray=document.querySelector('.darkroom-print-tray');tray.prepend(thumb);while(tray.children.length>6)tray.lastElementChild.remove();status.textContent=`第 ${++count} 张印相已导出 · 1200 × 1200 PNG`;if(!O.reduced())thumb.animate([{opacity:0,transform:'translateY(-30px) rotate(-8deg)'},{opacity:1,transform:'rotate(4deg)'}],{duration:750,easing:'cubic-bezier(.16,1,.3,1)'});
  }});
  const motion=document.getElementById('motion-toggle');function refresh(){motion.textContent=O.reduced()?'启用完整动态':'减少动态';motion.setAttribute('aria-pressed',String(O.reduced()));}refresh();motion.addEventListener('click',()=>{O.setMotion(O.reduced()?'full':'reduce');refresh();});
  window.addEventListener('pagehide',()=>{controls.forEach(c=>c.destroy());photoAnimation?.cancel();},{once:true});
});
