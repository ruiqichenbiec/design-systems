// Real-time filmstrip of a DOM region: N frames every `gap` ms, stacked into one PNG.
// Usage: node tools/filmstrip.mjs <selector> <action> [frames] [gapMs]
//   action: "none" | "click" | "progress:<0-100>" | "scroll"
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const [sel = "#prog", action = "none", nf = "8", gap = "120"] = process.argv.slice(2);
const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => existsSync(p));
const b = await chromium.launch({ executablePath: exe, headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-background-timer-throttling"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto(process.env.URL || "http://127.0.0.1:4187/showcase/", { waitUntil: "load" });
await p.waitForFunction(() => window.lattice);
await p.evaluate((s) => { document.documentElement.style.scrollBehavior = "auto"; document.querySelector(s).scrollIntoView({ block: "center" }); }, sel);
await p.waitForTimeout(1500);
const el = await p.$(sel);
const box = await el.boundingBox();
const clip = { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 };
if (action === "click") await el.click();
if (action.startsWith("progress:")) await p.evaluate((v) => { const r = document.querySelector("#prog-range"); r.value = v; r.dispatchEvent(new Event("input", { bubbles: true })); }, action.split(":")[1]);
const frames = [];
for (let i = 0; i < +nf; i++) { frames.push((await p.screenshot({ clip })).toString("base64")); await p.waitForTimeout(+gap); }
const sheet = await b.newPage({ viewport: { width: Math.ceil(clip.width) + 20, height: 200 } });
await sheet.setContent(`<body style="margin:0;background:#222;padding:10px;font:12px system-ui;color:#aaa">${frames.map((f, i) => `<div>${i * +gap} ms</div><img style="display:block;width:${clip.width}px;margin-bottom:6px" src="data:image/png;base64,${f}">`).join("")}</body>`);
const out = resolve(import.meta.dirname, `../outputs/captures/film-${sel.replace(/[^a-z0-9]/gi, "")}-${action.replace(/[^a-z0-9]/gi, "")}.png`);
await sheet.screenshot({ path: out, fullPage: true });
console.log(out);
await b.close();
