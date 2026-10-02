#!/usr/bin/env node
// DS Viewer — build a local, browsable catalog page for a design system kept in the
// Claude Design System file layout (project/README.md, tokens.json, components/…).
// Usage: node ds-viewer/build.mjs "<design-system dir>" [--out <dir>]
// Output: <dir>/dist/catalog/index.html (opens from file://; no server, no dependencies)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderMarkdown, esc} from './markdown.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (!args[0] || args[0] === '--help') {
  console.log('Usage: node ds-viewer/build.mjs "<design-system dir>" [--out <dir>]');
  process.exit(args[0] ? 0 : 1);
}
const sysDir = path.resolve(args[0]);
const P = ['project', '.'].map(d => path.join(sysDir, d)).find(d => fs.existsSync(path.join(d, 'README.md')) || fs.existsSync(path.join(d, 'tokens.json')));
if (!P) throw new Error(`No README.md or tokens.json under ${sysDir} or ${sysDir}/project`);
const outIdx = args.indexOf('--out');
const OUT = outIdx > 0 ? path.resolve(args[outIdx + 1]) : path.join(sysDir, 'dist', 'catalog');
const inside = (base, p) => { const r = path.resolve(base, p); if (!r.startsWith(path.resolve(base) + path.sep)) throw new Error(`Path escapes system: ${p}`); return r; };
const read = p => fs.readFileSync(inside(P, p), 'utf8');
const has = p => { try { return fs.statSync(inside(P, p)).isFile(); } catch { return false; } };
const readJson = p => (has(p) ? JSON.parse(read(p)) : null);

fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(path.join(OUT, 'assets'), {recursive: true});
fs.mkdirSync(path.join(OUT, 'previews'), {recursive: true});
const put = (p, data) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), {recursive: true}); fs.writeFileSync(f, data); };
const copy = (from, to) => { put(to, fs.readFileSync(inside(P, from))); };

const index = readJson('design-system.json') ?? {};
const tokens = readJson('tokens.json') ?? {};
const title = index.title || tokens.name || path.basename(sysDir);
const namespace = index.namespace;
const notes = [];

// ---------- tokens → tokens.css (same grammar as the Design System type) ----------
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const cssName = n => n.replace(/^(--|\.)/, '').replace(/\./g, '\\.');
const themes = tokens.color?.themes?.length ? tokens.color.themes : [{id: 'light', name: 'Light'}];
const first = themes[0].id;
const colorOk = v => typeof v === 'string' && (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^(rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)$/i.test(v) || /^\{[^{}]+\}$/.test(v));
const colorCss = v => (/^\{(.+)\}$/.test(v) ? `var(--${cssName(v.slice(1, -1))})` : v);
const perTheme = (t, id) => (typeof t.value === 'string' ? (id === first ? t.value : undefined) : t.value?.[id]);
const colors = (tokens.color?.tokens ?? []).filter(t => NAME.test(t.name) && themes.some(th => colorOk(perTheme(t, th.id))));
const listFam = k => (tokens[k]?.tokens ?? []).filter(t => NAME.test(t.name));
const shadows = listFam('shadow');
const OTHER = Object.keys(tokens).filter(k => !['name', 'version', 'meta', 'color', 'type', 'spacing', 'radius', 'shadow'].includes(k) && Array.isArray(tokens[k]?.tokens));
const len = v => (typeof v === 'number' ? `${v}px` : v);
// lineHeight may be unitless (a number < 10, per the Design System format).
const lh = v => (typeof v === 'number' && v < 10 ? String(v) : len(v));
let css = '';
for (const th of themes) {
  const sel = th.id === first ? `:root, [data-theme="${th.id}"]` : `[data-theme="${th.id}"]`;
  const lines = [];
  for (const t of colors) { const v = perTheme(t, th.id); if (colorOk(v)) lines.push(`--${cssName(t.name)}: ${colorCss(v)};`); }
  for (const t of shadows) { const v = typeof t.value === 'string' ? (th.id === first ? t.value : undefined) : t.value?.[th.id]; if (v) lines.push(`--${cssName(t.name)}: ${v};`); }
  if (lines.length) css += `${sel} {\n  ${lines.join('\n  ')}\n}\n`;
}
const rootLines = [];
for (const k of ['spacing', 'radius', ...OTHER]) for (const t of listFam(k)) rootLines.push(`--${cssName(t.name)}: ${len(t.value)};`);
const families = tokens.type?.families ?? {};
for (const [k, v] of Object.entries(families)) rootLines.push(`--font-${k.toLowerCase()}: ${v};`);
if (rootLines.length) css += `:root {\n  ${rootLines.join('\n  ')}\n}\n`;
const styles = [];
for (const g of tokens.type?.groups ?? []) for (const s of g.styles ?? []) {
  if (!NAME.test(s.name)) continue;
  const fam = s.family || g.family;
  styles.push({...s, group: g.name, fam});
  css += `.${cssName(s.name)} { ${fam ? `font-family: var(--font-${fam.toLowerCase()});` : ''} font-size: ${len(s.fontSize)}; ${s.lineHeight != null ? `line-height: ${lh(s.lineHeight)};` : ''} ${s.fontWeight != null ? `font-weight: ${s.fontWeight};` : ''} ${s.letterSpacing != null ? `letter-spacing: ${len(s.letterSpacing)};` : ''} ${s.fontStyle ? `font-style: ${s.fontStyle};` : ''} }\n`;
}
for (const f of tokens.type?.fonts ?? []) {
  const file = f.file?.includes('/') ? f.file : `fonts/${f.file}`;
  if (!f.file || !has(file)) { notes.push(`Font file missing: ${f.file}`); continue; }
  copy(file, `assets/${file}`);
  css = `@font-face { font-family: "${f.family}"; src: url("${file}"); font-weight: ${f.weight ?? 400}; font-style: ${f.style ?? 'normal'}; font-display: swap; }\n` + css;
}
put('assets/tokens.css', css);

