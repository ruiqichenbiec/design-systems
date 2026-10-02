import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tokens,resolveMaterial,GlassSound,soundCues,synthesizeCue,defineComponent,listComponents,createComponent,componentCatalog} from '../design-system/index.js';

test('Thick remains default, overrides are bounded and tokens are immutable',()=>{
  assert.deepEqual(resolveMaterial(),{refraction:.90,blur:.24,dispersion:.65});
  assert.deepEqual(resolveMaterial({blur:4}),{refraction:.90,blur:1,dispersion:.65});
  assert.throws(()=>resolveMaterial('missing'));assert.throws(()=>resolveMaterial({blur:NaN}));assert.throws(()=>{tokens.materials.thick.blur=0;});
});
test('all production cues have finite, click-free, bounded and distinct PCM',()=>{
  const signatures=new Set();for(const [name,cue] of Object.entries(soundCues)){
    const pcm=synthesizeCue(name);assert.equal(pcm.length,Math.ceil(cue.duration*48000));assert.equal(Math.abs(pcm[0]),0);assert.equal(Math.abs(pcm.at(-1)),0);
    assert(pcm.every(Number.isFinite));assert(Math.max(...pcm.map(Math.abs))<.8);assert(pcm.some(v=>Math.abs(v)>.01));signatures.add(pcm.slice(0,1000).join(','));
  }assert.equal(signatures.size,Object.keys(soundCues).length);assert.throws(()=>synthesizeCue('missing'));
});
function audioFixture(){
  let clock=1000,created=0,resume;
  const context={sampleRate:48000,currentTime:0,state:'running',destination:{},closed:false,
    createGain:()=>({gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}}),
    createBuffer:(channels,length,rate)=>({copyToChannel(pcm){assert.equal(pcm.length,length);assert.equal(rate,48000);}}),
    createBufferSource:()=>({connect(){},disconnect(){},start(){},stop(){this.stopped=true;}}),
    resume(){return new Promise(done=>{resume=()=>{context.state='running';done();};});},
    close(){context.closed=true;return Promise.resolve();}};
  const engine=new GlassSound({storage:null,contextFactory:()=>{created++;return context;},now:()=>clock});
  return {engine,context,get created(){return created;},advance:n=>{clock+=n;},finishResume:()=>resume()};
}
test('audio is lazy, rate limited, voice bounded, and mute immediately stops playback',async()=>{
  const f=audioFixture();assert.equal(f.created,0);assert(await f.engine.play('tick'));assert.equal(f.created,1);assert.equal(await f.engine.play('tick'),false);
  for(let i=0;i<12;i++){f.advance(100);assert(await f.engine.play('tick'));}assert.equal(f.engine.voices.size,6);
  f.engine.set({enabled:false});assert.equal(f.engine.voices.size,0);assert.equal(await f.engine.play('success'),false);
  f.engine.destroy();assert(f.context.closed);assert.equal(await f.engine.play('tick'),false);
});
test('a resumed context never replays an event cancelled by mute or destroy',async()=>{
  const f=audioFixture();f.context.state='suspended';const pending=f.engine.play('success');f.engine.set({enabled:false});f.finishResume();assert.equal(await pending,false);assert.equal(f.engine.played,0);
});
test('preferences survive remount; unavailable audio is a graceful fallback',async()=>{
  let saved=null;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
  const a=new GlassSound({storage});a.set({enabled:false,volume:.42});const b=new GlassSound({storage});assert.equal(b.enabled,false);assert.equal(b.volume,.42);
  const c=new GlassSound({storage:null,contextFactory:()=>null});assert.equal(await c.play('select'),false);assert.equal(c.status,'unavailable');
  c.register('custom',{duration:.1,tones:[[300,400,.1]]});assert.throws(()=>c.register('custom',{duration:.1,tones:[[300,400,.1]]}));assert.throws(()=>c.register('bad',{duration:NaN,tones:[]}));
});
test('custom component registration does not replace built-ins',()=>{
  assert.equal(listComponents().length,18);assert.deepEqual([...componentCatalog.map(entry=>entry.name)].sort(),listComponents().sort());assert.equal(new Set(componentCatalog.map(entry=>entry.name)).size,18);assert(componentCatalog.every(entry=>entry.zh&&entry.en));defineComponent('custom-fixture',props=>({element:props.label,destroy(){}}));assert.equal(createComponent('custom-fixture',{label:'Example'}).element,'Example');assert.throws(()=>defineComponent('button',()=>{}));
});
test('the design system can be copied on its own: all relative imports stay inside it',async()=>{
  const root=fileURLToPath(new URL('../design-system/',import.meta.url));
  // Only module declarations, not import examples embedded in display strings.
  const imports=/^(?:import\s*(?:[^;\r\n]*?\sfrom\s*)?|export\s+[^;\r\n]*?\sfrom\s*)['"](\.[^'"]+)['"]/gm;
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.m?js$/.test(path))for(const [,target] of (await readFile(path,'utf8')).matchAll(imports)){const resolved=resolve(dirname(path),target);assert(resolved.startsWith(root.replace(/[\\/]$/,'')+sep),`${path}: ${target} escapes package`);await readFile(resolved);}}}await walk(root);
});
