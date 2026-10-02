// Interaction smoke test with a real (synthetic) pointer and keyboard. Usage: node tools/smoke.mjs [url]
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:4187/showcase/";
const exe = [process.env.VG_BROWSER, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => p && existsSync(p));
const b = await chromium.launch({ executablePath: exe, headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-background-timer-throttling"] });
const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok: !!ok, info }); };

async function run(reduced) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await p.goto(url, { waitUntil: "load", timeout: 60000 });
  await p.waitForFunction(() => window.lattice, null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  const tag = reduced ? "[reduced] " : "";
  const cap = () => p.$eval("#set-caption", (e) => e.textContent);

  const c0 = await cap();
  await p.mouse.move(900, 300);
  await p.mouse.down();
  await p.waitForTimeout(1600);
  const heat = await p.evaluate(() => window.lattice.field.heat);
  await p.mouse.up();
  await p.waitForTimeout(300);
  const c1 = await cap();
  check(`${tag}hold melts the field (heat > 0.55)`, reduced || heat > 0.55, `heat=${heat.toFixed(2)}`);
  check(`${tag}release after melting shows the next set`, c1 !== c0, `${c0} → ${c1}`);

  await p.click("#next-set");
  await p.waitForTimeout(200);
  check(`${tag}Next set button advances`, (await cap()) !== c1);

  // dragging across empty field must not select text
  await p.mouse.move(700, 560); await p.mouse.down(); await p.mouse.move(200, 760, { steps: 8 }); await p.mouse.up();
  check(`${tag}dragging on the field selects no text`, (await p.evaluate(() => String(getSelection()))) === "");

  // the hero scrolls 1:1 with the page: 300 px of scroll moves the camera down ~300 px worth of world
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, 300); });
  await p.waitForTimeout(600);
  const camY = await p.evaluate(() => window.lattice.stage.camera.position.y);
  const expect = -300 * (2 * 10 * Math.tan(Math.PI / 12)) / 900;
  check(`${tag}hero name scrolls up with the page`, Math.abs(camY - expect) < 0.35, `camera y ${camY.toFixed(2)} vs ${expect.toFixed(2)}`);
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);

  // waterfall: hover the node under Bolzano–Weierstrass, then click to grow its tree
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; const w = document.querySelector("#waterfall"); scrollTo(0, w.offsetTop + w.offsetHeight * 0.36 - innerHeight / 2); });
  await p.waitForTimeout(2500);
  const pos = await p.evaluate(() => { const c = window.lattice.cascade, st = window.lattice.stage; const v = c.pos.get("bw").clone().applyMatrix4(c.object.matrixWorld); const q = st.project(v); return [q.x, q.y, q.visible]; });
  await p.mouse.move(pos[0], pos[1]);
  await p.waitForTimeout(400);
  const cardShown = await p.evaluate(() => !document.querySelector("#card").hidden && document.querySelector("#card .lx-card__title").textContent);
  check(`${tag}waterfall hover shows the theorem card`, cardShown === "Bolzano–Weierstrass", String(cardShown));
  await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(1500);
  const rootId = await p.evaluate(() => window.lattice.tree.current?.root.tid);
  check(`${tag}click on a waterfall node grows its proof tree`, rootId === "bw", String(rootId));

  // tour: each scroll step visits the next result in dependency order
  const tourAt = async (f) => { await p.evaluate((f) => { const t = document.querySelector("#tour"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * f); }, f); await p.waitForTimeout(700); return p.evaluate(() => ({ ...window.lattice.tour(), card: document.querySelector("#tour-card").classList.contains("is-on"), hot: document.querySelectorAll(".fx-label.is-hot").length })); };
  const t1 = await tourAt(0.3), t2 = await tourAt(0.42); // one result per ~200 px of scroll
  check(`${tag}tour visits a result and shows its card`, t1.k > 0 && t1.card && t1.hot > 0, JSON.stringify(t1));
  check(`${tag}tour advances with scrolling`, t2.k > t1.k, `${t1.k} → ${t2.k}`);

  // proof tree grows when the camera arrives; its progress bar fills
  await p.evaluate(() => document.querySelector("#tree").scrollIntoView({ block: "center" }));
  await p.waitForTimeout(reduced ? 1500 : 9000);
  check(`${tag}tree grows on arrival and the progress bar reaches 100`, (await p.$eval("#tree-prog", (e) => e.getAttribute("aria-valuenow"))) === "100");

  // trees: scrolling turns the stand to the next proof
  const treesAt = async (f) => { await p.evaluate((f) => { const t = document.querySelector("#trees"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * f); }, f); await p.waitForTimeout(900); return p.evaluate(() => ({ ...window.lattice.treesAt(), root: window.lattice.trees.current?.root.tid })); };
  const a1 = await treesAt(0.12), a2 = await treesAt(0.62);
  check(`${tag}trees: first proof on entry`, a1.k === 0 && a1.root === a1.id, JSON.stringify(a1));
  check(`${tag}trees: scrolling swaps to a later proof`, a2.k > a1.k && a2.root === a2.id, JSON.stringify(a2));

  // instruments
  await p.evaluate(() => document.querySelector("#instruments").scrollIntoView());
  await p.waitForTimeout(500);
  await p.click('#tabs [data-value="quant"]');
  await p.waitForTimeout(200);
  check(`${tag}tabs select and update content`, await p.evaluate(() => document.querySelector('#tabs [data-value="quant"]').getAttribute("aria-selected") === "true" && /Factor/.test(document.querySelector("#tab-out").textContent)));
  await p.keyboard.press("ArrowRight");
  check(`${tag}tabs arrow keys move selection`, await p.evaluate(() => document.querySelector('#tabs [data-value="agents"]').getAttribute("aria-selected") === "true"));
  const before = await p.$eval("#sw-idle", (e) => e.getAttribute("aria-checked"));
  await p.click("#sw-idle");
  check(`${tag}switch toggles aria-checked`, (await p.$eval("#sw-idle", (e) => e.getAttribute("aria-checked"))) !== before);
  await p.$eval("#prog-range", (e) => { e.value = "80"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  check(`${tag}slider drives progress`, (await p.$eval("#prog", (e) => e.getAttribute("aria-valuenow"))) === "80");
  await p.keyboard.press("Control+K");
  await p.waitForTimeout(300);
  check(`${tag}Ctrl+K opens the command palette`, await p.evaluate(() => document.querySelector(".lx-cmd").open));
  await p.keyboard.type("peano");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1200);
  check(`${tag}command runs (grows Peano's tree)`, await p.evaluate(() => !document.querySelector(".lx-cmd").open && window.lattice.tree.current?.root.tid === "peano"));
  await p.evaluate(() => document.querySelector("#instruments").scrollIntoView());
  await p.click("#toast-demo");
  check(`${tag}toast appears`, await p.evaluate(() => !!document.querySelector(".lx-toast")));
  await p.fill("#email", "not-an-email");
  await p.press("#email", "Enter");
  check(`${tag}invalid email is flagged`, await p.evaluate(() => document.querySelector("#field").hasAttribute("data-invalid")));
  await p.fill("#email", "someone@example.com");
  await p.press("#email", "Enter");
  check(`${tag}valid email clears the error`, await p.evaluate(() => !document.querySelector("#field").hasAttribute("data-invalid")));
  check(`${tag}no page errors`, errors.length === 0, errors.join(" | "));
  await p.close();
}

await run(false);
await run(true);
await b.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.info ? `  (${r.info})` : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
