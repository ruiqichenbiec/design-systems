(function(){
  'use strict';
  // Single-file bootstrap. Photos and the film are embedded as base64 text; three.js and the GPU engine as gzip + base64.
  // Everything becomes an object URL, so the page works from file:// with no server and no network.
  const O=window.Overture;
  const bytes=node=>fetch(`data:${node.dataset.type||'application/octet-stream'};base64,${node.textContent.trim()}`).then(r=>r.blob());
  const assets={};
  const ready=(async()=>{
    const nodes=[...document.querySelectorAll('script[data-embed]')];
    await Promise.all(nodes.map(async node=>{assets[node.dataset.embed]=URL.createObjectURL(await bytes(node));node.remove();}));
    O.configure({assets});
  })();
  async function source(id){
    const node=document.querySelector(`script[data-module="${id}"]`);if(!node)throw new Error(`内嵌模块缺失：${id}`);
    const stream=(await bytes(node)).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream).text();
  }
  let engine=null;
  const blobURL=code=>URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
  O.configure({loadEngine:()=>engine??=(async()=>{
    if(typeof DecompressionStream==='undefined')throw new Error('此浏览器无法解压内嵌的图形模块，已使用静态照片。');
    const [core,webgpu,main]=await Promise.all(['three-core','three-webgpu','engine'].map(source));
    // Relative imports cannot resolve against object URLs, so each module is pointed at its dependency's URL.
    const coreURL=blobURL(core),gpuURL=blobURL(webgpu.replaceAll("'./three.core.js'",JSON.stringify(coreURL))),mainURL=blobURL(main.replace("'./lib/three.webgpu.js'",JSON.stringify(gpuURL)));
    document.querySelectorAll('script[data-module]').forEach(node=>node.remove());
    return import(mainURL);
  })()});
  window.OvertureEmbed={ready,assets};
})();
