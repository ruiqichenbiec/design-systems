import test from 'node:test';
import assert from 'node:assert/strict';
import {GlassRenderer} from '../design-system/internal/renderer.js';

function artworkFixture(artwork) {
  const context = {};
  const canvas = {width:0,height:0,getContext:type=>type==='2d'?context:null};
  const uploads=[];
  const gl={
    TEXTURE_2D:1,RGBA:2,UNSIGNED_BYTE:3,UNPACK_FLIP_Y_WEBGL:4,
    bindTexture(){},pixelStorei(){},texImage2D(...args){uploads.push(args);}
  };
  return {
    context,canvas,uploads,
    renderer:{artwork,settings:{scene:'aurora'},width:320,height:180,dpr:2,gl,textures:{art:{}},invalidate(){}},
  };
}

test('custom artwork exclusively draws and uploads the sampled scene texture',()=>{
  const previousDocument=globalThis.document;
  const calls=[];const fixture=artworkFixture((context,info)=>calls.push({context,info}));
  globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return fixture.canvas;}};
  try{
    GlassRenderer.prototype.setScene.call(fixture.renderer,'ocean');
  }finally{
    globalThis.document=previousDocument;
  }
  assert.deepEqual(calls,[{context:fixture.context,info:{width:320,height:180,dpr:2,scene:'ocean'}}]);
  assert.equal(fixture.renderer.settings.scene,'ocean');
  assert.equal(fixture.uploads.length,1);
  assert.equal(fixture.uploads[0].at(-1),fixture.canvas);
});

test('setting the same scene redraws custom artwork',()=>{
  let draws=0;
  const renderer={artwork:()=>draws++,settings:{scene:'aurora'},setScene:GlassRenderer.prototype.setScene,invalidate(){},width:1,height:1,dpr:1,gl:{TEXTURE_2D:1,RGBA:2,UNSIGNED_BYTE:3,UNPACK_FLIP_Y_WEBGL:4,bindTexture(){},pixelStorei(){},texImage2D(){}},textures:{art:{}}};
  const previousDocument=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({})})};
  try{
    GlassRenderer.prototype.set.call(renderer,{scene:'aurora'});
  }finally{
    globalThis.document=previousDocument;
  }
  assert.equal(draws,1);
});

test('resize redraws custom artwork at the new backing-store size',()=>{
  const previousDocument=globalThis.document,previousDpr=globalThis.devicePixelRatio;
  const calls=[];const fixture=artworkFixture((context,info)=>calls.push(info));
  Object.assign(fixture.renderer,{
    width:0,height:0,canvas:{width:0,height:0},stage:{getBoundingClientRect:()=>({width:200,height:100})},
    targets:[{texture:{},framebuffer:{}}],rectDirty:false,setScene:GlassRenderer.prototype.setScene
  });
  Object.assign(fixture.renderer.gl,{FRAMEBUFFER:5,FRAMEBUFFER_COMPLETE:6,COLOR_ATTACHMENT0:7,checkFramebufferStatus:()=>6,bindFramebuffer(){}});
  globalThis.document={createElement:()=>fixture.canvas};globalThis.devicePixelRatio=1.5;
  try{
    GlassRenderer.prototype.resize.call(fixture.renderer);
  }finally{
    globalThis.document=previousDocument;globalThis.devicePixelRatio=previousDpr;
  }
  assert.deepEqual(calls,[{width:300,height:150,dpr:1.5,scene:'aurora'}]);
  assert.equal(fixture.renderer.canvas.width,300);assert.equal(fixture.renderer.canvas.height,150);
});

test('the default grid scene still draws its built-in hello artwork',()=>{
  const previousDocument=globalThis.document;
  const labels=[];
  const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(...args){labels.push(args);}};
  const fixture=artworkFixture(null);fixture.canvas.getContext=()=>context;
  globalThis.document={createElement:()=>fixture.canvas};
  try{
    GlassRenderer.prototype.setScene.call(fixture.renderer,'grid');
  }finally{
    globalThis.document=previousDocument;
  }
  assert.deepEqual(labels,[['hello.',320*.47,180*.49]]);
});

test('late resize does not touch torn-down or lost WebGL resources',()=>{
  for(const state of [{destroyed:true},{lost:true},{gl:{isContextLost:()=>true}}]){
    const renderer={gl:{isContextLost:()=>false},stage:{getBoundingClientRect(){assert.fail('invalid renderer was resized');}},...state};
    assert.doesNotThrow(()=>GlassRenderer.prototype.resize.call(renderer));
  }
});

test('renderer teardown releases its WebGL context after deleting resources',()=>{
  const previousCancel=globalThis.cancelAnimationFrame,events=[];
  globalThis.cancelAnimationFrame=()=>{};
  const renderer={frame:0,abort:{abort(){}},resizeObserver:{disconnect(){}},mutationObserver:{disconnect(){}},intersectionObserver:{disconnect(){}},programs:{},textures:{},targets:[],gl:{
    deleteBuffer(){events.push('buffer');},deleteVertexArray(){events.push('vao');},
    getExtension(name){assert.equal(name,'WEBGL_lose_context');return {loseContext(){events.push('context');}}},
  }};
  try{GlassRenderer.prototype.destroy.call(renderer);}finally{globalThis.cancelAnimationFrame=previousCancel;}
  assert.equal(renderer.destroyed,true);assert.deepEqual(events,['buffer','vao','context']);
});
