// Static server for the whole repository: `node serve.mjs [port]`, then open http://127.0.0.1:4300/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 4300);
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".ttf": "font/ttf", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8", ".mp4": "video/mp4",
};

createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) || /[\\/](node_modules|\.git)[\\/]/.test(file)) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    const bytes = await readFile(file);
    const type = types[path.extname(file)] || "application/octet-stream";
    // Byte ranges let browsers seek in video.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range && (range[1] || range[2])) {
      let start = range[1] ? +range[1] : bytes.length - +range[2];
      let end = range[1] && range[2] ? +range[2] : bytes.length - 1;
      if (start > end || start < 0 || start >= bytes.length) { res.writeHead(416, { "Content-Range": `bytes */${bytes.length}` }).end(); return; }
      end = Math.min(end, bytes.length - 1);
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": end - start + 1, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
      res.end(req.method === "HEAD" ? undefined : bytes.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": bytes.length, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch { res.writeHead(404).end(); }
}).listen(port, "127.0.0.1", () => console.log(`design-systems · http://127.0.0.1:${port}/`));
