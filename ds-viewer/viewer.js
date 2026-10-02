(() => {
  const frames = () => [...document.querySelectorAll('iframe[data-frame]')];
  // Preview frames report their height; errors are shown on the card.
  addEventListener('message', e => {
    const d = e.data;
    if (!d || !d.dsFrame) return;
    const f = frames().find(x => x.dataset.frame === d.dsFrame);
    if (!f) return;
    if (d.h && !f.closest('.cover')) f.style.height = Math.max(parseInt(f.style.height) || 0, Math.min(d.h, 4000)) + 'px';
    if (d.err) { const card = f.closest('.comp'); if (card && !card.querySelector('.frame-err')) { const p = document.createElement('p'); p.className = 'frame-err muted'; p.style.cssText = 'padding:8px 16px;margin:0;font-size:12px'; p.textContent = 'Preview error: ' + d.err; f.parentElement.after(p); } }
  });

  // Every preview is mounted once and stays mounted, so nothing is blank, restarts or loses its
  // state while scrolling. The one exception: browsers drop the oldest WebGL contexts beyond ~16
  // per page, so when a page has more WebGL previews (data-gl) than GL_BUDGET, only those are
  // windowed around the viewport. Non-WebGL previews are never unloaded.
  const GL_BUDGET = 12, MAX_LIVE_GL = 8;
  const all = [...document.querySelectorAll('iframe[data-src]')];
  const glFrames = all.filter(f => f.dataset.gl);
  const windowed = new Set(glFrames.length > GL_BUDGET ? glFrames : []);
  const mountFrame = f => { if (f.dataset.mounted) return; f.dataset.mounted = '1'; f.src = f.dataset.src; };
  const unmountFrame = f => { if (!f.dataset.mounted) return; delete f.dataset.mounted; f.src = 'about:blank'; };
  const near = f => { const r = f.getBoundingClientRect(); return r.bottom > -innerHeight && r.top < innerHeight * 2; };
  // Eager frames: the first screen first, then the rest in document order, two per frame tick.
  const queue = all.filter(f => !windowed.has(f)).sort((a, b) => near(b) - near(a));
  const pump = () => { queue.splice(0, 2).forEach(mountFrame); if (queue.length) setTimeout(pump, 60); };
  pump();
  if (windowed.size) {
    const live = new Set();
    const lazy = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { mountFrame(e.target); live.add(e.target); } else { unmountFrame(e.target); live.delete(e.target); }
      }
      if (live.size > MAX_LIVE_GL) {
        const mid = innerHeight / 2, dist = f => Math.abs(f.getBoundingClientRect().top + f.offsetHeight / 2 - mid);
        [...live].sort((a, b) => dist(b) - dist(a)).slice(0, live.size - MAX_LIVE_GL).forEach(f => { unmountFrame(f); live.delete(f); });
      }
    }, {rootMargin: '600px 0px'});
    windowed.forEach(f => lazy.observe(f));
  }

  // Cover: laid out at 960px wide and scaled to fit.
  const cover = document.querySelector('.cover');
  if (cover) {
    const f = cover.querySelector('iframe'), h = parseInt(cover.dataset.h) || 300;
    // A `fluid` cover lays out at the page width instead of a scaled 960px canvas.
    const fit = cover.classList.contains('fluid') ? () => { cover.style.height = Math.min(h, Math.max(260, cover.clientWidth * h / 1280)) + 'px'; f.style.height = cover.style.height; } : () => { const s = Math.min(1, cover.clientWidth / 960); f.style.transform = `scale(${s})`; cover.style.height = h * s + 'px'; };
    new ResizeObserver(fit).observe(cover); fit();
  }

  // Theme switch: page tokens + every preview frame.
  const btns = [...document.querySelectorAll('[data-theme-id]')];
  const setTheme = id => {
    document.documentElement.dataset.theme = id;
    btns.forEach(b => b.setAttribute('aria-checked', String(b.dataset.themeId === id)));
    frames().forEach(f => { try { f.contentWindow.postMessage({dsTheme: id}, '*'); } catch {} });
    try { localStorage.setItem('ds-viewer-theme:' + document.title, id); } catch {}
  };
  btns.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeId)));
  frames().forEach(f => f.addEventListener('load', () => { const t = document.documentElement.dataset.theme; if (t && f.contentWindow) f.contentWindow.postMessage({dsTheme: t}, '*'); }));
  try { const saved = localStorage.getItem('ds-viewer-theme:' + document.title); if (saved && btns.some(b => b.dataset.themeId === saved)) setTheme(saved); } catch {}

  // Component filter.
  const input = document.getElementById('filter'), count = document.getElementById('count');
  if (input) input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll('.comp').forEach(c => { const show = !q || c.dataset.name.includes(q); c.hidden = !show; if (show) n++; });
    document.querySelectorAll('.cgroup').forEach(g => { g.hidden = ![...g.querySelectorAll('.comp')].some(c => !c.hidden); });
    count.textContent = `${n} components`;
  });

  // Copy a colour token's var() on click.
  document.querySelectorAll('[data-copy]').forEach(el => el.addEventListener('click', () => {
    navigator.clipboard?.writeText(el.dataset.copy).then(() => { el.classList.add('copied'); setTimeout(() => el.classList.remove('copied'), 700); }, () => {});
  }));

  // Highlight the current section in the sidebar.
  const links = new Map([...document.querySelectorAll('.side nav a')].map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { links.forEach(a => a.classList.remove('on')); links.get(e.target.id)?.classList.add('on'); }
  }, {rootMargin: '-10% 0px -80% 0px'});
  links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
})();
