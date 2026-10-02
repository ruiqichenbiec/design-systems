// Dev server: static files from this design system's root. `node serve.mjs [port]`
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const port = Number(process.argv[2] || process.env.PORT || 4181);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") { res.writeHead(302, { location: "/showcase/" }); return res.end(); }
  const file = normalize(join(root, p.endsWith("/") ? p + "index.html" : p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    await stat(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end("not found"); }
}).listen(port, "127.0.0.1", () => console.log(`点阵 Lattice dev: http://127.0.0.1:${port}/showcase/`));
