// 点阵 Lattice showcase — a personal-site prototype, built only from the system's parts.
import * as THREE from "three";
import { clock, reducedMotion } from "../src/core/motion.js";
import { sound } from "../src/core/sound.js";
import { WORLDS, currentWorldName, applyWorldCss } from "../src/core/theme.js";
import { Stage } from "../src/gl/stage.js";
import { Field } from "../src/gl/field.js";
import * as SETS from "../src/gl/sets.js";
import { Cascade } from "../src/gl/cascade.js";
import { ProofTree } from "../src/gl/prooftree.js";
import { DotGrid } from "../src/gl/dotgrid.js";
import { LabelLayer } from "../src/dom/labels.js";
import { mountCursor } from "../src/dom/cursor.js";
import { mountTabs, mountSwitch, mountSlider, mountProgress } from "../src/dom/controls.js";
import { mountDotText, mountLoader } from "../src/dom/dottext.js";
import { mountCommands, toast } from "../src/dom/command.js";
import { THEOREMS, TOPICS, byId, depths } from "../src/data/analysis.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const worldName = currentWorldName();
applyWorldCss(worldName);
if (document.fonts) await Promise.race([Promise.all(["900 16px Doto", "700 16px 'Noto Sans SC'", "500 16px 'Atkinson Hyperlegible Next'"].map((f) => document.fonts.load(f).catch(() => 0))), new Promise((r) => setTimeout(r, 2000))]);

/* ---------- stations: hero → waterfall (top → bottom) → proof tree ---------- */
const mobile = innerWidth <= 760;
const D = depths();
const DY = 1.3;
const FALL_Y = -40, TREE_Y = -90, TREES_Y = -130;
const fallBottom = FALL_Y - Math.max(...D.values()) * DY;
const zFall = mobile ? 22 : 13.5, zTree = mobile ? 18 : 13.5;
const stations = [
  { id: "hero", el: ".hero", anchor: 0.5, hold: 0.7, follow: true, pos: [0, 0, 10], look: [0, 0, 0], via: { pos: [0, -16, 26], look: [0, -30, 0] } },
  { id: "fallTop", el: "#waterfall", anchor: mobile ? 0.3 : 0.14, pos: [0, FALL_Y + 0.9, zFall], look: [0, FALL_Y - 1.9, 0], offset: [0.17, 0] },
  // leaving the bottom, the camera pulls back to show the whole fall, then dives in at the top for the tour
  { id: "fallBottom", el: "#waterfall", anchor: 0.86, pos: [0, fallBottom - 0.7, zFall], look: [0, fallBottom + 1.5, 0], offset: [0.17, 0], via: { pos: [0, (FALL_Y + fallBottom) / 2, mobile ? 52 : 40], look: [0, (FALL_Y + fallBottom) / 2, 0] } },
  { id: "tourStart", el: "#tour", anchor: 0.04, pos: () => tourCam.pos, look: () => tourCam.look },
  { id: "tourEnd", el: "#tour", anchor: 0.96, pos: () => tourCam.pos, look: () => tourCam.look, via: { pos: [0, (fallBottom + TREE_Y) / 2, 30], look: [0, (fallBottom + TREE_Y) / 2 - 6, 0] } },
  { id: "tree", el: "#tree", anchor: mobile ? 0.7 : 0.5, pos: [0, TREE_Y + 3.4, zTree], look: [0, TREE_Y + 2.9, 0], offset: [0.2, 0], offsetMobile: [0, -0.3] },
  // phones: the sticky HUD holds the top of the screen, so the stand sits lower and a little further away
  { id: "treesStart", el: "#trees", anchor: 0.06, pos: [0, TREES_Y + 3.4, mobile ? 23 : zTree], look: [0, TREES_Y + 2.9, 0], offset: [0.2, 0], offsetMobile: [0, 0.16] },
  { id: "treesEnd", el: "#trees", anchor: 0.94, pos: [0, TREES_Y + 3.4, mobile ? 23 : zTree], look: [0, TREES_Y + 2.9, 0], offset: [0.2, 0], offsetMobile: [0, 0.16] },
  { id: "close", el: "#contact", anchor: 0.5, pos: [0, 0, 10], look: [0, 0, 0] },
];