// ---------- bundle, stylesheet, libraries ----------
const head = ['<link rel="stylesheet" href="../assets/tokens.css">'];
if (has('components/bundle.css')) { copy('components/bundle.css', 'assets/bundle.css'); head.push('<link rel="stylesheet" href="../assets/bundle.css">'); }
const CDN = {react: v => `https://cdn.jsdelivr.net/npm/react@${v}/umd/react.production.min.js`, 'react-dom': v => `https://cdn.jsdelivr.net/npm/react-dom@${v}/umd/react-dom.production.min.js`};
for (const lib of index.libraries ?? []) {
  const local = lib.file && has(lib.file) ? lib.file : ['components/lib', ''].map(d => `${d}/${lib.name}.js`).find(has);
  if (local) { copy(local, `assets/lib/${path.basename(local)}`); head.push(`<script src="../assets/lib/${path.basename(local)}"></script>`); }
  else if (CDN[lib.name]) head.push(`<script src="${CDN[lib.name](lib.version === '18' ? '18.3.1' : lib.version)}"></script>`);
  else notes.push(`Library ${lib.name} has no local file; previews that need it stay blank.`);
}
if (has('components/bundle.js')) { copy('components/bundle.js', 'assets/bundle.js'); head.push('<script src="../assets/bundle.js"></script>'); }

