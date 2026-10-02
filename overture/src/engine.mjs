import * as THREE from './lib/three.webgpu.js';

const T=THREE.TSL;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const palette={ivory:0xeee3d0,red:0x981825};

// A fine photographic textile is mapped onto a shallow, deformable GPU surface.
// Its folds and lighting are authored in the raster; this is a 2.5D material,
// not a claim of physically simulated cloth or freely orbitable 3D photography.
export function silkPoint(u,v,amount=0.55,phase=0){
  const x=(u-.5)*6.2,y=(v-.5)*4.13,r=Math.hypot(x,y);
  const turn=(amount-.5)*.22*Math.exp(-r*r*.18),co=Math.cos(turn),si=Math.sin(turn);
  return [(x*co-y*si)*(.93+amount*.14),x*si+y*co,Math.sin(x*1.4+y*1.8+phase)*(.025+amount*.16)*Math.exp(-r*r*.08)];
}


// The cartridge label is painted once in 2D and wrapped round the cylinder (u = circumference).
export function canisterLabel(colors={}){
  const c={paper:'#efe4cf',ink:'#1b1410',accent:'#c7382a',cold:'#1f4a8f',indigo:'#23386b',...colors};
  const W=2048,H=820,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d');
  g.fillStyle=c.paper;g.fillRect(0,0,W,H);
  g.fillStyle=c.cold;g.fillRect(0,0,W,H*.16);g.fillStyle=c.indigo;g.fillRect(0,H*.86,W,H*.14);
  g.fillStyle=c.accent;g.fillRect(0,H*.16,W,H*.012);
  const face=(x0)=>{
    g.fillStyle='#f3ecdf';g.font='600 30px "Manrope", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('P R O F E S S I O N A L   ·   O V E R T U R E',x0,H*.08);
    g.fillStyle=c.accent;g.font='400 104px "Bodoni Moda", serif';g.fillText('OVERTURE',x0,H*.31);
    g.fillStyle=c.ink;g.font='400 260px "Bodoni Moda", serif';g.fillText('400',x0,H*.59);
    g.font='600 30px "Manrope", sans-serif';g.fillText('C O L O R   N E G A T I V E   F I L M',x0,H*.79);
    g.fillStyle='#e8eefc';g.font='600 28px "Manrope", sans-serif';g.fillText('36 EXP  ·  C-41  ·  ISO 400/27°',x0,H*.93);
  };
  face(W*.25);face(W*.75);
  g.strokeStyle=c.ink;g.globalAlpha=.35;g.lineWidth=3;for(const x of [W*.5,2]){g.beginPath();g.moveTo(x,H*.18);g.lineTo(x,H*.84);g.stroke();}g.globalAlpha=1;
  const d=g.getImageData(0,0,W,H),px=d.data;let seed=7;for(let i=0;i<px.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=((seed>>>24)-128)*.06;px[i]+=n;px[i+1]+=n;px[i+2]+=n;}g.putImageData(d,0,0);
  return canvas;
}