// the tour camera is recomputed every frame from the node being visited (see "tour" below)
const tourCam = { pos: [0, FALL_Y, 10], look: [0, FALL_Y - 0.5, 0] };
const stage = new Stage($("#stage"), stations, WORLDS[worldName]);
const cursor = mountCursor();

/* ---------- 点 hero: the field and its sets ---------- */
const field = new Field(stage);
field.useSets(SETS);
stage.add(field);
field.setOffset = new THREE.Vector3(mobile ? 0 : 1.35, mobile ? 0.8 : 0.25, 0.7);
field.onResize(stage);

const N = field.N;
const R = mobile ? 1.1 : 1.95;
const cache = new Map();
const pts = (key, make) => (cache.has(key) ? cache.get(key) : cache.set(key, make()).get(key));
function nameMaps(L) {
  const one = SETS.matrixText("POINT SETS", 2);
  if (L.cols >= one.w + 10) return [{ map: one, col: Math.floor((L.cols - one.w) / 2), row: Math.floor(L.rows * 0.2) }];
  const s = L.cols >= 66 ? 2 : 1;
  const a = SETS.matrixText("POINT", s), b = SETS.matrixText("SETS", s);
  const row = Math.floor(L.rows * 0.16);
  return [{ map: a, col: Math.floor((L.cols - a.w) / 2), row }, { map: b, col: Math.floor((L.cols - b.w) / 2), row: row + a.h + 2 * s }];
}
const in3d = { is3d: true, sweep: [0, -1, 0], span: 5, dur: 1.7, lit: 1.0, flow: 3.2, alpha: 0.22 };
const HERO_SETS = [
  { cap: "POINT SETS · 5×7 DOT MATRIX ×2", build: (L) => L.lit(nameMaps(L)), opts: { sweep: [1, 0, 0], span: 9, dur: 1.5, lit: 1.6, flow: 2.4, alpha: 0.42 } },
  { cap: "LORENZ ATTRACTOR · σ = 10, ρ = 28, β = 8/3", build: (L) => L.shape(pts("lorenz", () => SETS.lorenz(N, R))), opts: in3d },
  { cap: "TREFOIL · THE (2, 3) TORUS KNOT", build: (L) => L.shape(pts("knot", () => SETS.torusKnot(N, 2, 3, R))), opts: in3d },
  { cap: "FACE-CENTRED CUBIC CRYSTAL · 5³ CELLS", build: (L) => L.shape(pts("fcc", () => SETS.crystal(N, R))), opts: in3d },
  { cap: "KLEIN BOTTLE · FIGURE-8 IMMERSION", build: (L) => L.shape(pts("klein", () => SETS.klein(N, R * 1.05))), opts: in3d },
];
let si = -1, idle = 0, autoTurn = true;
const caption = $("#set-caption");
const setIndex = mountDotText($("#set-index"), { pitch: 4 });
function showSet(i) {
  si = (i + HERO_SETS.length) % HERO_SETS.length;
  const s = HERO_SETS[si];
  field.keep(s.build, s.opts);
  caption.textContent = s.cap;
  setIndex.set(String(si + 1).padStart(2, "0"));
  idle = 0;
  sound.whoosh(1.1, si % 2 === 0);
  setTimeout(() => sound.pluck(si * 2, 0.16), 900);
}
field.keep((L) => L.rest(), { dur: 0.001 });
setTimeout(() => showSet(0), reducedMotion() ? 0 : 700);
$("#next-set").addEventListener("click", () => showSet(si + 1));
field.addEventListener("release", (e) => { if (e.detail.melted) showSet(si + 1); });
field.addEventListener("tap", () => sound.tick(0.7, 0.3));
clock.add((dt) => { if (autoTurn && stage.near("hero", 0.4) && !field.holding) { idle += dt; if (idle > 11 && !reducedMotion()) showSet(si + 1); } else idle = 0; });
addEventListener("pointermove", () => (idle = Math.min(idle, 5)), { passive: true });

