// Opens dist/lattice-showcase.html from file:// in headless Chrome, advances the clock, reports errors.
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const exe = [process.env.VG_BROWSER, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => p && existsSync(p));
const b = await chromium.launch({ executablePath: exe, headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const url = pathToFileURL(resolve(import.meta.dirname, "../dist/lattice-showcase.html")).href + "?record";
await p.goto(url, { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.lattice, null, { timeout: 30000 });
await p.waitForTimeout(1000);
const r = await p.evaluate(() => { window.lattice.renderAt(4); return { N: window.lattice.field.N, sets: document.querySelector("#set-caption").textContent, labels: document.querySelectorAll(".fx-label").length }; });
await p.screenshot({ path: resolve(import.meta.dirname, "../outputs/captures/dist-file-url.png") });
console.log(JSON.stringify({ url, ...r, errors }, null, 1));
await b.close();
