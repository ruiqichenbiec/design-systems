(function(O){
  'use strict';
  // Interaction sounds (1.3): short Web Audio syntheses of the darkroom's mechanics. Off by default;
  // nothing is created or played until Overture.setSound(true) is called from a user gesture.
  let ctx=null,master=null,noise=null,enabled=false;const last=new Map();
  const gap={tick:30,shutter:70,lever:70,paper:90,drop:90,silk:160,iris:140,cut:90};
  function init(){
    if(ctx)return ctx;const Audio=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);if(!Audio)return null;
    ctx=new Audio();master=ctx.createGain();master.gain.value=.34;
    const glue=ctx.createDynamicsCompressor();glue.threshold.value=-20;glue.ratio.value=3;glue.attack.value=.002;glue.release.value=.12;master.connect(glue).connect(ctx.destination);
    noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noise.getChannelData(0);let seed=11;for(let i=0;i<d.length;i++){seed=(seed*1664525+1013904223)>>>0;d[i]=seed/2147483648-1;}
    return ctx;
  }
  function bus(pan){if(!ctx.createStereoPanner)return master;const p=ctx.createStereoPanner();p.pan.value=Math.max(-.6,Math.min(.6,pan||0));p.connect(master);return p;}
  // Three ingredients: a filtered noise click, a pitched thump and a sweeping hiss.
  function click(t,to,{freq=3000,q=1,decay=.006,gain=.4}){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+decay*6);s.connect(f).connect(g).connect(to);s.start(t,Math.random()*.8);s.stop(t+decay*6+.02);}
  function thump(t,to,{freq=120,decay=.1,gain=.3}){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq*1.7,t);o.frequency.exponentialRampToValueAtTime(freq,t+.03);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+decay);o.connect(g).connect(to);o.start(t);o.stop(t+decay+.02);}
  function hiss(t,to,{from=900,to:end=2600,dur=.16,gain=.12,q=.9}){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;s.loop=true;f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(end,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+dur*.25);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(to);s.start(t,Math.random()*.8);s.stop(t+dur+.02);}
  const voices={
    tick:(t,d,o)=>click(t,d,{freq:3800*o.pitch,q:5,decay:.0025,gain:.2*o.gain}),                       // ratchet, counter, detent
    shutter:(t,d,o)=>{click(t,d,{freq:3400,q:1.4,decay:.005,gain:.5*o.gain});thump(t+.004,d,{freq:150,decay:.08,gain:.18*o.gain});click(t+.058,d,{freq:2500*o.pitch,q:1.1,decay:.007,gain:.34*o.gain});},
    lever:(t,d,o)=>{click(t,d,{freq:1900,q:2,decay:.008,gain:.3*o.gain});thump(t+.002,d,{freq:95,decay:.11,gain:.26*o.gain});click(t+.02,d,{freq:3200,q:3,decay:.003,gain:.14*o.gain});},
    paper:(t,d,o)=>hiss(t,d,{from:700*o.pitch,to:2400*o.pitch,dur:.17,gain:.1*o.gain}),                 // a print sliding, a sheet unfolding
    drop:(t,d,o)=>{thump(t,d,{freq:105,decay:.15,gain:.34*o.gain});click(t,d,{freq:800,q:.8,decay:.012,gain:.12*o.gain});},
    silk:(t,d,o)=>{hiss(t,d,{from:380,to:1500,dur:.42,gain:.07*o.gain,q:.6});hiss(t+.05,d,{from:900,to:420,dur:.36,gain:.04*o.gain,q:.7});},
    iris:(t,d,o)=>{for(let i=0;i<6;i++)click(t+i*.022,d,{freq:2600+i*260,q:4,decay:.002,gain:.15*o.gain});thump(t+.14,d,{freq:130,decay:.07,gain:.12*o.gain});},
    cut:(t,d,o)=>{click(t,d,{freq:2800,q:2.2,decay:.004,gain:.22*o.gain});hiss(t+.01,d,{from:1700,to:600,dur:.13,gain:.05*o.gain});}
  };
  function play(name,opts={}){
    if(!(enabled||opts.force)||!voices[name]||!init())return false;
    const now=performance.now();if(!opts.force&&now-(last.get(name)||0)<(gap[name]||40))return false;last.set(name,now);
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    let pan=opts.pan;if(pan===undefined&&opts.at?.getBoundingClientRect){const r=opts.at.getBoundingClientRect();pan=((r.left+r.width/2)/Math.max(1,innerWidth))*2-1;}
    voices[name](ctx.currentTime+.004,bus(pan||0),{gain:Math.max(0,Math.min(1.5,opts.gain??1)),pitch:opts.pitch??(1+(Math.random()-.5)*.08)});
    return true;
  }
  function set(on){enabled=!!on;if(enabled&&init())ctx.resume().catch(()=>{});if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('ov:sound',{detail:{enabled}}));return enabled;}
  O.sound={play,set,voices:Object.keys(voices),get enabled(){return enabled;}};
  O.setSound=set;
})(globalThis.Overture);