// hold-to-melt feedback: the cursor ring heats; touch devices get a plain ring
let touchRing = null;
if (!cursor.el) { touchRing = document.createElement("div"); touchRing.className = "touch-heat"; touchRing.setAttribute("aria-hidden", "true"); document.body.appendChild(touchRing); }
field.addEventListener("heat", (e) => {
  cursor.setHeat(e.detail);
  if (touchRing) { touchRing.style.opacity = e.detail > 0.02 ? "1" : "0"; touchRing.style.setProperty("--h", e.detail.toFixed(3)); touchRing.style.transform = `translate(${stage.pointer.x}px, ${stage.pointer.y}px)`; }
});

// the closing station: the camera comes back to the lattice and the proof is signed in points
const qedSet = { build: (L) => { const m = SETS.matrixText("QED", L.cols >= 60 ? 3 : 2); return L.lit([{ map: m, col: Math.floor((L.cols - m.w) / 2), row: Math.floor(L.rows * 0.22) }]); }, opts: { sweep: [0, 1, 0], span: 5, dur: 1.6, lit: 1.6, flow: 2.4, alpha: 0.42 } };
let zone = "hero";
clock.add(() => {
  const z = stage.near("close", 0.55) ? "close" : stage.near("hero", 0.6) ? "hero" : zone;
  if (z === zone) return;
  zone = z;
  if (z === "close") { field.keep(qedSet.build, qedSet.opts); sound.chord(4); }
  else if (si >= 0) { field.keep(HERO_SETS[si].build, HERO_SETS[si].opts); }
});

/* ---------- 瀑 the theorem waterfall ---------- */
const cascade = new Cascade({ theorems: THEOREMS, depth: D, topicOrder: Object.keys(TOPICS), dy: DY, stations: ["fallTop", "fallBottom", "tourStart", "tourEnd"] });
cascade.object.position.set(0, FALL_Y, 0);
stage.add(cascade);
const wall = new DotGrid({ w: 44, h: 36, pitch: 0.46, z: -6 });
wall.object.position.set(0, (FALL_Y + fallBottom) / 2, 0);
stage.add(wall);

