// Deterministic screenshots of the showcase in headless Chromium/Edge (GPU on).
// Usage: node tools/capture.mjs            (needs `node serve.mjs 4187` running, or BASE=<url>)
//        W=390 H=844 node tools/capture.mjs   → phone captures (m-*.png)
// The page runs in ?record mode, so time only advances through lattice.renderAt(t).
import { chromium } from "playwright-core";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, process.argv[2] || "outputs/captures");
await mkdir(out, { recursive: true });
const base = process.env.BASE || "http://127.0.0.1:4187";
const exe = [process.env.VG_BROWSER, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => p && existsSync(p));
const browser = await chromium.launch({
  executablePath: exe, headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--force-color-profile=srgb", "--hide-scrollbars", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});
const WORLDS = (process.env.WORLDS || "night").split(",");
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const MOBILE = W <= 760;

// Each scene: prepare the page (scroll, pointer, sets), then advance the clock to `at` seconds.
const SCENES = [
  ["1-name", () => {}, 5.5],
  ["2-lorenz", () => window.lattice.showSet(1), 11],
  ["2b-scroll", () => { window.lattice.showSet(0); }, 15, () => { scrollTo(0, innerHeight * 0.33); dispatchEvent(new Event("scroll")); }, 16],
  ["3-waterfall", () => {
    const w = document.querySelector("#waterfall"); scrollTo(0, w.offsetTop + w.offsetHeight * 0.36 - innerHeight / 2); dispatchEvent(new Event("scroll"));
  }, 21, () => {
    const c = window.lattice.cascade, st = window.lattice.stage, q = st.project(c.pos.get("mvt").clone().applyMatrix4(c.object.matrixWorld));
    dispatchEvent(new PointerEvent("pointermove", { clientX: q.x, clientY: q.y, bubbles: true }));
  }, 22],
  ["3b-tour", () => { dispatchEvent(new PointerEvent("pointermove", { clientX: -500, clientY: -500 })); const t = document.querySelector("#tour"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * 0.42); dispatchEvent(new Event("scroll")); }, 26],
  ["4-tree-growing", () => { const t = document.querySelector("#tree"); scrollTo(0, t.offsetTop + t.offsetHeight * 0.5 - innerHeight / 2); dispatchEvent(new Event("scroll")); }, 30.2],
  ["4b-tree-grown", () => {}, 38],
  ["4c-trees-turning", () => { const t = document.querySelector("#trees"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * 0.1); dispatchEvent(new Event("scroll")); }, 46, () => { const t = document.querySelector("#trees"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * 0.3); dispatchEvent(new Event("scroll")); }, 46.5],
  ["4d-trees-next", () => {}, 52],
  ["5-instruments", () => { document.querySelector("#instruments").scrollIntoView(); dispatchEvent(new Event("scroll")); }, 55],
  ["6-instruments-b", () => { const b = document.querySelector("#instruments .bench"); scrollTo(0, b.getBoundingClientRect().top + scrollY + 560); }, 58],
  ["7-contact", () => { document.querySelector("#contact").scrollIntoView(); dispatchEvent(new Event("scroll")); }, 63],
];

const shots = [];
for (const world of WORLDS) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: MOBILE ? 2 : 1, isMobile: MOBILE, hasTouch: MOBILE });
  page.on("pageerror", (e) => console.error(`[${world}] pageerror:`, e.message));
  await page.goto(`${base}/showcase/?world=${world}&record&capture`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => window.lattice, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  for (const [name, prep, at, prep2, at2] of SCENES) {
    await page.evaluate(prep);
    await page.waitForTimeout(250); // let IntersectionObservers settle
    await page.evaluate((t) => window.lattice.renderAt(t), at);
    if (prep2) { await page.evaluate(prep2); await page.waitForTimeout(150); await page.evaluate((t) => window.lattice.renderAt(t), at2); }
    const f = join(out, `${MOBILE ? "m-" : ""}${world}-${name}.png`);
    await page.screenshot({ path: f });
    shots.push({ world, name, f });
    console.log("shot", world, name);
  }
  await page.close();
}

// contact sheet: worlds as columns (phones: four per row), scenes as rows
const cols = MOBILE ? Math.min(4, SCENES.length) : WORLDS.length, tw = MOBILE ? 260 : 640, th = Math.round(tw * H / W);
const imgs = await Promise.all(shots.map(async (s) => ({ ...s, b64: (await readFile(s.f)).toString("base64") })));
const ordered = MOBILE ? imgs : SCENES.map((_, r) => WORLDS.map((w) => imgs.filter((i) => i.world === w)[r])).flat();
const sheet = `<!doctype html><html><body style="margin:0;background:#111;font:600 15px system-ui;color:#ddd">
<div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:14px;padding:14px">
${ordered.map((s) => `<figure style="margin:0"><img style="width:${tw}px;height:${th}px;display:block;border-radius:6px" src="data:image/png;base64,${s.b64}"><figcaption style="padding:4px 2px">${s.world} · ${s.name}</figcaption></figure>`).join("")}
</div></body></html>`;
const sp = await browser.newPage({ viewport: { width: cols * (tw + 14) + 14, height: 400 }, deviceScaleFactor: 1 });
await sp.setContent(sheet);
await sp.screenshot({ path: join(out, MOBILE ? "contact-sheet-mobile.png" : "contact-sheet.png"), fullPage: true });
await browser.close();
console.log("done →", out);
