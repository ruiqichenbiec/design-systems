/* Loading animations for the exposure site (../index.html): a long one while a system's pages load, a short one
   on the way out. Each draws a whole frame from (t, progress) onto a 2D canvas, so the part the opening aperture
   reveals first, the centre, is already fully in motion. Plain script, so index.html also works from file://.

   bg(ctx, s): the still backdrop, painted once per run onto its own canvas; the compositor layers it under the frame
   draw(ctx, s): one frame on a cleared, transparent canvas
   s = { w, h, dpr, t (s since start), dt, p (shown progress 0..1), reduced, lang, next, cache, run }
     cache: layers that only depend on the canvas size; they outlive one run and warm(s) can build them ahead of time
     run:   state of this run (points, springs)
   Anything costly (blurs, shadows, big gradients) is painted once into a cached layer; a frame only composites. */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const outCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
  // a lightly underdamped spring from 0 to 1, settling in about half a second
  const spring = (t, k = 9, w = 13) => (t <= 0 ? 0 : 1 - Math.exp(-t * k) * Math.cos(t * w));
  const pct = (p) => `${Math.round(clamp(p) * 100)}%`;
  const say = (s, zh, en) => (s.lang === 'en' ? en : zh);
  const sans = '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
  const mono = '"JetBrains Mono",ui-monospace,Consolas,monospace';

  // a cached layer of w×h, painted at `scale` of that size (soft layers need far fewer pixels) and keyed by size
  function layer(s, key, w, h, paint, scale = 1) {
    const id = `${key}:${Math.round(w)}x${Math.round(h)}`, hit = s.cache[key];
    if (hit && hit.id === id) return hit.cv;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(h * scale));
    const ctx = cv.getContext('2d'); ctx.scale(scale, scale); paint(ctx, w, h);
    s.cache[key] = { id, cv }; return cv;
  }
  // a soft round light, drawn scaled wherever a radial glow is needed
  function glowSprite(s, key, stops) {
    return layer(s, key, 128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); });
  }

  /* ================= 透镜 Lens · glass, liquid, light ================= */
  const AURORA = ['#d3e8e3', '#badde8', '#9db7dc', '#929ee0', '#d3b4d2', '#eccbc1'];
  const paintAurora = (dpr) => (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, AURORA[0]); g.addColorStop(0.5, AURORA[1]); g.addColorStop(1, AURORA[5]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const ribbon = (o, c1, c2) => {
      const p = new Path2D(); p.moveTo(-w * 0.1, h * (0.98 + o)); p.bezierCurveTo(w * 0.13, h * (0.39 + o), w * 0.48, h * (0.86 + o), w * 1.1, h * (-0.32 + o));
      p.lineTo(w * 1.15, h * 1.4); p.lineTo(-w * 0.1, h * 1.4); p.closePath();
      const f = ctx.createLinearGradient(w * 0.05, h * 0.1, w * 0.87, h * 0.92); f.addColorStop(0, c1); f.addColorStop(0.48, c2); f.addColorStop(1, AURORA[5]);
      ctx.save(); ctx.shadowColor = '#38486830'; ctx.shadowBlur = 27 * dpr * 0.3; ctx.shadowOffsetY = -7 * dpr * 0.3; ctx.fillStyle = f; ctx.fill(p); ctx.restore();
    };
    ribbon(-0.31, AURORA[1], AURORA[2]); ribbon(-0.1, AURORA[2], AURORA[3]); ribbon(0.18, AURORA[3], AURORA[4]); ribbon(0.44, AURORA[4], AURORA[5]);
  };
  function pill(ctx, x, y, w, h) { const r = h / 2; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -TAU / 4, TAU / 4); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, TAU / 4, (TAU * 3) / 4); ctx.closePath(); }
  const lensGeom = (s) => { const d = s.dpr, W = Math.round(Math.min(s.w * 0.46, 380 * d)), H = Math.round(W * 0.3); return { d, W, H, pad: Math.round(46 * d) }; };
  // the glass under the liquid (shadow and body) and over it (rim and highlight), each painted once
  function capsuleLayers(s) {
    const { d, W, H, pad } = lensGeom(s), cw = W + pad * 2, ch = H + pad * 2;
    const under = layer(s, 'capUnder', cw, ch, (ctx) => {
      ctx.shadowColor = '#2135524d'; ctx.shadowBlur = 30 * d; ctx.shadowOffsetY = 14 * d;
      pill(ctx, pad, pad, W, H); ctx.fillStyle = 'rgba(245,250,255,.26)'; ctx.fill();
    });
    const over = layer(s, 'capOver', cw, ch, (ctx) => {
      pill(ctx, pad + 0.75 * d, pad + 0.75 * d, W - 1.5 * d, H - 1.5 * d);
      const rim = ctx.createLinearGradient(0, pad, 0, pad + H); rim.addColorStop(0, '#ffffffee'); rim.addColorStop(0.45, '#ffffff40'); rim.addColorStop(1, '#ffffffb0');
      ctx.strokeStyle = rim; ctx.lineWidth = 1.5 * d; ctx.stroke();
      pill(ctx, pad + 10 * d, pad + 5 * d, W - 20 * d, H * 0.38); const hi = ctx.createLinearGradient(0, pad, 0, pad + H * 0.45); hi.addColorStop(0, '#ffffff73'); hi.addColorStop(1, '#ffffff00'); ctx.fillStyle = hi; ctx.fill();
    });
    return { under, over, W, H, pad, d };
  }
  function lensBg(ctx, s) { ctx.drawImage(layer(s, 'aurora', s.w, s.h, paintAurora(s.dpr), 0.3), 0, 0, s.w, s.h); }
  function lensWarm(s) { layer(s, 'aurora', s.w, s.h, paintAurora(s.dpr), 0.3); capsuleLayers(s); glowSprite(s, 'light', [[0, '#ffffff4d'], [1, '#ffffff00']]); glowSprite(s, 'emit', [[0, '#f2ffffee'], [0.3, '#a3efff88'], [1, '#a3efff00']]); }
  function lensFrame(ctx, s, fill, sweep, scale, lines) {
    const { w, h } = s;
    // a slow wandering light over the sheets
    const R = Math.max(w, h) * 0.32, lx = w * (0.5 + 0.28 * Math.sin(s.t * 0.7)), ly = h * (0.3 + 0.08 * Math.cos(s.t * 0.9));
    ctx.drawImage(glowSprite(s, 'light', [[0, '#ffffff4d'], [1, '#ffffff00']]), lx - R, ly - R, R * 2, R * 2);
    const cap = capsuleLayers(s), d = cap.d, cx = w / 2, cy = h / 2 - 14 * d;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
    const x = -cap.W / 2, y = -cap.H / 2;
    ctx.drawImage(cap.under, x - cap.pad, y - cap.pad);
    // the liquid: a column with a living meniscus and a bright emitter on its edge
    ctx.save(); pill(ctx, x + 5 * d, y + 5 * d, cap.W - 10 * d, cap.H - 10 * d); ctx.clip();
    if (fill > 0.002) {
      const edge = x + 5 * d + (cap.W - 10 * d) * fill, lq = ctx.createLinearGradient(0, y, 0, y + cap.H);
      lq.addColorStop(0, '#a0ecffaa'); lq.addColorStop(0.47, '#a9f0ffee'); lq.addColorStop(0.5, '#e4fcff'); lq.addColorStop(0.57, '#b4f0ffcc'); lq.addColorStop(1, '#89daefaa');
      ctx.beginPath(); ctx.moveTo(x, y + cap.H);
      for (let i = 0; i <= 16; i++) { const yy = y + cap.H - (cap.H * i) / 16; ctx.lineTo(edge + Math.sin(i * 0.8 + s.t * 7) * 3.2 * d * (1 - fill * 0.6), yy); }
      ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = lq; ctx.fill();
      ctx.drawImage(glowSprite(s, 'emit', [[0, '#f2ffffee'], [0.3, '#a3efff88'], [1, '#a3efff00']]), edge - 26 * d, -26 * d, 52 * d, 52 * d);
    }
    if (sweep >= 0) {
      const sx = x - cap.W * 0.3 + cap.W * 1.6 * sweep, band = ctx.createLinearGradient(sx - 40 * d, 0, sx + 40 * d, 0);
      band.addColorStop(0, '#ffffff00'); band.addColorStop(0.5, '#ffffffaa'); band.addColorStop(1, '#ffffff00');
      ctx.fillStyle = band; ctx.fillRect(x, y, cap.W, cap.H);
    }
    ctx.restore();
    ctx.drawImage(cap.over, x - cap.pad, y - cap.pad);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = '#1f2b45';
    ctx.font = `600 ${16 * d}px ${sans}`; ctx.fillText(lines[0], cx, cy + (cap.H * scale) / 2 + 38 * d);
    ctx.fillStyle = '#4a5672'; ctx.font = `${12 * d}px ${mono}`; ctx.fillText(lines[1], cx, cy + (cap.H * scale) / 2 + 60 * d);
  }
  function lensLong(ctx, s) {
    const t = s.t, d = s.dpr;
    const scale = s.reduced ? 1 : 0.6 + 0.4 * spring(t, 8, 11);
    lensFrame(ctx, s, s.p, s.reduced ? -1 : (((t * 0.62) % 1.6) / 1.6) * 1.2 - 0.1, scale, [say(s, '透镜 Lens', 'Lens'), `${say(s, '正在载入', 'Loading')} · ${pct(s.p)}`]);
    // droplets gathering into the glass while the aperture opens
    if (!s.reduced && t < 1.1) {
      const cx = s.w / 2, cy = s.h / 2 - 14 * d;
      ctx.fillStyle = 'rgba(245,250,255,.5)'; ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = d;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.4, k = smooth((t - i * 0.03) / 0.9), r = (1 - k) * 150 * d + 18 * d;
        ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.7, (7 - 3 * k) * d, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  function lensShort(ctx, s) {
    const k = clamp(s.t / 0.6);
    lensFrame(ctx, s, 1 - outCubic(k), s.reduced ? -1 : k * 1.1, 1 - 0.08 * smooth(k), [say(s, '透镜 Lens', 'Lens'), s.next]);
  }

  /* ================= 点阵 Lattice · point, set, map ================= */
  const GLYPHS = { L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'], C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'] };
  function wordCells(word) { const cells = []; [...word].forEach((ch, i) => GLYPHS[ch].forEach((row, r) => [...row].forEach((b, c) => { if (b === '1') cells.push([i * 6 + c, r]); }))); return { cells, cols: word.length * 6 - 1 }; }
  const WORD = wordCells('LATTICE');
  const latticeBg = (s) => layer(s, 'lxbg', s.w, s.h, (ctx, w, h) => {
    ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(236,231,218,.07)';
    const step = 22 * s.dpr; for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) ctx.fillRect(x, y, 1.4 * s.dpr, 1.4 * s.dpr);
  });
  const pitchOf = (s) => Math.max(5 * s.dpr, Math.min((s.w * 0.62) / WORD.cols, 15 * s.dpr));
  // the points: every one has a home in the lettering; `crystal` of them (in a fixed order) are pulled home
  function swarm(s) {
    if (s.run.sw) return s.run.sw;
    const d = s.dpr, pitch = pitchOf(s), ox = s.w / 2 - (WORD.cols * pitch) / 2, oy = s.h / 2 - 3.5 * pitch - 18 * d, per = 3;
    const homes = []; WORD.cells.forEach(([c, r]) => { for (let k = 0; k < per; k++) homes.push([ox + (c + 0.5) * pitch + (Math.random() - 0.5) * pitch * 0.55, oy + (r + 0.5) * pitch + (Math.random() - 0.5) * pitch * 0.55]); });
    const n = homes.length + 360, pts = [];
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.5 + Math.random()) * 520 * d; pts.push({ x: s.w / 2, y: s.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, home: homes[i] || null, order: Math.random() }); }
    pts.sort((a, b) => (a.home ? 0 : 1) - (b.home ? 0 : 1) || a.order - b.order);
    return (s.run.sw = { pts, homes: homes.length, pitch });
  }
  // light is heat: fast points glow orange, resting ones are bone; drawn in four batches, one fill each
  const HEAT = ['rgba(236,231,218,.55)', '#ece7da', 'rgba(255,140,80,.8)', '#ff5a1f'];
  function latticeStep(ctx, s, crystal, melt) {
    const sw = swarm(s), d = s.dpr, dt = Math.min(0.05, s.dt), t = s.t, pinned = Math.floor(crystal * sw.homes);
    const batch = [[], [], [], []];
    for (let i = 0; i < sw.pts.length; i++) {
      const p = sw.pts[i];
      if (i < pinned && !melt) { // spring home
        p.vx += ((p.home[0] - p.x) * 60 - p.vx * 11) * dt; p.vy += ((p.home[1] - p.y) * 60 - p.vy * 11) * dt;
      } else { // a divergence-free drift: the curl of a moving sine potential
        const fx = Math.cos(p.y / (90 * d) + t * 0.7) * 60 * d, fy = Math.sin(p.x / (110 * d) - t * 0.6) * 60 * d;
        p.vx += (fx - p.vx) * 1.6 * dt; p.vy += (fy - p.vy) * 1.6 * dt;
        if (melt) { p.vx += (p.x - s.w / 2) * 2.4 * dt; p.vy += (p.y - s.h / 2) * 2.4 * dt; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!melt) { if (p.x < -10) p.x += s.w + 20; else if (p.x > s.w + 10) p.x -= s.w + 20; if (p.y < -10) p.y += s.h + 20; else if (p.y > s.h + 10) p.y -= s.h + 20; }
      const heat = Math.hypot(p.vx, p.vy) / (260 * d);
      batch[heat > 0.85 ? 3 : heat > 0.5 ? 2 : i < pinned ? 1 : 0].push(p);
    }
    batch.forEach((list, b) => {
      if (!list.length) return; const z = (b === 1 ? 2.2 : 1.7) * d;
      ctx.beginPath(); for (const p of list) ctx.rect(p.x - z / 2, p.y - z / 2, z, z); ctx.fillStyle = HEAT[b]; ctx.fill();
    });
  }
  function latticeHud(ctx, s, value, text) {
    const d = s.dpr, n = 40, gap = 7 * d, x0 = s.w / 2 - ((n - 1) * gap) / 2, y = s.h / 2 + 3.5 * pitchOf(s) + 24 * d;
    for (let i = 0; i < n; i++) { const on = i / n < value; ctx.fillStyle = on ? '#ff5a1f' : 'rgba(236,231,218,.22)'; const z = (on ? 3 : 2) * d; ctx.fillRect(x0 + i * gap - z / 2, y - z / 2, z, z); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#9d988c'; ctx.font = `500 ${12 * d}px ${mono}`; ctx.fillText(text, s.w / 2, y + 26 * d);
  }
  function latticeLong(ctx, s) {
    latticeStep(ctx, s, s.reduced ? s.p : smooth(s.p * 1.04), false);
    latticeHud(ctx, s, s.p, `${say(s, '点阵', 'LATTICE')} · ${say(s, '结晶', 'CRYSTALLISING')} ${pct(s.p)}`);
  }
  function latticeShort(ctx, s) {
    if (!s.run.melted) { const sw = swarm(s); sw.pts.forEach((p, i) => { if (i < sw.homes) { p.x = p.home[0]; p.y = p.home[1]; const a = Math.random() * TAU; p.vx = Math.cos(a) * 80 * s.dpr; p.vy = Math.sin(a) * 80 * s.dpr; } }); s.run.melted = true; }
    latticeStep(ctx, s, 0, true);
    latticeHud(ctx, s, 1 - clamp(s.t / 0.6), s.next);
  }

  /* ================= 序曲 Overture · aperture, develop, spring ================= */
  const ovBg = (s) => layer(s, 'ovbg', s.w, s.h, (ctx, w, h) => {
    ctx.fillStyle = '#090706'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.42, h * 0.55, 0, w * 0.42, h * 0.55, Math.max(w, h) * 0.6); g.addColorStop(0, '#2a1b1270'); g.addColorStop(1, '#2a1b1200');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, 0.5);
  const ovGeom = (s) => { const R = Math.min(s.w, s.h) * 0.17; return { R, cx: s.w / 2, cy: s.h / 2 - R * 0.35, size: Math.min(s.h * 0.085, s.w * 0.075) }; };
  // the title, sharp and as a soft bright print; developing cross-fades from one to the other (blur is baked once)
  function titleLayers(s) {
    const { size } = ovGeom(s), w = Math.ceil(size * 6.4), h = Math.ceil(size * 1.6);
    const paint = (blur) => (ctx) => { if (blur && 'filter' in ctx) ctx.filter = `blur(${(size * 0.09).toFixed(1)}px)`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = blur ? '#fff6e8' : '#f1ebdf'; ctx.font = `400 ${size}px "Bodoni Moda","Times New Roman",serif`; ctx.fillText('OVERTURE', w / 2, h / 2); };
    // keyed on the face having loaded, so a title baked in the fallback serif is replaced once Bodoni arrives
    const f = document.fonts?.check?.('400 20px "Bodoni Moda"') ? 'b' : 'f';
    return { sharp: layer(s, 'ttlSharp' + f, w, h, paint(false)), soft: layer(s, 'ttlSoft' + f, w, h, paint(true)), w, h };
  }
  const leaves = (s) => { const { R } = ovGeom(s); return layer(s, 'metal', R * 2, R * 2, (ctx) => { const m = ctx.createRadialGradient(R, R * 0.7, R * 0.1, R, R, R); m.addColorStop(0, '#2a211c'); m.addColorStop(1, '#120d0b'); ctx.fillStyle = m; ctx.fillRect(0, 0, R * 2, R * 2); }); };
  const lightSprite = (s) => glowSprite(s, 'ovlight', [[0, 'rgba(255,232,205,.9)'], [0.18, 'rgba(255,102,84,.75)'], [0.7, 'rgba(95,16,23,.5)'], [1, 'rgba(9,7,6,0)']]);
  // an iris of seven leaves: open (0..1) sets the opening, and the leaves turn as they would on a lens
  function iris(ctx, s, open, glow) {
    const { R, cx, cy } = ovGeom(s), d = s.dpr, blades = 7, r = R * (0.04 + 0.86 * clamp(open, 0, 1.04)), turn = 0.9 * open;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.globalAlpha = glow; ctx.drawImage(lightSprite(s), cx - R, cy - R, R * 2, R * 2); ctx.globalAlpha = 1;
    const poly = []; for (let i = 0; i < blades; i++) { const a = turn + (i / blades) * TAU; poly.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    ctx.beginPath(); ctx.rect(cx - R, cy - R, R * 2, R * 2); poly.slice().reverse().forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.save(); ctx.clip('evenodd'); ctx.drawImage(leaves(s), cx - R, cy - R); ctx.restore();
    ctx.strokeStyle = '#66574b'; ctx.lineWidth = d; ctx.beginPath();
    poly.forEach(([x, y], i) => { const a = turn + (i / blades) * TAU + 1.25; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * R * 1.6, y + Math.sin(a) * R * 1.6); });
    ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = '#b9ada0'; ctx.lineWidth = d; ctx.stroke();
  }
  // the exposure ruler of the Range control: 21 ticks on an arc, a sprung vermilion needle
  function ruler(ctx, s, value) {
    const { R, cx, cy } = ovGeom(s), d = s.dpr, a0 = Math.PI * 0.78, a1 = Math.PI * 2.22, at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    for (const long of [false, true]) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) { if ((i % 5 === 0) !== long) continue; const a = a0 + ((a1 - a0) * i) / 20; ctx.moveTo(...at(a, R + 10 * d)); ctx.lineTo(...at(a, R + (long ? 22 : 16) * d)); }
      ctx.strokeStyle = long ? '#b9ada0' : '#66574b'; ctx.lineWidth = d; ctx.stroke();
    }
    const a = a0 + (a1 - a0) * value; ctx.beginPath(); ctx.moveTo(...at(a, R + 6 * d)); ctx.lineTo(...at(a, R + 28 * d)); ctx.strokeStyle = '#ff6654'; ctx.lineWidth = 2 * d; ctx.stroke();
  }
  function ovText(ctx, s, develop, line) {
    const { R, cy, size } = ovGeom(s), d = s.dpr, tl = titleLayers(s), y = cy + R + 34 * d + size * 0.5;
    // developing: the print comes up from a bright, soft image
    if (develop < 1) { ctx.globalAlpha = Math.min(1, develop * 1.6) * (1 - develop); ctx.drawImage(tl.soft, s.w / 2 - tl.w / 2, y - tl.h / 2); }
    ctx.globalAlpha = smooth(develop); ctx.drawImage(tl.sharp, s.w / 2 - tl.w / 2, y - tl.h / 2); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.fillStyle = '#b9ada0'; ctx.font = `600 ${11 * d}px Manrope,${sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${1.6 * d}px`;
    ctx.fillText(line, s.w / 2, y + size * 0.5 + 26 * d);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function ovWarm(s) { ovBg(s); titleLayers(s); leaves(s); lightSprite(s); }
  function overtureLong(ctx, s) {
    const st = s.run.ov || (s.run.ov = { open: 0, v: 0, needle: 0, nv: 0 });
    // the iris follows progress through the system's "stage" spring (k52 c13.2), the needle through "snap" (k600 c36)
    const dt = Math.min(0.05, s.dt), target = 0.08 + 0.92 * s.p;
    if (s.reduced) { st.open = target; st.needle = s.p; } else {
      st.v += ((target - st.open) * 52 - st.v * 13.2) * dt; st.open += st.v * dt;
      st.nv += ((s.p - st.needle) * 600 - st.nv * 36) * dt; st.needle += st.nv * dt;
    }
    iris(ctx, s, st.open, clamp(s.t / 0.4));
    ruler(ctx, s, clamp(st.needle));
    ovText(ctx, s, s.reduced ? 1 : smooth(s.t / 1.1), `${say(s, '序曲 · 正在显影', 'OVERTURE · DEVELOPING')} ${pct(s.p)}`);
  }
  function overtureShort(ctx, s) {
    const k = clamp(s.t / 0.6);
    // the leaves close with the system's ~3 % overshoot, as a shutter would
    const close = s.reduced ? k : 1 - Math.exp(-k * 7) * Math.cos(k * 9.5);
    iris(ctx, s, 1 - clamp(close, 0, 1.03), 1);
    ruler(ctx, s, 1 - outCubic(k));
    ovText(ctx, s, 1 - smooth(k * 1.4), s.next);
    if (!s.reduced && k < 0.25) { ctx.fillStyle = `rgba(255,244,220,${0.18 * (1 - k / 0.25)})`; ctx.fillRect(0, 0, s.w, s.h); }
  }

  window.ExposureLoaders = {
    lens: { bg: lensBg, long: lensLong, short: lensShort, warm: lensWarm },
    lattice: { bg: (ctx, s) => ctx.drawImage(latticeBg(s), 0, 0), long: latticeLong, short: latticeShort, warm: latticeBg },
    overture: { bg: (ctx, s) => ctx.drawImage(ovBg(s), 0, 0, s.w, s.h), long: overtureLong, short: overtureShort, warm: ovWarm },
  };
})();