const fallLabels = new LabelLayer();
THEOREMS.forEach((t) => fallLabels.get(t.id, esc(t.en)));
let fallHi = null;
const lightFall = (id) => {
  fallHi = id ? { id, up: cascade.ancestors(id), down: cascade.descendants(id) } : null;
  THEOREMS.forEach((t) => {
    fallLabels.cls(t.id, "is-hot", !!fallHi && (t.id === id || fallHi.up.has(t.id)));
    fallLabels.cls(t.id, "is-hot2", !!fallHi && fallHi.down.has(t.id));
  });
};
cascade.addEventListener("hover", (e) => {
  const id = e.detail;
  lightFall(id);
  if (id) { showCard(byId.get(id), { needs: fallHi.up.size, enables: fallHi.down.size }); sound.tick(1.2, 0.15); }
  else hideCard();
});
cascade.addEventListener("frame", (e) => {
  const proj = e.detail;
  if (!proj) { fallLabels.hideAll(); return; }
  const H = innerHeight;
  proj.forEach((p, i) => {
    const t = THEOREMS[i];
    const edge = Math.min(1, Math.min(p.y - 70, H - p.y) / (H * 0.12));
    let o = p.visible ? Math.max(0, edge) * 0.82 : 0;
    if (fallHi) o *= t.id === fallHi.id || fallHi.up.has(t.id) || fallHi.down.has(t.id) ? 1.2 : 0.22;
    fallLabels.place(t.id, p.x + 8, p.y - 8, Math.min(1, o));
  });
});
const goGrow = (id) => { growTree(id); $("#tree").scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" }); };
cascade.addEventListener("pick", (e) => goGrow(e.detail));

// accessible index of the waterfall: keyboard focus lights the same streams
$("#fall-index").innerHTML = [...THEOREMS].sort((a, b) => D.get(a.id) - D.get(b.id)).map((t) => `<li><button data-id="${t.id}">${esc(t.en)}</button></li>`).join("");
$$("#fall-index button").forEach((b) => {
  const on = () => { cascade.focus(b.dataset.id); lightFall(b.dataset.id); };
  const off = () => { cascade.focus(null); lightFall(null); };
  b.addEventListener("focus", on); b.addEventListener("blur", off);
  b.addEventListener("pointerenter", on); b.addEventListener("pointerleave", off);
  b.addEventListener("click", () => goGrow(b.dataset.id));
});

const kindSvg = {
  Foundation: Array.from({ length: 9 }, (_, i) => `<circle cx="${5 + (i % 3) * 5}" cy="${5 + Math.floor(i / 3) * 5}" r="1.5"/>`).join(""),
  Definition: Array.from({ length: 10 }, (_, i) => `<circle cx="${10 + Math.cos((i / 10) * 6.283) * 7}" cy="${10 + Math.sin((i / 10) * 6.283) * 7}" r="1.3"/>`).join(""),
  Theorem: Array.from({ length: 14 }, (_, i) => { const r = Math.sqrt((i + 0.5) / 14) * 7.5, a = i * 2.4; return `<circle cx="${10 + Math.cos(a) * r}" cy="${10 + Math.sin(a) * r}" r="1.3"/>`; }).join(""),
};
$("#kinds").innerHTML = Object.entries(kindSvg).map(([k, s]) => `<li><svg viewBox="0 0 20 20" aria-hidden="true">${s}</svg>${k}</li>`).join("");

/* ---------- 巡 tour: scrolling walks every result in dependency order and "hovers" each once ---------- */
// 16 landmark results, one per two wheel notches (~200 px of scroll each), in dependency order
const TOUR_IDS = ["zfc", "lub", "seqlimit", "mct", "bw", "cauchy", "continuity", "evt", "mvt", "taylor", "riemann", "ftc2", "uniform", "powerseries", "banach", "picard"];
const ORDER = TOUR_IDS.slice().sort((a, b) => D.get(a) - D.get(b) || cascade.pos.get(a).x - cascade.pos.get(b).x);
$("#tour").style.setProperty("--tour-steps", ORDER.length);
$("#tour-of").textContent = `/ ${ORDER.length} · the tour`;
const tourCard = $("#tour-card");
const tourN = mountDotText($("#tour-n"), { pitch: 4 });
const tourXY = { x: 0, y: FALL_Y };
let tourK = -1;
const nodeWorld = (id) => cascade.pos.get(id).clone().add(cascade.object.position);
function tourVisit(k) {
  tourK = k;
  const id = ORDER[k], t = byId.get(id);
  cascade.focus(id);
  lightFall(id);
  tourN.set(String(k + 1).padStart(2, "0"));
  tourCard.querySelector(".lx-card__kind").textContent = `${t.kind} · ${TOPICS[t.topic].en}`;
  tourCard.querySelector(".lx-card__title").textContent = t.en;
  tourCard.querySelector(".lx-card__zh").textContent = t.zh;
  tourCard.querySelector(".lx-card__st").textContent = t.st;
  tourCard.querySelector(".lx-card__rel").innerHTML = `Needs <b class="hot">${fallHi.up.size}</b> earlier results · enables <b class="hot2">${fallHi.down.size}</b> later ones`;
  sound.pluck(D.get(id), 0.1);
}
const iStart = stations.findIndex((s) => s.id === "tourStart"), iEnd = stations.findIndex((s) => s.id === "tourEnd");
let inTour = false;
clock.add((dt) => {
  const p = stage.progress;
  const on = p >= iStart - 0.02 && p <= iEnd + 0.02;
  const t = Math.min(1, Math.max(0, (p - iStart) / (iEnd - iStart)));
  const k = Math.min(ORDER.length - 1, Math.floor(t * ORDER.length));
  if (on && k !== tourK) tourVisit(k);
  if (on !== inTour) { inTour = on; if (!on) { cascade.focus(null); lightFall(null); tourK = -1; } }
  // the camera glides after the visited node
  const w = nodeWorld(ORDER[Math.max(0, tourK)]);
  const a = Math.min(1, dt * 4);
  tourXY.x += (w.x - tourXY.x) * a; tourXY.y += (w.y - tourXY.y) * a;
  const z = mobile ? 15 : 9.5;
  // desktop: the node sits left of centre and its card to the right; phones: centred, card below
  const lead = mobile ? 0 : 1.1;
  tourCam.pos = [tourXY.x + lead * 0.8, tourXY.y + 0.6, z];
  tourCam.look = [tourXY.x + lead, tourXY.y - 0.3, 0];
  // the card sits beside the node it describes
  if (on && tourK >= 0) {
    const q = stage.project(nodeWorld(ORDER[tourK]));
    const cw = tourCard.offsetWidth, ch = tourCard.offsetHeight;
    const x = mobile ? 12 : Math.max(12, Math.min(innerWidth - cw - 12, q.x + 44));
    const y = mobile ? innerHeight - ch - 100 : Math.max(72, Math.min(innerHeight - ch - 100, q.y - ch / 2));
    tourCard.style.transform = `translate(${x}px, ${y}px)`;
    tourCard.classList.add("is-on");
  } else tourCard.classList.remove("is-on");
});

/* ---------- 树 the growing proof tree ---------- */
const CHOICES = ["picard", "peano", "taylor", "ftc2", "heineborel", "wapprox", "baire", "exp"];

/** Wire a ProofTree to DOM labels, a status line, a progress bar and pentatonic blooms. */
function proofView(tree, { labels, status, prog, onGrow }) {
  const view = { path: null, lastBloom: 0, done: false };
  view.grow = (id, swap = false) => {
    const tr = swap ? tree.swap(id) : tree.grow(id);
    labels.clear();
    tr.nodes.forEach((n) => labels.get(n.i, `${n.ref ? "↺ " : ""}${esc(n.t.en)}`, n.depth === 0 ? "is-root" : n.ref ? "is-ref" : ""));
    view.path = null; view.lastBloom = 0; view.done = false;
    prog?.set(0);
    sound.whoosh(0.8, true);
    onGrow?.(id, tr);
  };
  tree.addEventListener("frame", (e) => {
    if (!e.detail) { labels.hideAll(); return; }
    const { tree: tr, proj } = e.detail;
    let bloomed = 0;
    proj.forEach((p, i) => {
      const n = tr.nodes[i];
      const age = tr.clock - n.bloom;
      if (age > 0) bloomed++;
      const shown = view.path ? view.path.has(n) : n.depth <= 1 || (n.leaf && !n.ref);
      labels.place(i, p.x + 6, p.y - 7, p.visible && age > 0 && shown ? Math.min(1, age / 0.5) * (n.ref ? 0.6 : 0.92) : 0);
    });
    prog?.set(bloomed / tr.nodes.length);
    if (bloomed > view.lastBloom) { const n = tr.nodes.find((m) => Math.abs(tr.clock - m.bloom) < 0.05); sound.pluck(n ? n.depth : bloomed, 0.1); view.lastBloom = bloomed; }
    if (!view.done && bloomed === tr.nodes.length && tr.clock > tr.total) { view.done = true; sound.chord(0); }
    if (status) {
      const distinct = new Set(tr.nodes.map((n) => n.tid)).size;
      const depthMax = Math.max(...tr.nodes.map((n) => n.depth));
      const txt = bloomed < tr.nodes.length ? `GROWING · ${bloomed} / ${tr.nodes.length} STEPS` : `∎ ${byId.get(tr.root.tid).en.toUpperCase()} · ${distinct} RESULTS · DEPTH ${depthMax}`;
      if (status.textContent !== txt) status.textContent = txt;
    }
  });
  tree.addEventListener("hover", (e) => {
    const n = e.detail;
    view.path = null;
    if (!n) return hideCard();
    view.path = new Set();
    for (let m = n; m; m = m.parent) view.path.add(m);
    showCard(n.t, { depth: n.depth, ref: n.ref });
    sound.tick(1.3, 0.12);
  });
  tree.addEventListener("pick", (e) => view.grow(e.detail, true));
  return view;
}

const tree = new ProofTree({ byId, station: "tree" });
tree.object.position.set(0, TREE_Y, 0);
stage.add(tree);
let treeId = "picard";
const treeView = proofView(tree, {
  labels: new LabelLayer(), status: $("#tree-status"), prog: mountProgress($("#tree-prog")),
  onGrow: (id) => { treeId = id; $$("#choose button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === id))); },
});
const growTree = (id) => treeView.grow(id, !!tree.current);
$("#choose").innerHTML = CHOICES.map((id) => `<button role="radio" aria-checked="false" data-id="${id}">${esc(byId.get(id).en)}</button>`).join("");
$$("#choose button").forEach((b) => b.addEventListener("click", () => growTree(b.dataset.id)));
// the proof grows when the camera arrives, and grows again after you leave and come back
let treeHere = false;
clock.add(() => {
  const here = stage.near("tree", 0.3);
  if (here && !treeHere) { treeHere = true; treeView.grow(treeId, !!tree.current); }
  if (!stage.near("tree", 1.4)) treeHere = false;
});

/* ---------- 树 trees: each scroll step turns the stand to the next proof ---------- */
const TREE_SEQ = ["picard", "taylor", "heineborel", "peano", "wapprox", "baire"];
const trees = new ProofTree({ byId, station: ["treesStart", "treesEnd"] });
trees.object.position.set(0, TREES_Y, 0);
stage.add(trees);
const treesN = mountDotText($("#trees-n"), { pitch: 6 });
const treesView = proofView(trees, { labels: new LabelLayer(), prog: mountProgress($("#trees-prog")), onGrow: (id) => { $("#trees-name").textContent = byId.get(id).en; } });
const tsA = stations.findIndex((s) => s.id === "treesStart"), tsB = stations.findIndex((s) => s.id === "treesEnd");
let treesK = -1;
clock.add(() => {
  const p = stage.progress;
  if (p < tsA - 0.3 || p > tsB + 0.3) { treesK = -1; return; }
  const k = Math.min(TREE_SEQ.length - 1, Math.max(0, Math.floor(((p - tsA) / (tsB - tsA)) * TREE_SEQ.length)));
  if (k === treesK) return;
  treesView.grow(TREE_SEQ[k], treesK >= 0 && !!trees.current);
  treesK = k;
  treesN.set(String(k + 1).padStart(2, "0"));
});

/* ---------- hover card ---------- */
const card = $("#card");
function showCard(t, extra = {}) {
  card.querySelector(".lx-card__kind").textContent = `${t.kind} · ${TOPICS[t.topic].en}`;
  card.querySelector(".lx-card__title").textContent = t.en;
  card.querySelector(".lx-card__zh").textContent = t.zh;
  card.querySelector(".lx-card__st").textContent = t.st;
  const rel = card.querySelector(".lx-card__rel");
  if (extra.needs != null) rel.innerHTML = `Needs <b class="hot">${extra.needs}</b> earlier results · enables <b class="hot2">${extra.enables}</b> later ones. Click to grow its proof tree.`;
  else if (extra.ref) rel.textContent = "Proved elsewhere in this tree (↺). Click to grow it on its own.";
  else rel.textContent = extra.depth === 0 ? "The conclusion: everything above grows from its proof." : `Uses: ${t.deps.map((d) => byId.get(d).en).join(", ") || "nothing (a leaf)"}. Click to grow its own tree.`;
  card.hidden = false;
  const x = Math.min(innerWidth - card.offsetWidth - 12, stage.pointer.x + 18);
  const y = Math.min(innerHeight - card.offsetHeight - 12, stage.pointer.y + 18);
  card.style.transform = `translate(${Math.max(12, x)}px, ${Math.max(12, y)}px)`;
}
function hideCard() { card.hidden = true; }
addEventListener("scroll", hideCard, { passive: true });

/* ---------- 器 instruments ---------- */
$$("[data-dottext]").forEach((el) => { if (!el._dottext) mountDotText(el, { pitch: el.classList.contains("counter") ? 6 : 3 }); });
const TAB_TEXT = {
  math: "Proof books from analysis to topology, and the waterfall above.",
  quant: "Factor models, index mappings and time-series research, drawn as point sets.",
  agents: "Workflow plugins, local runtimes and a video toolkit.",
  games: "A grand-strategy 4X, a deck-building roguelike and an idle game.",
};
mountTabs($("#tabs"));
$("#tab-out").textContent = TAB_TEXT.math;
$("#tabs").addEventListener("tabs:change", (e) => ($("#tab-out").textContent = TAB_TEXT[e.detail.value]));

$$(".lx-switch").forEach(mountSwitch);
$$(".lx-slider input").forEach(mountSlider);
const prog = mountProgress($("#prog"));
mountProgress($("#prog-i"));
$("#prog-range").addEventListener("input", (e) => { prog.set(e.target.value / 100); $('[data-out-for="prog-range"]').textContent = e.target.value; });
mountLoader($("#loader"));

// the demos play themselves while on screen, until someone takes over
const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
const progDemo = { manual: 0, wait: 0.6 };
$("#prog-range").addEventListener("input", () => (progDemo.manual = 8));
clock.add((dt) => {
  if (progDemo.manual > 0) { progDemo.manual -= dt; return; }
  if (!onScreen($("#prog")) || reducedMotion()) return;
  if ((progDemo.wait -= dt) > 0) return;
  const now = prog.value;
  const v = now >= 1 ? 0 : Math.min(1, now + 0.07 + Math.random() * 0.09); // build in steps; when full, melt back to gas
  prog.set(v);
  $("#prog-range").value = String(Math.round(v * 100));
  $('[data-out-for="prog-range"]').textContent = String(Math.round(v * 100));
  progDemo.wait = v === 0 ? 1.4 : v >= 1 ? 2.6 : 1.05;
});
const swDemo = $("#sw-demo"), swDemoState = { wait: 1.2 };
clock.add((dt) => {
  if (swDemo._touched || !onScreen(swDemo) || reducedMotion()) return;
  if ((swDemoState.wait -= dt) > 0) return;
  swDemo._switch.set(!swDemo._switch.on, { quiet: true });
  swDemoState.wait = 2.6;
});
let count = 43;
$("#count-up").addEventListener("click", () => { count = (count + 1) % 1000; $("#counter")._dottext.set(String(count).padStart(3, "0")); sound.tick(1.4, 0.2); });
$("#count-word").addEventListener("click", () => { $("#counter")._dottext.set("QED"); sound.chord(2); });

const email = $("#email"), form = $("#field");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const ok = email.checkValidity();
  form.toggleAttribute("data-invalid", !ok);
  email.setAttribute("aria-invalid", String(!ok));
  $("#email-msg").textContent = ok ? "Looks right. (This demo sends nothing.)" : "That is not an email address yet: it needs a name, an @ and a domain.";
  ok ? sound.pluck(4, 0.15) : sound.tick(0.5, 0.3);
});

// sound: header button + switch stay in sync
const soundBtn = $("#sound-btn"), swSound = $("#sw-sound");
const paintSound = (on) => {
  soundBtn.setAttribute("aria-pressed", String(on));
  soundBtn.querySelector(".top__tool-label").textContent = on ? "Sound on" : "Sound off";
  if (swSound.getAttribute("aria-checked") !== String(on)) swSound.click();
};
sound.onChange(paintSound);
soundBtn.addEventListener("click", () => sound.toggle());
swSound.addEventListener("switch:change", (e) => { if (e.detail !== sound.enabled) sound.toggle(e.detail); });
if (sound.enabled) paintSound(true);
$("#sw-idle").addEventListener("switch:change", (e) => (autoTurn = e.detail));

const cmds = mountCommands([
  { id: "next", key: "下", en: "Next set", hint: "hero", run: () => { scrollTo({ top: 0, behavior: "smooth" }); showSet(si + 1); } },
  { id: "lorenz", key: "洛", en: "Show the Lorenz attractor", hint: "hero", run: () => { scrollTo({ top: 0, behavior: "smooth" }); showSet(1); } },
  { id: "name", key: "字", en: "Spell POINT SETS in the matrix", hint: "hero", run: () => { scrollTo({ top: 0, behavior: "smooth" }); showSet(0); } },
  { id: "fall", key: "瀑", en: "Open the theorem waterfall", zh: "定理之瀑", run: () => $("#waterfall").scrollIntoView({ behavior: "smooth" }) },
  { id: "tour", key: "巡", en: "Take the tour of all 43 results", zh: "逐个巡游", run: () => $("#tour").scrollIntoView({ behavior: "smooth" }) },
  { id: "trees", key: "转", en: "Watch the proofs one by one", zh: "证明树连播", run: () => $("#trees").scrollIntoView({ behavior: "smooth" }) },
  ...CHOICES.map((id) => ({ id: `grow-${id}`, key: "树", en: `Grow the proof of ${byId.get(id).en}`, zh: byId.get(id).zh, run: () => goGrow(id) })),
  { id: "system", key: "器", en: "Inspect the instruments", hint: "components", run: () => $("#instruments").scrollIntoView({ behavior: "smooth" }) },
  { id: "sound", key: "声", en: "Toggle sound", run: () => sound.toggle() },
  { id: "contact", key: "信", en: "Get in touch", run: () => $("#contact").scrollIntoView({ behavior: "smooth" }) },
]);
$("#cmd-btn").addEventListener("click", cmds.open);
$("#cmd-demo").addEventListener("click", cmds.open);
$("#toast-demo").addEventListener("click", () => {
  const msgs = [["Proof checked: no gaps found.", "OK"], ["43 results and their dependencies loaded.", "43"], ["A lemma was saved to the ledger.", "SAVED"]];
  const [m, tag] = msgs[Math.floor(Math.random() * msgs.length)];
  toast(m, { tag });
});

/* header: backdrop once the page moves; mark the section in view */
const header = $(".top");
addEventListener("scroll", () => header.classList.toggle("is-scrolled", scrollY > 40), { passive: true });
const navLinks = $$(".top__nav a");
const io = new IntersectionObserver((es) => {
  for (const en of es) if (en.isIntersecting) navLinks.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${en.target.id || "top"}`)));
}, { rootMargin: "-45% 0px -50% 0px" });
["waterfall", "tour", "tree", "instruments"].forEach((id) => io.observe(document.getElementById(id)));

window.lattice = { stage, field, cascade, tree, trees, showSet, growTree, sound, tour: () => ({ k: tourK, id: ORDER[tourK] }), treesAt: () => ({ k: treesK, id: TREE_SEQ[treesK] }), renderAt: (t) => clock.renderAt(t) };