export async function mountGPU(host,options={}){
  const type=options.type||'silk';
  let dead=false,ready=false,visible=true,raf=0,frame=0,phase=0,last=0;
  let renderer,scene,camera,mesh,texture,geometry,material,observer,resizeObserver;
  let can=null,spinRaf=0,spinLast=0;const spinState={angle:0,lean:0,cam:[.5,.5],base:null};
  const disposables=[];
  const state={value:clamp(options.value??.55),pointer:[.5,.5],active:0,paused:!!options.paused,backend:'initializing'};
  const time=T.uniform(0),value=T.uniform(state.value),cursor=T.uniform(new THREE.Vector2(.5,.5)),active=T.uniform(0),hover=T.uniform(0),aspect=T.uniform(1);
  // 1.3: origin is where a develop flood starts; iris closes a light beam for a cut between fixed positions.
  const origin=T.uniform(new THREE.Vector2(.5,.5)),iris=T.uniform(1);
  const canvas=document.createElement('canvas');canvas.className='ov-gpu-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
  const abort=new AbortController();
  const reduced=()=>window.Overture?.reduced()??matchMedia('(prefers-reduced-motion: reduce)').matches;
  const updateBackend=name=>{state.backend=name;host.dataset.renderer=name;options.onBackend?.(name);};
  const error=err=>{updateBackend('static');host.dataset.gpuError=String(err.message||err);canvas.hidden=true;options.onError?.(err);};
  function cleanup(){
    if(dead)return;dead=true;cancelAnimationFrame(raf);cancelAnimationFrame(spinRaf);abort.abort();observer?.disconnect();resizeObserver?.disconnect();
    try{renderer?.setAnimationLoop(null);renderer?.dispose();}catch{}
    geometry?.dispose();material?.dispose();texture?.dispose();for(const x of disposables)x.dispose?.();canvas.remove();
  }
  const api={
    canvas,state,destroy:cleanup,
    setValue(v){state.value=clamp(v);value.value=state.value;if(type==='silk'&&geometry)updateSilk();if(type==='canister'){spin();return;}renderOnce();},
    setPointer(x,y){if(x<0||y<0)hover.value=0;state.pointer=[clamp(x),clamp(y)];cursor.value.set(state.pointer[0],1-state.pointer[1]);if(type==='canister'){spin();return;}renderOnce();},
    setActive(v){state.active=clamp(v);active.value=state.active;renderOnce();},
    setHover(v){state.hover=clamp(v);hover.value=state.hover;renderOnce();},
    setOrigin(x,y){origin.value.set(clamp(x),1-clamp(y));},
    setIris(v){state.iris=clamp(v,0,1.5);iris.value=state.iris;renderOnce();},
    // A travelling beam changes position, opening and iris every frame; one call, one render.
    setBeam(x,y,v,k=1){state.value=clamp(v);value.value=state.value;state.iris=clamp(k,0,1.5);iris.value=state.iris;state.pointer=[clamp(x),clamp(y)];cursor.value.set(state.pointer[0],1-state.pointer[1]);renderOnce();},
    setPaused(v){state.paused=!!v;renderOnce();},
    async capture(){if(!ready||dead)throw new Error('画面仍在准备，请稍后重试。');renderer.render(scene,camera);const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;image.getContext('2d').drawImage(canvas,0,0);return image;}
  };
  // Register cancellation before loading or creating a device.
  options.onController?.(api);
  function resize(){if(!renderer||!camera||dead)return;const r=host.getBoundingClientRect(),w=Math.max(2,r.width),h=Math.max(2,r.height);aspect.value=w/h;renderer.setSize(w,h,false);if(camera.isPerspectiveCamera){camera.aspect=w/h;if(type==='silk')camera.position.z=Math.max(4.95,6.5/(w/h)/(2*Math.tan(39*Math.PI/360)));camera.updateProjectionMatrix();}if(material?.userData.cover){const image=texture.image,ratio=(image.width/image.height)/(w/h);material.userData.cover.value.set(ratio>1?1/ratio:1,ratio>1?1:ratio);}renderOnce();}
  function updateSilk(){
    const pos=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<pos.count;i++){const p=silkPoint(uv.getX(i),uv.getY(i),state.value,0);pos.setXYZ(i,p[0],p[1],p[2]);}
    pos.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  }
  function spin(){
    if(!can||dead||spinRaf)return;spinLast=performance.now();
    const step=now=>{spinRaf=0;if(dead||!can)return;const dt=Math.min(.05,(now-spinLast)/1000||.016);spinLast=now;
      const target=(state.value-.5)*2*Math.PI*2*(options.turns||2.4);if(spinState.base===null){spinState.base=0;spinState.angle=target;}const instant=reduced(),k=instant?1:1-Math.exp(-dt*11),prev=spinState.angle;
      spinState.angle+=(target-spinState.angle)*k;const vel=(spinState.angle-prev)/Math.max(dt,1e-3);
      spinState.lean+=((instant?0:Math.max(-.14,Math.min(.14,vel*.025)))-spinState.lean)*(instant?1:1-Math.exp(-dt*8));
      const f=instant?1:1-Math.exp(-dt*6);spinState.cam[0]+=(state.pointer[0]-spinState.cam[0])*f;spinState.cam[1]+=(state.pointer[1]-spinState.cam[1])*f;
      can.body.rotation.y=-Math.PI/2-spinState.angle*.42;can.nub.rotation.y=-spinState.angle;can.group.rotation.z=-.02-spinState.lean;
      camera.position.set((spinState.cam[0]-.5)*.9,1.45-(spinState.cam[1]-.5)*.6,9.2);camera.lookAt(0,-.05,0);renderOnce();
      const moving=Math.abs(target-spinState.angle)>1e-4||Math.abs(spinState.lean)>1e-4||Math.abs(state.pointer[0]-spinState.cam[0])+Math.abs(state.pointer[1]-spinState.cam[1])>1e-3;
      if(moving)spinRaf=requestAnimationFrame(step);};
    spinRaf=requestAnimationFrame(step);
  }
  function renderOnce(){if(ready&&!dead&&visible){try{renderer.render(scene,camera);}catch(err){error(err);}}}
  try{
    const force=options.backend==='webgl'||new URLSearchParams(location.search).get('backend')==='webgl';
    if(options.backend==='static'||new URLSearchParams(location.search).get('backend')==='static')throw new Error('静态模式');
    renderer=new THREE.WebGPURenderer({canvas,antialias:true,alpha:true,forceWebGL:force});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,options.dpr||1.5));
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
    await renderer.init();if(dead){renderer.dispose();return api;}
    updateBackend(renderer.backend.isWebGPUBackend?'webgpu':'webgl2');
    scene=new THREE.Scene();
    if(type==='light'){
      camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
      geometry=new THREE.PlaneGeometry(2,2);material=new THREE.MeshBasicNodeMaterial({transparent:true,depthWrite:false});
      const delta=T.uv().sub(cursor).mul(T.vec2(aspect.max(1),.92)),dist=delta.length();
      const radius=value.mul(.5).add(.3).mul(iris);
      const pool=T.smoothstep(radius.mul(.40),radius,dist).oneMinus();
      const rim=T.smoothstep(radius.mul(.76),radius.mul(1.09),dist).oneMinus().sub(pool).max(0);
      // Warm pool, cold rim: the beam edge carries the second light temperature (ov-cold).
      material.colorNode=T.mix(T.vec3(.011,.009,.007),T.vec3(.16,.27,.62),rim.mul(.34));
      material.opacityNode=T.float(.955).sub(pool.mul(.955));
      material.toneMapped=false;mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    }else if(type==='silk'){
      camera=new THREE.PerspectiveCamera(39,1,.1,30);camera.position.set(0,.1,6.5);camera.lookAt(0,0,0);
      texture=await new THREE.TextureLoader().loadAsync(options.src||new URL('photos/resonance-silk.png',import.meta.url).href);if(dead){texture.dispose();return api;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
      geometry=new THREE.PlaneGeometry(1,1,160,100);updateSilk();
      material=new THREE.MeshBasicNodeMaterial({side:THREE.DoubleSide,transparent:true,alphaTest:.015});
      const p=T.positionLocal;
      const sway=T.sin(p.x.mul(1.8).add(p.y.mul(2.3)).add(time.mul(.6))).mul(value.mul(.13).add(.015));
      material.positionNode=p.add(T.vec3(sway.mul(.17),T.sin(time.mul(.28)).mul(p.x).mul(.012),sway));
      const sample=T.texture(texture,T.uv());material.colorNode=sample.rgb;material.opacityNode=sample.a;
      mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    }else if(type==='canister'){
      // A 35 mm cartridge: label body, metal lips, spool nub and felt light-trap. Warm key, cold rim.
      await document.fonts?.load('120px "Bodoni Moda"').catch(()=>{});await document.fonts?.load('600 40px "Manrope"').catch(()=>{});if(dead)return api;
      const cs=getComputedStyle(host),tok=(n,f)=>cs.getPropertyValue(n).trim()||f;
      camera=new THREE.PerspectiveCamera(26,1,.1,40);camera.position.set(0,1.45,9.2);camera.lookAt(0,0,0);
      texture=new THREE.CanvasTexture(canisterLabel({cold:options.labelCold||'#1f4a8f',indigo:options.labelIndigo||'#23386b'}));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
      const R=1,HH=2.55,group=new THREE.Group(),metal=new THREE.MeshStandardNodeMaterial({color:0x2d2925,metalness:.85,roughness:.32}),dark=new THREE.MeshStandardNodeMaterial({color:0x120d0b,metalness:.1,roughness:.9});
      geometry=new THREE.CylinderGeometry(R,R,HH,128,1,true);material=new THREE.MeshStandardNodeMaterial({map:texture,roughness:.42,metalness:.05});
      mesh=new THREE.Mesh(geometry,material);const body=new THREE.Group();body.add(mesh);
      for(const y of [1,-1]){const lip=new THREE.Mesh(new THREE.CylinderGeometry(R*1.045,R*1.045,.17,128),metal);lip.position.y=y*(HH/2+.085);body.add(lip);const ring=new THREE.Mesh(new THREE.TorusGeometry(R*1.03,.03,12,128),metal);ring.rotation.x=Math.PI/2;ring.position.y=y*(HH/2+.17);body.add(ring);disposables.push(lip.geometry,ring.geometry);}
      const nub=new THREE.Group(),nubBody=new THREE.Mesh(new THREE.CylinderGeometry(.34,.36,.42,48),metal),slot=new THREE.Mesh(new THREE.BoxGeometry(.5,.07,.1),dark);nubBody.position.y=HH/2+.38;slot.position.y=HH/2+.6;nub.add(nubBody,slot);
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.16,48),metal);foot.position.y=-HH/2-.25;
      const felt=new THREE.Mesh(new THREE.BoxGeometry(.2,HH*.84,.5),dark);felt.position.set(R*.96,0,.34);felt.rotation.y=-.35;
      disposables.push(nubBody.geometry,slot.geometry,foot.geometry,felt.geometry,metal,dark);
      group.add(body,nub,foot,felt);group.rotation.set(.04,0,-.02);scene.add(group);
      scene.add(new THREE.HemisphereLight(0xfff1dc,0x1a1624,.55));
      const key=new THREE.DirectionalLight(0xffe0bd,2.6);key.position.set(-4,3,5);scene.add(key);
      const rim=new THREE.DirectionalLight(new THREE.Color(tok('--ov-cold','#8fb1ff')),3.2);rim.position.set(4.5,1.5,-3.5);scene.add(rim);
      const fill=new THREE.PointLight(new THREE.Color(tok('--ov-cold','#8fb1ff')),6,12);fill.position.set(2.6,-1.2,3);scene.add(fill);
      can={group,body,nub};
    }else{
      camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
      texture=await new THREE.TextureLoader().loadAsync(options.src);if(dead){texture.dispose();return api;}texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;
      geometry=new THREE.PlaneGeometry(2,2);
      material=new THREE.MeshBasicNodeMaterial({transparent:false});
      const cover=T.uniform(new THREE.Vector2(1,1));material.userData.cover=cover;
      const q=T.uv(),p=q.sub(.5),cropped=p.mul(cover).add(.5);
      if(type==='aperture'){
        const center=T.vec2(.62,.46),delta=cropped.sub(center),distance=delta.length();
        const wave=T.sin(distance.mul(49).sub(time.mul(.25))).mul(.0026).mul(value.oneMinus());
        const scale=T.float(1).sub(value.mul(.16));
        const warp=delta.mul(scale.add(wave)).add(center).add(cursor.sub(.5).mul(.008));
        const col=T.texture(texture,warp).rgb;
        const opening=T.smoothstep(value.mul(1.1).add(.08),value.mul(1.1).add(.18),distance).oneMinus();
        material.colorNode=col.mul(opening.mul(.89).add(.11));
      }else{
        // A pool of developer that grows with hover, and a flood that spreads from the pressed point as active rises.
        const delta=q.sub(cursor),dist=delta.mul(T.vec2(1.2,1)).length();
        const pool=T.smoothstep(hover.mul(.20),hover.mul(.37).add(.0001),dist).oneMinus().mul(hover.mul(4).min(1));
        const far=aspect.mul(aspect).add(1).sqrt().add(.12),edge=far.mul(active),reach=q.sub(origin).mul(T.vec2(aspect,1)).length();
        const flood=T.smoothstep(edge.sub(.1),edge,reach).oneMinus();
        const front=T.smoothstep(edge.sub(.1),edge.sub(.05),reach).mul(T.smoothstep(edge.sub(.05),edge,reach).oneMinus()).mul(active.mul(active.oneMinus()).mul(4));
        const reveal=pool.max(flood);
        const col=T.texture(texture,cropped).rgb,gray=col.dot(T.vec3(.2126,.7152,.0722));
        material.colorNode=T.mix(T.vec3(gray),col,reveal).add(T.vec3(.16,.12,.08).mul(front));
      }
      mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    }
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
    observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)renderOnce();},{rootMargin:'80px'});observer.observe(host);
    canvas.addEventListener('webglcontextlost',ev=>{ev.preventDefault();error(new Error('图形上下文已暂停'));},{signal:abort.signal});
    await renderer.compileAsync(scene,camera);if(dead)return api;
    ready=true;resize();renderer.render(scene,camera);host.classList.add('is-gpu-ready');
    function loop(now){
      if(dead)return;raf=requestAnimationFrame(loop);
      if(!visible||document.hidden||state.paused||reduced())return;
      if(now-last<1000/(options.fps||40))return;
      const dt=Math.min(.08,(now-last)/1000||.016);last=now;phase+=dt;time.value=phase;
      if(mesh&&type==='silk'){mesh.rotation.y=Math.sin(phase*.15)*.035+(state.pointer[0]-.5)*.055;mesh.rotation.x=(state.pointer[1]-.5)*.035;}
      renderOnce();frame++;
    }
    // Light masks render only on input or resize; they have no ambient animation.
    if(type!=='light'&&type!=='canister')raf=requestAnimationFrame(loop);if(type==='canister')spin();
    window.addEventListener('ov:motion',renderOnce,{signal:abort.signal});
  }catch(err){if(!dead)error(err);}
  return api;
}
