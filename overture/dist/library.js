document.addEventListener('DOMContentLoaded',()=>{
  const O=Overture,data=OvertureCatalog,host=document.getElementById('specimens'),search=document.getElementById('search');let group='全部',controls=[];
  O.configure({assetBase:'assets/'});
  const groups=['全部',...new Set(data.map(x=>x.group))];
  document.getElementById('groups').innerHTML=groups.map(g=>`<button type="button" data-group="${O.escape(g)}" aria-pressed="${g===group}">${O.escape(g)}<span>${g==='全部'?data.length:data.filter(x=>x.group===g).length}</span></button>`).join('');
  function render(){
    for(const control of controls)control.destroy();controls=[];host.replaceChildren();
    const query=search.value.trim().toLowerCase();const items=data.filter(x=>(group==='全部'||x.group===group)&&`${x.name} ${x.title} ${x.usage} ${x.description}`.toLowerCase().includes(query));
    document.getElementById('empty').hidden=items.length>0;
    for(const comp of items){
      const card=O.html(`<article class="specimen ${comp.wide?'is-wide':''}" id="component-${comp.name}"><div class="specimen-head"><h2>${O.escape(comp.title)}</h2><code>${O.escape(comp.name)}</code></div><p class="specimen-desc">${O.escape(comp.description)}</p><div class="specimen-demo"></div><div class="specimen-foot"><output aria-label="最近状态">${O.escape(comp.group)}</output><button type="button">复制接入代码</button></div></article>`);host.append(card);const demo=card.querySelector('.specimen-demo');
      const instance=O.mount(comp.name,demo,comp.props||{});controls.push(instance);
      demo.addEventListener('ov:change',ev=>{const detail={...ev.detail};delete detail.component;card.querySelector('.specimen-foot output').textContent=JSON.stringify(detail);});
      card.querySelector('.specimen-foot button').addEventListener('click',async ev=>{const button=ev.currentTarget;const text=`const instance = Overture.mount('${comp.name}', document.querySelector('#host'), ${JSON.stringify(comp.props||{})});\n// instance.destroy(); // 页面卸载时释放资源`;try{await navigator.clipboard.writeText(text);button.textContent='代码已复制';}catch{const pre=card.querySelector('pre')||document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font-size:12px;padding:18px 0;color:var(--ov-muted)';pre.textContent=text;card.append(pre);button.textContent='代码已显示';}});
    }
  }
  document.getElementById('groups').addEventListener('click',ev=>{const b=ev.target.closest('[data-group]');if(!b)return;group=b.dataset.group;document.querySelectorAll('[data-group]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});search.addEventListener('input',render);
  const names={stage:'暗场',paper:'印纸',nocturne:'夜场'};const themeButton=document.getElementById('theme');const label=()=>{const now=document.documentElement.dataset.theme||'stage',next=O.themes[(O.themes.indexOf(now)+1)%O.themes.length];themeButton.textContent=`主题：${names[now]} → ${names[next]}`;};label();themeButton.addEventListener('click',()=>{O.nextTheme();label();});
  const motion=document.getElementById('motion');const refresh=()=>{motion.textContent=O.reduced()?'启用完整动态':'减少动态';motion.setAttribute('aria-pressed',String(O.reduced()));};refresh();motion.addEventListener('click',()=>{O.setMotion(O.reduced()?'full':'reduce');refresh();});
  const requested=new URLSearchParams(location.search).get('component');if(requested)search.value=requested;render();
  window.addEventListener('pagehide',()=>controls.forEach(c=>c.destroy()),{once:true});
});