// ---------- previews ----------
const MARK = /^\s*<!--\s*@dsCard([^>]*)-->\s*/;
const attr = (s, k) => (s.match(new RegExp(`${k}="([^"]*)"`)) || s.match(new RegExp(`${k}=(\\S+)`)) || [])[1];
// Boolean marker flags: `gl`, `gl=1`, `fluid`… (a system can declare WebGL/WebGPU use the regex cannot see).
const flag = (s, k) => new RegExp(`(^|\\s)${k}(="?(1|true)"?)?(?=\\s|$)`).test(s || '');
const compDir = has('components/Cover/preview.html') || fs.existsSync(path.join(P, 'components')) ? fs.readdirSync(path.join(P, 'components'), {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name) : [];
const frameDoc = (body, id) => `<!doctype html><html data-theme="${first}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
${head.join('\n')}
<style>html,body{margin:0;background:transparent}html{overflow:hidden}body{padding:0;font-family:${families.sans ? 'var(--font-sans)' : 'system-ui,sans-serif'}}</style>
<script>
addEventListener('message',e=>{if(e.data&&e.data.dsTheme)document.documentElement.dataset.theme=e.data.dsTheme;});
(function(){try{var t=new URLSearchParams(location.search).get('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}})();
addEventListener('load',function(){var post=function(){parent.postMessage({dsFrame:${JSON.stringify(id)},h:Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))},'*');};post();try{new ResizeObserver(post).observe(document.body);}catch(e){}});
addEventListener('error',function(e){parent.postMessage({dsFrame:${JSON.stringify(id)},err:String(e.message||e)},'*');});
</script></head><body>
${body}
</body></html>`;
// A preview "uses WebGL" when it loads three.js / creates a GL context itself, or the bundle does.
const GL = /three(\.min)?\.js|WebGLRenderer|getContext\(\s*['"](webgl2?|experimental-webgl)['"]/;
const bundleGL = has('components/bundle.js') && /getContext\(\s*['"](webgl2?|experimental-webgl)['"]/.test(read('components/bundle.js'));
const components = [];
let cover = null;
for (const name of compDir.sort()) {
  const pv = `components/${name}/preview.html`;
  const rd = `components/${name}/README.md`;
  if (!has(pv) && !has(rd)) continue;
  const src = has(pv) ? read(pv) : '';
  const m = src.match(MARK);
  const meta = m ? {group: attr(m[1], 'group'), height: Number(attr(m[1], 'height')) || 120, subtitle: attr(m[1], 'subtitle'), width: Number(attr(m[1], 'width')) || 0, fluid: flag(m[1], 'fluid'), glFlag: flag(m[1], 'gl')} : {height: 120};
  if (has(pv)) put(`previews/${name}.html`, frameDoc(src.replace(MARK, ''), name));
  const entry = {name, ...meta, preview: has(pv), gl: has(pv) && (bundleGL || GL.test(src) || !!meta.glFlag), readme: has(rd) ? read(rd) : ''};
  if (name === 'Cover' && !entry.readme) cover = entry; else components.push(entry);
}
const groups = [];
for (const c of components) { const g = c.group || 'Components'; let row = groups.find(x => x.name === g); if (!row) groups.push(row = {name: g, items: []}); row.items.push(c); }
// design-system.json "groups" (when given) also orders the component groups; unlisted groups keep their place after them.
const order = index.groups ?? [];
if (order.length) groups.sort((a, b) => (order.includes(a.name) ? order.indexOf(a.name) : order.length) - (order.includes(b.name) ? order.indexOf(b.name) : order.length));

// ---------- showcase (optional): showcase/*.html → full-width live sections after the overview ----------
// Line 1: <!-- @dsShowcase title="…" eyebrow="…" lede="…" height=N gl -->. Each runs in its own frame with the
// same runtime, tokens and theme sync as component previews.
const SHOW = /^\s*<!--\s*@dsShowcase([^>]*)-->\s*/;
const showcase = fs.existsSync(path.join(P, 'showcase')) ? fs.readdirSync(path.join(P, 'showcase')).filter(f => /\.html?$/i.test(f)).sort().map(f => {
  const src = read(`showcase/${f}`), a = (src.match(SHOW) || [])[1] || '', base = path.basename(f, path.extname(f));
  const id = `show-${slug(base.replace(/^\d+[-_]?/, '')) || slug(base)}`;
  put(`previews/${id}.html`, frameDoc(src.replace(SHOW, ''), id));
  return {id, title: attr(a, 'title') || base, eyebrow: attr(a, 'eyebrow') || '', lede: attr(a, 'lede') || '', height: Number(attr(a, 'height')) || 480, gl: bundleGL || GL.test(src) || flag(a, 'gl')};
}) : [];

// ---------- prose sections ----------
const mdFiles = [];
const walk = dir => { for (const d of fs.readdirSync(path.join(P, dir), {withFileTypes: true})) {
  const rel = dir ? `${dir}/${d.name}` : d.name;
  if (d.name.startsWith('.') || ['components', 'assets', 'api', 'node_modules', 'fonts', 'showcase'].includes(rel)) continue;
  if (d.isDirectory()) walk(rel); else if (/\.mdx?$/i.test(d.name) && rel !== 'README.md') mdFiles.push(rel);
} };
walk('');
mdFiles.sort();
const sections = mdFiles.slice(0, 24).map((f, i) => { const md = read(f); const h = md.match(/^#\s+(.+)$/m); return {id: `section-${i + 1}`, title: h ? h[1].trim() : path.basename(f, path.extname(f)), md: h ? md.replace(/^#\s+.+\n?/m, '') : md, file: f}; });

// ---------- assets ----------
const assetGroups = [];
const idxGroups = index.assetGroups ?? {};
const groupNames = [...new Set([...(index.groups ?? []), ...Object.keys(idxGroups), ...(fs.existsSync(path.join(P, 'assets')) ? fs.readdirSync(path.join(P, 'assets'), {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name) : [])])];
for (const g of groupNames) {
  const rec = idxGroups[g] ?? {};
  const listed = rec.order ?? Object.keys(rec.files ?? {});
  const localDir = path.join(P, 'assets', g);
  const localFiles = fs.existsSync(localDir) ? fs.readdirSync(localDir).filter(f => !/^readme\.md$/i.test(f) && !f.startsWith('.')) : [];
  const files = [...new Set([...listed, ...localFiles])].map(n => {
    const local = has(`assets/${g}/${n}`);
    if (local) copy(`assets/${g}/${n}`, `assets/files/${g}/${n}`);
    const r = rec.files?.[n];
    return {name: n, local, type: r?.type || (/\.svg$/i.test(n) ? 'image/svg+xml' : /\.(png|jpe?g|gif|webp|avif)$/i.test(n) ? 'image' : /\.(mp4|webm|mov)$/i.test(n) ? 'video' : ''), size: r?.size ?? (local ? fs.statSync(path.join(localDir, n)).size : null), blob: r?.blob};
  });
  const readme = has(`assets/${g}/README.md`) ? read(`assets/${g}/README.md`) : '';
  if (files.length || readme) assetGroups.push({name: g, tile: rec.tile || 'm', files, readme});
}

// ---------- page ----------
const readme = has('README.md') ? read('README.md').split(/\n---\n## Consuming this system/)[0] : '';
const readmeBody = readme.replace(/^#\s+.+\n?/, '');
const tagline = (readmeBody.match(/^([^\n#|`>-][^\n]+)/m) || [])[1] || '';
const lc = index.lastChange;
const nav = [];
const secs = [];
const addNav = (id, label, level = 0, count) => nav.push({id, label, level, count});

addNav('overview', 'Overview');
secs.push(`<section id="overview" class="sec">
${cover?.preview ? `<div class="cover${cover.fluid ? ' fluid' : ''}" data-h="${cover.height}"><iframe title="Cover" src="previews/Cover.html" data-frame="Cover" style="height:${cover.height}px" loading="eager"></iframe></div>` : ''}
<div class="prose readme">${renderMarkdown(readmeBody)}</div>
</section>`);
if (showcase.length) {
  addNav('showcase', 'Showcase', 0, showcase.length);
  for (const s of showcase) addNav(s.id, s.title, 1);
  secs.push(`<div id="showcase" class="showcase">${showcase.map(s => `<section id="${s.id}" class="sec show">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}<h2 class="sec-title">${esc(s.title)}</h2>${s.lede ? `<p class="lede">${esc(s.lede)}</p>` : ''}
<div class="show-stage"><iframe title="${esc(s.title)}" data-src="previews/${s.id}.html" data-frame="${s.id}"${s.gl ? ' data-gl="1"' : ''} style="height:${s.height}px"></iframe></div></section>`).join('\n')}</div>`);
}

for (const s of sections) { addNav(s.id, s.title, 1); secs.push(`<section id="${s.id}" class="sec"><p class="eyebrow">Guideline · <code>${esc(s.file)}</code></p><h2 class="sec-title">${esc(s.title)}</h2><div class="prose">${renderMarkdown(s.md)}</div></section>`); }

if (colors.length) {
  addNav('colors', 'Colors', 0, colors.length);
  const stem = n => n.replace(/[-_.]?[0-9]+$/, '').split(/[-_.]/).slice(0, 2).join('-');
  const bands = [];
  for (const t of colors) { const s = stem(t.name); let b = bands.find(x => x.s === s); if (!b) bands.push(b = {s, items: []}); b.items.push(t); }
  // Prefixed names (ov-bg, ov-text…) give one band per token; show those as a single grid instead.
  if (bands.length > 3 && bands.length > colors.length * 0.6) bands.splice(0, bands.length, {s: '', items: colors});
  secs.push(`<section id="colors" class="sec"><h2 class="sec-title">Colors</h2>
<p class="lede">${colors.length} tokens · ${themes.map(t => esc(t.name)).join(' / ')}. ${tokens.color?.note ? esc(tokens.color.note) : ''}</p>
${bands.map(b => `<div class="band">${b.s ? `<h3 class="band-title">${esc(b.s)}</h3>` : ''}<div class="swatches">${b.items.map(t => `
<article class="swatch" data-copy="var(--${esc(cssName(t.name))})">
  <div class="chips">${themes.map(th => { const v = perTheme(t, th.id); return `<span class="chip" title="${esc(th.name)}" style="background:${esc(colorCss(colorOk(v) ? v : perTheme(t, first)))}"></span>`; }).join('')}</div>
  <div class="sw-meta"><code class="tok">${esc(t.name)}</code>
  <span class="vals">${themes.map(th => { const v = perTheme(t, th.id); return v ? `<span>${themes.length > 1 ? `<i>${esc(th.id)}</i> ` : ''}${esc(v)}</span>` : ''; }).join('')}</span>
  ${t.usage ? `<p class="usage">${esc(t.usage)}</p>` : ''}</div>
</article>`).join('')}</div></div>`).join('')}
</section>`);
}

if (styles.length) {
  addNav('type', 'Typography', 0, styles.length);
  secs.push(`<section id="type" class="sec"><h2 class="sec-title">Typography</h2>
<div class="families">${Object.entries(families).map(([k, v]) => `<div class="fam"><code class="tok">--font-${esc(k)}</code><span style="font-family:var(--font-${esc(k.toLowerCase())})" class="fam-sample">Aa 永 123</span><span class="muted mono">${esc(v)}</span></div>`).join('')}</div>
${[...new Set(styles.map(s => s.group))].map(g => `<h3 class="band-title">${esc(g)}</h3><div class="type-list">${styles.filter(s => s.group === g).map(s => `
<div class="type-row"><div class="type-meta"><code class="tok">.${esc(s.name)}</code><span class="muted mono">${esc(len(s.fontSize))} / ${esc(String(s.lineHeight ?? '–'))} · ${esc(String(s.fontWeight ?? 400))}</span>${s.usage ? `<span class="usage">${esc(s.usage)}</span>` : ''}</div>
<div class="type-sample ${esc(cssName(s.name))}">${esc(s.sample || 'The quick brown fox · 光与点')}</div></div>`).join('')}</div>`).join('')}
</section>`);
}

const scaleSection = (id, label, list, draw) => {
  if (!list.length) return;
  addNav(id, label, 0, list.length);
  secs.push(`<section id="${id}" class="sec"><h2 class="sec-title">${esc(label)}</h2>${tokens[id === 'space' ? 'spacing' : id]?.note ? `<p class="lede">${esc(tokens[id === 'space' ? 'spacing' : id].note)}</p>` : ''}
<div class="scale">${list.map(t => `<div class="scale-row"><code class="tok">${esc(t.name)}</code><span class="mono val">${esc(typeof t.value === 'object' ? JSON.stringify(t.value) : len(t.value))}</span><div class="viz">${draw(t)}</div><span class="usage">${esc(t.usage || '')}</span></div>`).join('')}</div></section>`);
};
scaleSection('space', 'Spacing', listFam('spacing'), t => `<span class="bar" style="width:min(100%,var(--${cssName(t.name)}))"></span>`);
scaleSection('radius', 'Radius', listFam('radius'), t => `<span class="rad" style="border-radius:var(--${cssName(t.name)})"></span>`);
scaleSection('shadow', 'Shadow', shadows, t => `<span class="shd" style="box-shadow:var(--${cssName(t.name)})"></span>`);
for (const k of OTHER) scaleSection(k, k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()), listFam(k), () => '');

if (components.length) {
  addNav('components', 'Components', 0, components.length);
  for (const g of groups) addNav(`group-${slug(g.name)}`, g.name, 1, g.items.length);
  secs.push(`<section id="components" class="sec"><h2 class="sec-title">Components</h2>
<div class="toolbar"><input id="filter" type="search" placeholder="Filter components" aria-label="Filter components"><span class="muted" id="count">${components.length} components</span></div>
${groups.map(g => `<div class="cgroup" id="group-${slug(g.name)}"><h3 class="band-title">${esc(g.name)} <span class="muted">${g.items.length}</span></h3>
${g.items.map(c => { const md = c.readme.replace(/^#\s+.+\n?/, ''); const summary = (md.trim().split(/\n\s*\n/)[0] || '').replace(/\n/g, ' '); const rest = md.trim().split(/\n\s*\n/).slice(1).join('\n\n'); return `
<article class="comp" id="comp-${esc(c.name)}" data-name="${esc((c.name + ' ' + (c.subtitle || '') + ' ' + g.name).toLowerCase())}">
  <header class="comp-head"><h4><a href="#comp-${esc(c.name)}">${esc(c.name)}</a></h4>${c.subtitle ? `<span class="muted">${esc(c.subtitle)}</span>` : ''}</header>
  ${c.preview ? `<div class="stage"><iframe title="${esc(c.name)} preview" data-src="previews/${esc(c.name)}.html" data-frame="${esc(c.name)}"${c.gl ? ' data-gl="1"' : ''} style="height:${c.height}px"></iframe></div>` : '<div class="stage empty">No preview</div>'}
  ${summary ? `<div class="prose comp-sum">${renderMarkdown(summary)}</div>` : ''}
  ${rest ? `<details class="comp-more"><summary>Guidelines</summary><div class="prose">${renderMarkdown(rest)}</div></details>` : ''}
</article>`; }).join('')}</div>`).join('')}
</section>`);
}

if (assetGroups.length) {
  addNav('assets', 'Assets', 0, assetGroups.reduce((n, g) => n + g.files.length, 0));
  secs.push(`<section id="assets" class="sec"><h2 class="sec-title">Assets</h2>${assetGroups.map(g => `<h3 class="band-title">${esc(g.name)}</h3>${g.readme ? `<div class="prose">${renderMarkdown(g.readme.replace(/^#\s+.+\n?/, ''))}</div>` : ''}
<div class="assets tile-${esc(g.tile)}">${g.files.map(f => `<figure class="asset">${f.local && /image/.test(f.type) ? `<img src="assets/files/${encodeURI(g.name)}/${encodeURI(f.name)}" alt="${esc(f.name)}">` : f.local && /video/.test(f.type) ? `<video src="assets/files/${encodeURI(g.name)}/${encodeURI(f.name)}" controls preload="metadata" playsinline></video>` : `<div class="asset-missing">${f.local ? esc(path.extname(f.name).slice(1).toUpperCase()) : 'Stored online only'}</div>`}<figcaption><code>${esc(f.name)}</code>${f.size ? `<span class="muted">${(f.size / 1024).toFixed(1)} KB</span>` : ''}</figcaption></figure>`).join('')}</div>`).join('')}</section>`);
}

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, ''); }

const viewerCss = fs.readFileSync(path.join(here, 'viewer.css'), 'utf8');
const viewerJs = fs.readFileSync(path.join(here, 'viewer.js'), 'utf8');
// Optional system skin: catalog.css restyles the viewer chrome with the system's own tokens and fonts.
const skin = has('catalog.css') ? read('catalog.css') : '';
const html = `<!doctype html>
<html lang="zh" data-ds-theme="${esc(first)}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Design System</title>
<link rel="stylesheet" href="assets/tokens.css">
<style>${viewerCss}</style>${skin ? `\n<style>${skin}</style>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="shell">
<aside class="side" aria-label="Design system navigation">
  <div class="brand"><span class="brand-kicker">Design system</span><strong>${esc(title)}</strong>${namespace ? `<code class="ns">window.${esc(namespace)}</code>` : ''}</div>
  ${themes.length > 1 ? `<div class="themes" role="radiogroup" aria-label="Theme">${themes.map((t, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-theme-id="${esc(t.id)}">${esc(t.name)}</button>`).join('')}</div>` : ''}
  <nav><ul>${nav.map(n => `<li class="lv${n.level}"><a href="#${esc(n.id)}">${esc(n.label)}${n.count != null ? `<span class="n">${n.count}</span>` : ''}</a></li>`).join('')}</ul></nav>
  <div class="side-foot">${lc ? `<p>Last change · ${esc(String(lc.at || '').slice(0, 10))}<br>${esc(lc.note || '')}</p>` : ''}<p>Built ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by <code>ds-viewer</code></p></div>
</aside>
<main id="main">
${secs.join('\n')}
${notes.length ? `<section class="sec notes"><h2 class="sec-title">Build notes</h2><ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>` : ''}
</main>
</div>
<script>${viewerJs}</script>
</body>
</html>`;
put('index.html', html);
console.log(`ds-viewer: ${title} → ${path.join(OUT, 'index.html')}`);
console.log(`  ${colors.length} colors, ${styles.length} type styles, ${components.length} components, ${sections.length} sections, ${showcase.length ? `${showcase.length} showcase sections, ` : ''}${assetGroups.length} asset groups${notes.length ? `; ${notes.length} notes` : ''}`);
for (const n of notes) console.log('  note:', n);
