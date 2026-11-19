// Crescent Bay — tiny static file server for local playtests.
// Serves game/ at the root, plus vendor/ and screenshots/.
// No dependencies: plain Node http + fs. Port from PORT, default 8000.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 8000);

const mimeByExt: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const roots: Record<string, string> = {
  '/vendor/': join(here, 'vendor'),
  '/screenshots/': join(here, 'screenshots'),
};

function pickFile(urlPath: string): string | null {
  if (urlPath === '/' || urlPath === '') return join(here, 'game', 'index.html');
  for (const [prefix, base] of Object.entries(roots)) {
    if (urlPath.startsWith(prefix)) {
      return join(base, urlPath.slice(prefix.length));
    }
  }
  return join(here, 'game', urlPath);
}

function safeInside(root: string, target: string): boolean {
  const rel = target.startsWith(root) ? target.slice(root.length) : null;
  return rel !== null && !rel.startsWith('..' + sep) && rel !== '..';
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  try {
    const raw = new URL(req.url || '/', 'http://localhost').pathname;
    const decoded = decodeURIComponent(raw);
    const cleaned = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
    const file = pickFile(cleaned);
    const allowedRoots = [join(here, 'game'), join(here, 'vendor'), join(here, 'screenshots')];
    if (!allowedRoots.some((root) => safeInside(root, file))) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      console.log(`${req.method} ${raw} -> 403 ${Date.now() - started}ms`);
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      console.log(`${req.method} ${raw} -> 404 ${Date.now() - started}ms`);
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': mimeByExt[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
    console.log(`${req.method} ${raw} -> 200 ${Date.now() - started}ms`);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('server error');
    console.log(`${req.method} ${req.url} -> 500 ${Date.now() - started}ms ${(err as Error).message}`);
  }
});

server.listen(port, () => {
  console.log(`crescent-bay server listening on http://localhost:${port}/`);
});
