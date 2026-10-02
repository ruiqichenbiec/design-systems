import {GlassRenderer} from '../design-system/internal/renderer.js';

const cardRendererStage = fixture => {
  const stage=document.createElement('div'),canvas=document.createElement('canvas');
  stage.style.cssText='position:relative;width:360px;height:220px;padding:0;overflow:hidden';
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  stage.append(canvas);fixture.append(stage);
  return {stage,canvas};
};
const cardRendererSurface = (kind='panel') => {
  const element=document.createElement('div');element.dataset.glass=kind;return element;
};
const cardRendererPixels = (renderer,now) => {
  cancelAnimationFrame(renderer.frame);renderer.frame=0;renderer.visible=true;renderer.render(now);
  const data=new Uint8Array(renderer.width*renderer.height*4);
  renderer.gl.readPixels(0,0,renderer.width,renderer.height,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,data);
  return data;
};
const cardRendererRegionDifference = (renderer,a,b,{left,top,right,bottom}) => {
  const x0=Math.max(0,Math.floor(left*renderer.dpr)),x1=Math.min(renderer.width,Math.ceil(right*renderer.dpr));
  const y0=Math.max(0,Math.floor((renderer.stage.clientHeight-bottom)*renderer.dpr)),y1=Math.min(renderer.height,Math.ceil((renderer.stage.clientHeight-top)*renderer.dpr));
  let changed=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const i=(y*renderer.width+x)*4;
    if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>8)changed++;
  }
  return changed;
};

export async function runCardRendererChecks({test,assert,fixture,tick,until}) {
  await test('Card renderer: descendant scroll invalidates and remeasures glass geometry',async()=>{
    const {stage,canvas}=cardRendererStage(fixture),viewport=document.createElement('div'),strip=document.createElement('div'),first=cardRendererSurface(),second=cardRendererSurface();
    viewport.dataset.lgClip='true';viewport.style.cssText='position:absolute;left:50px;top:40px;width:190px;height:120px;overflow-x:auto;overflow-y:hidden';
    strip.style.cssText='display:flex;gap:20px;width:500px;height:100px';
    for(const surface of [first,second])surface.style.cssText='flex:0 0 150px;height:90px;border-radius:24px';
    strip.append(first,second);viewport.append(strip);stage.append(viewport);
    const renderer=new GlassRenderer(canvas,stage,{scene:'grid',motion:false});
    stage.scrollIntoView({block:'center'});await until(()=>renderer.gl&&!renderer.suspended,'Card GPU becomes ready');
    try{
      await tick();renderer.visible=true;renderer.render(performance.now());
      const before=renderer.geometry.find(item=>item.el===second).x;
      viewport.scrollLeft=96;viewport.dispatchEvent(new Event('scroll'));
      assert(renderer.rectDirty,'A captured descendant scroll must dirty geometry');
      await until(()=>renderer.geometry.find(item=>item.el===second)?.x<before-80*renderer.dpr,'Scrolled glass geometry must be remeasured');
    }finally{renderer.destroy();stage.remove();}
  });

  await test('Card renderer: overflow clip isolates real GPU pixels without changing the full lens box',async()=>{
    const {stage,canvas}=cardRendererStage(fixture),viewport=document.createElement('div'),surface=cardRendererSurface();
    viewport.dataset.lgClip='true';viewport.style.cssText='position:absolute;left:80px;top:50px;width:120px;height:110px;overflow:hidden';
    surface.style.cssText='position:absolute;left:-40px;top:10px;width:180px;height:80px;border-radius:24px';
    viewport.append(surface);stage.append(viewport);
    const renderer=new GlassRenderer(canvas,stage,{scene:'grid',motion:false});
    stage.scrollIntoView({block:'center'});await until(()=>renderer.gl&&!renderer.suspended,'Card GPU becomes ready');
    try{
      await tick();const now=performance.now()+1000;
      renderer.settings.opaque=true;const flat=cardRendererPixels(renderer,now);
      renderer.settings.opaque=false;renderer.rectDirty=true;const glass=cardRendererPixels(renderer,now);
      const geometry=renderer.geometry.find(item=>item.el===surface);
      assert(Math.abs(geometry.w-180*renderer.dpr)<2,'Clipping must preserve the complete lens width used by uBox');
      const inside=cardRendererRegionDifference(renderer,flat,glass,{left:90,top:65,right:190,bottom:135});
      const outside=cardRendererRegionDifference(renderer,flat,glass,{left:42,top:65,right:72,bottom:135});
      assert(inside>40,'The visible part of the clipped lens must affect framebuffer pixels');
      assert(outside===0,`The clipped part must not affect pixels outside its viewport (changed ${outside})`);
      assert(renderer.gl.getError()===renderer.gl.NO_ERROR,'Clipped lens rendering must not produce a WebGL error');
    }finally{renderer.destroy();stage.remove();}
  });

  await test('Card renderer: glass ancestors composite before nested controls',async()=>{
    const {stage,canvas}=cardRendererStage(fixture),parent=cardRendererSurface('panel'),child=cardRendererSurface('button'),sibling=cardRendererSurface('optical-well');
    parent.style.cssText='position:absolute;left:30px;top:30px;width:260px;height:150px;border-radius:28px';
    child.style.cssText='width:110px;height:44px;border-radius:22px';sibling.style.cssText='position:absolute;left:310px;top:40px;width:30px;height:30px;border-radius:15px';
    parent.append(child);stage.append(parent,sibling);
    const renderer=new GlassRenderer(canvas,stage,{scene:'grid',motion:false});
    stage.scrollIntoView({block:'center'});await until(()=>renderer.gl&&!renderer.suspended,'Card GPU becomes ready');
    try{
      renderer.readGeometry();
      assert(renderer.geometry.indexOf(renderer.geometry.find(item=>item.el===parent))<renderer.geometry.indexOf(renderer.geometry.find(item=>item.el===child)),'A parent card must composite before its nested glass control');
    }finally{renderer.destroy();stage.remove();}
  });
}
