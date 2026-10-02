import test from 'node:test';
import assert from 'node:assert/strict';
import {GlassSound,synthesizeFriction} from '../design-system/sound.js';
import {showcaseView,showcaseRecords,showcaseLinePoints,showcaseRingPath} from '../design-system/internal/showcase-data.js';

function frictionFixture(){
  const sources=[],gains=[],filters=[];let created=0,resume;
  const parameter=()=>({value:0,events:[],setTargetAtTime(value,time,constant){this.events.push({value,time,constant});}});
  const context={state:'running',sampleRate:48000,currentTime:2,destination:{},
    createGain(){const gain={gain:parameter(),connect(){},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;},
    createBiquadFilter(){const filter={Q:parameter(),frequency:parameter(),connect(){},disconnect(){this.disconnected=true;}};filters.push(filter);return filter;},
    createBuffer:(channels,length)=>({length,copyToChannel(data){assert.equal(data.length,length);}}),
    createBufferSource(){const source={playbackRate:parameter(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(time){this.stopped=time;}};sources.push(source);return source;},
    resume(){return new Promise(resolve=>{resume=()=>{context.state='running';resolve();};});},close(){return Promise.resolve();},
  };
  const sound=new GlassSound({storage:null,contextFactory:()=>{created++;return context;}});
  return {sound,context,sources,gains,filters,get created(){return created;},resume:()=>resume()};
}

test('paper friction is original finite noise with silent loop seams and restrained energy',()=>{
  const pcm=synthesizeFriction(48000);assert.equal(pcm.length,96000);assert.equal(Math.abs(pcm[0]),0);assert.equal(Math.abs(pcm.at(-1)),0);
  let peak=0,energy=0,mean=0;for(const sample of pcm){assert(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;mean+=sample;}
  assert(peak<.8);assert(Math.sqrt(energy/pcm.length)>.025);assert(Math.abs(mean/pcm.length)<.002);assert.throws(()=>synthesizeFriction(NaN));
});
test('friction audio stays lazy and speed changes its envelope, filter and playback rate',async()=>{
  const f=frictionFixture();assert.equal(f.created,0);assert(await f.sound.startFriction());assert.equal(f.created,1);assert(f.sources[0].loop);
  const voice=f.sound.friction;assert.equal(voice.gain.gain.events.at(-1).value,0);
  f.sound.updateFriction(120);const slow=voice.gain.gain.events.at(-1).value,low=voice.filter.frequency.events.at(-1).value;
  f.sound.updateFriction(950);assert(voice.gain.gain.events.at(-1).value>slow);assert(voice.filter.frequency.events.at(-1).value>low);assert(f.sound.snapshot().frictionActive);
  f.sound.updateFriction(0);assert.equal(voice.gain.gain.events.at(-1).value,0);assert(!f.sound.snapshot().frictionActive);
  f.sound.endFriction();assert.equal(voice.source.stopped,2.09);assert.equal(f.sound.friction,null);f.sound.destroy();
});
test('mute, cancellation and a delayed audio resume cannot leave a friction loop playing',async()=>{
  const f=frictionFixture();await f.sound.startFriction();f.sound.updateFriction(500);const source=f.sources[0];f.sound.set({enabled:false});assert.equal(source.stopped,2);assert(source.disconnected);assert.equal(await f.sound.startFriction(),false);f.sound.destroy();
  const delayed=frictionFixture();delayed.context.state='suspended';const pending=delayed.sound.startFriction();delayed.sound.updateFriction(600);delayed.sound.endFriction();delayed.resume();assert.equal(await pending,false);assert.equal(delayed.sources.length,0);delayed.sound.destroy();
});
test('friction automatically becomes silent when pointer updates stop',async()=>{
  const f=frictionFixture();await f.sound.startFriction();f.sound.updateFriction(400);const voice=f.sound.friction;
  await new Promise(resolve=>setTimeout(resolve,125));assert.equal(voice.gain.gain.events.at(-1).value,0);assert(!f.sound.snapshot().frictionActive);f.sound.destroy();
});
test('all charts and the table agree on period totals and category filters',()=>{
  assert.equal(showcaseRecords.length,56);const week=showcaseView();assert.equal(week.rows.length,28);assert.equal(week.total,2030);
  assert.equal(week.daily.reduce((sum,day)=>sum+day.minutes,0),week.total);assert.equal(week.totals.reduce((sum,item)=>sum+item.minutes,0),week.total);
  const design=showcaseView({category:'design'});assert.equal(design.rows.length,7);assert.equal(design.total,850);assert(design.rows.every(row=>row.category==='design'));
  assert.equal(showcaseView({days:14}).rows.length,56);
});
test('table search, ascending/descending sort and empty results keep source data intact',()=>{
  assert(showcaseView({query:'lens'}).rows.every(row=>row.titleEn.includes('Lens')));assert.equal(showcaseView({query:'no such activity'}).rows.length,0);
  for(const query of ['2026-09-18','Sep 18','September 18','9 月 18 日','9月18日']){
    const rows=showcaseView({query}).rows;assert.equal(rows.length,4);assert(rows.every(row=>row.date==='2026-09-18'));
  }
  const asc=showcaseView({sort:'minutes',direction:'asc'}).rows,desc=showcaseView({sort:'minutes',direction:'desc'}).rows;
  assert(asc.every((row,index)=>!index||row.minutes>=asc[index-1].minutes));assert.equal(asc[0].minutes,desc.at(-1).minutes);assert(Object.isFrozen(showcaseRecords));
});
test('chart geometry stays within its plot and donut sectors produce finite closed paths',()=>{
  const data=showcaseView({days:14}),plot=showcaseLinePoints(data.daily);
  assert(plot.points.every(p=>p.x>=32&&p.x<=608&&p.y>=26&&p.y<=204));
  assert.equal(plot.points[0].x,32);assert.equal(plot.points.at(-1).x,608);
  const path=showcaseRingPath(.02,2.7);assert(path.startsWith('M'));assert(path.endsWith('Z'));assert(!/NaN|Infinity/.test(path));
});
