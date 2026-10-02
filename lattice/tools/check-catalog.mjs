// Loads dist/catalog/index.html, scrolls through every card, reports preview errors, saves screenshots.
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => existsSync(p));
const b = await chromium.launch({ executablePath: exe, headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errs.push(`${m.location()?.url?.split("/").pop() || ""}: ${m.text()}`); });
p.on("pageerror", (e) => errs.push("page: " + e.message));
await p.goto(pathToFileURL(resolve(import.meta.dirname, "../dist/catalog/index.html")).href, { waitUntil: "load" });
await p.waitForTimeout(2500);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(700); }
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(800);
await p.screenshot({ path: resolve(import.meta.dirname, "../outputs/captures/catalog-top.png") });
const cards = await p.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => ({ src: (f.getAttribute("src") || f.dataset.src || "").split("/").pop(), h: f.offsetHeight })));
const comp = await p.$("#group-signature");
if (comp) { await comp.scrollIntoViewIfNeeded(); await p.waitForTimeout(3500); await p.screenshot({ path: resolve(import.meta.dirname, "../outputs/captures/catalog-signature.png") }); }
const ctrl = await p.$("#group-controls");
if (ctrl) { await ctrl.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await p.screenshot({ path: resolve(import.meta.dirname, "../outputs/captures/catalog-controls.png") }); }
const reported = await p.evaluate(() => [...document.querySelectorAll(".err, .preview-error, [data-err]")].map((e) => e.textContent.slice(0, 160)));
console.log(JSON.stringify({ frames: cards.length, cards, errors: errs, reported }, null, 1));
await b.close();
