// Build: bundle + minify the showcase into one offline HTML file (dist/lattice-showcase.html).
// three.js is bundled from the pinned local dependency; only web fonts load from the network (with fallbacks).
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const html = await readFile(resolve(root, "showcase/index.html"), "utf8");

const js = await build({
  entryPoints: [resolve(root, "showcase/main.js")],
  bundle: true, minify: true, format: "esm", target: "es2022", write: false, legalComments: "none",
});
const css = await build({
  stdin: { contents: ["src/tokens.css", "src/components.css", "showcase/page.css"].map((f) => `@import "./${f}";`).join("\n"), resolveDir: root, loader: "css" },
  bundle: true, minify: true, write: false,
});

const block = (name) => new RegExp(String.raw`<!--build:${name}-->[\s\S]*?<!--/build:${name}-->`);
const out = html
  .replace(block("css"), () => `<style>${css.outputFiles[0].text}</style>`)
  .replace(block("importmap"), "")
  .replace(block("js"), () => `<script type="module">${js.outputFiles[0].text.replace(/<\/script/gi, "<\/script")}</script>`);

await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(resolve(root, "dist/lattice-showcase.html"), out);
console.log(`dist/lattice-showcase.html  ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB`);

// refresh project/ and the ds-viewer catalog (dist/catalog/index.html)
await import("./tools/build-project.mjs");
