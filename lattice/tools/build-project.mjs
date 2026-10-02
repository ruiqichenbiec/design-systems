// Assembles project/ (the Claude Design System file layout read by the workspace ds-viewer) from sources:
// tokens parsed from src/tokens.css, a classic-script bundle of src/index.js, docs from README/DESIGN/PROFILE,
// and component previews from catalog/. Then runs ds-viewer → dist/catalog/index.html.
// Never edit project/ or dist/catalog/ by hand.
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const P = join(root, "project");
const rd = (f) => readFile(join(root, f), "utf8");
await rm(P, { recursive: true, force: true });
await mkdir(join(P, "components"), { recursive: true });

// ---------- tokens.json from src/tokens.css ----------
const tokensCss = await rd("src/tokens.css");
const rootBlock = tokensCss.slice(tokensCss.indexOf(":root {"), tokensCss.indexOf("}", tokensCss.indexOf(":root {")));
const vars = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const need = (k) => { if (!(k in vars)) throw new Error(`tokens.css has no --${k}`); return vars[k]; };
const COLOR_USE = {
  bg: "Ink Night · page and field background.",
  "bg-2": "Raised Ink · component specimens and the command palette surface.",
  ink: "Bone Point · points at rest, the primary button fill.",
  text: "Headlines and body text (≥ 12:1 on bg).",
  "text-dim": "Leads, secondary text, labels (7:1 on bg).",
  "text-faint": "Disabled text and decoration only (3.6:1, never body copy).",
  hot: "Signal Orange · action, and 'what it needs' (upstream). 5.9:1 on bg.",
  "hot-2": "Ice Blue · 'what it enables' (downstream) only. 11:1 on bg.",
  line: "Hairline · 1px insets on panels and specimens.",
  "line-strong": "Strong hairline · ghost buttons, dotted rules, switch tracks.",
  panel: "Panel · ink at 78% under a 10px backdrop blur, over the field.",
};
const size = (k) => need(k);
const tokens = {
  name: "点阵 Lattice",
  version: 1,
  color: {
    themes: [{ id: "night", name: "Night" }],
    note: "One committed world: points of light on deep ink. Orange means needs/action, ice blue means enables; never swap them.",
    tokens: Object.keys(COLOR_USE).map((k) => ({ name: k, value: { night: need(k) }, usage: COLOR_USE[k] })),
  },
  type: {
    fonts: [],
    families: { ui: need("f-ui"), dot: need("f-dot"), zh: need("f-zh") },
    groups: [
      { name: "Matrix", family: "dot", styles: [
        { name: "matrix-caption", fontSize: size("t-15"), fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1.3, sample: "LORENZ ATTRACTOR · σ = 10", usage: "Captions, statuses, gesture names. Never below 15px." },
      ] },
      { name: "Reading", family: "ui", styles: [
        { name: "headline", fontSize: size("t-40"), fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", sample: "A waterfall of theorems", usage: "Section titles, with the Chinese title inline before it." },
        { name: "title", fontSize: size("t-21"), fontWeight: 600, lineHeight: 1.3, sample: "Bolzano–Weierstrass", usage: "Component and card titles." },
        { name: "body", fontSize: size("t-17"), fontWeight: 400, lineHeight: 1.6, sample: "Every bounded sequence of reals has a convergent subsequence.", usage: "Leads and prose, max 60ch." },
        { name: "ui", fontSize: size("t-15"), fontWeight: 500, lineHeight: 1.2, sample: "Next set", usage: "Buttons, tabs, switches, navigation." },
        { name: "small", fontSize: size("t-13"), fontWeight: 400, lineHeight: 1.4, sample: "Illustrative summaries; replace with final copy.", usage: "Legends, footers, metadata." },
        { name: "label", fontSize: size("t-12"), fontWeight: 500, lineHeight: 1, sample: "Monotone convergence", usage: "Labels pinned to 3D points." },
      ] },
      { name: "Chinese", family: "zh", styles: [
        { name: "zh-title", fontSize: size("t-28"), fontWeight: 700, lineHeight: 1.3, sample: "万物皆点集，交互即映射。", usage: "Chinese titles and the thesis line." },
      ] },
    ],
  },
  spacing: { tokens: Object.keys(vars).filter((k) => /^s-\d$/.test(k)).map((k) => ({ name: k, value: vars[k], usage: `Spacing step ${k.slice(2)}.` })) },
  radius: { tokens: [
    { name: "r-1", value: need("r-1"), usage: "Small targets, focus outlines." },
    { name: "r-2", value: need("r-2"), usage: "Panels, specimens, cards, command palette." },
    { name: "r-pill", value: need("r-pill"), usage: "Buttons, switch tracks, chips." },
  ] },
  duration: { tokens: ["t-fast", "t-mid", "t-slow"].map((k) => ({ name: k, value: need(k), usage: "CSS transitions; the field and dots run on the shared clock." })) },
  easing: { tokens: [{ name: "ease", value: need("ease"), usage: "Default settle." }, { name: "ease-in-out", value: need("ease-in-out"), usage: "Exits." }] },
  dotPitch: { tokens: [{ name: "pitch", value: need("pitch"), usage: "Dot pitch for DOM dot patterns (dotted rules, underlines)." }] },
};
await writeFile(join(P, "tokens.json"), JSON.stringify(tokens, null, 2));

// ---------- bundle.js (classic script → window.Lattice) + bundle.css ----------
await build({ entryPoints: [join(root, "src/index.js")], bundle: true, minify: true, format: "iife", globalName: "Lattice", target: "es2020", outfile: join(P, "components/bundle.js"), legalComments: "none", logLevel: "warning" });
const fonts = "@import url('https://fonts.googleapis.com/css2?family=Doto:wght@500;700;900&family=Atkinson+Hyperlegible+Next:wght@300..700&family=Noto+Sans+SC:wght@400;500;700&display=swap');\n";
const previewCss = `
/* catalog previews: every card sits in the Night world */
html, body { background: var(--bg) !important; color: var(--text); }
.lx-pv { padding: 24px; }
.pv-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.pv-col { display: grid; gap: 14px; justify-items: start; }
.pv-note { margin: 0 0 14px; font-size: 14px; color: var(--text-dim); }
`;
await writeFile(join(P, "components/bundle.css"), fonts + tokensCss + "\n" + (await rd("src/components.css")) + previewCss);

// ---------- components from catalog/ ----------
await cp(join(root, "catalog/components"), join(P, "components"), { recursive: true });

// ---------- docs ----------
const fix = (md) => md.replace(/\]\((?!https?:|#)([^)]+)\)/g, "](../../$1)"); // links resolve from dist/catalog/
const readme = await rd("README.md");
await writeFile(join(P, "README.md"), fix(readme));
const design = (await rd("DESIGN.md")).replace(/^---[\s\S]*?---\s*/, "");
await writeFile(join(P, "design.md"), fix(design));
const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
await writeFile(join(P, "design-system.json"), JSON.stringify({
  v: 3, layout: "files", createdOnFiles: { v: 1, at: now },
  title: "点阵 Lattice", namespace: "Lattice", libraries: [], sections: {}, groups: ["Signature", "Interaction", "Controls", "Feedback", "Type", "Overlays"],
  assetGroups: {}, blobs: {}, docs: { readme: "project/README.md", sections: ["project/design.md"] },
  lastChange: { by: "Claude", via: "Claude Code", at: now, note: "点阵 Lattice 0.1: Night world, GPU point field, theorem waterfall, proof tree, 11 controls." },
}, null, 2));

// ---------- viewer ----------
const ws = resolve(root, "..");
const r = spawnSync(process.execPath, [join(ws, "ds-viewer/build.mjs"), root], { cwd: ws, encoding: "utf8" });
process.stdout.write(r.stdout || "");
if (r.status !== 0) { process.stderr.write(r.stderr || ""); process.exit(r.status || 1); }
