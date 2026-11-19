// Crescent Bay — entry point, two faces, one file.
//   * With MAKEFUN_OUTPUT_DIR set: hand the game in. Copy game/ and
//     screenshots/ into that directory and write dossier.json there with
//     buildDossier from vendor/makefun-game.ts, then exit. Deterministic:
//     the same repository writes the same bytes on every run.
//   * Without it: serve the game for local play. A dependency-free Node
//     static server for game/ (index.html, src/*.js), vendor/ and
//     screenshots/, on PORT or 8000, one log line per request.
import { createServer } from 'node:http';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const handInDir = process.env.MAKEFUN_OUTPUT_DIR || '';

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(outDir) {
  const target = resolve(outDir);
  mkdirSync(target, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(target, 'game'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(target, 'screenshots'), { recursive: true });
  const dossier = buildDossier(target, dossierCaps);
  writeFileSync(join(target, 'dossier.json'), dossier);
  console.log(`crescent-bay handed in to ${target} (${dossier.length} byte dossier)`);
}

const mimeFor = {
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

const mountPoints = {
  '/vendor/': join(repoRoot, 'vendor'),
  '/screenshots/': join(repoRoot, 'screenshots'),
};

function resolveServePath(urlPath) {
  if (urlPath === '/' || urlPath === '') return join(repoRoot, 'game', 'index.html');
  for (const [prefix, base] of Object.entries(mountPoints)) {
    if (urlPath.startsWith(prefix)) return join(base, urlPath.slice(prefix.length));
  }
  return join(repoRoot, 'game', urlPath);
}

function isInside(root, target) {
  if (!target.startsWith(root)) return false;
  const rest = target.slice(root.length);
  return rest !== '..' && !rest.startsWith('..' + sep);
}

function serve() {
  const port = Number(process.env.PORT || 8000);
  const allowed = [join(repoRoot, 'game'), join(repoRoot, 'vendor'), join(repoRoot, 'screenshots')];
  const server = createServer(async (req, res) => {
    const started = Date.now();
    const finish = (code) => console.log(`${req.method} ${req.url} -> ${code} ${Date.now() - started}ms`);
    try {
      const rawPath = new URL(req.url || '/', 'http://localhost').pathname;
      const cleaned = normalize(decodeURIComponent(rawPath)).replace(/^(\.\.[/\\])+/, '');
      const file = resolveServePath(cleaned);
      if (!allowed.some((root) => isInside(root, file))) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('forbidden');
        finish(403);
        return;
      }
      const info = await stat(file).catch(() => null);
      if (!info || !info.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
        finish(404);
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': mimeFor[extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': body.length,
        'cache-control': 'no-store',
      });
      res.end(body);
      finish(200);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('server error');
      console.log(`${req.method} ${req.url} -> 500 ${Date.now() - started}ms ${(err).message}`);
    }
  });
  server.listen(port, () => {
    console.log(`crescent-bay server listening on http://localhost:${port}/`);
  });
}

if (handInDir) handIn(handInDir);
else serve();
