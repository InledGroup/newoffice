#!/usr/bin/env node
/**
 * The E2E preview server.
 *
 * Serves a built `dist/` the way the hosts do: an extensionless URL resolves to
 * `<name>.html` (Cloudflare Pages, static-web-server), a directory redirects to
 * its slashed form with a 308, and the pre-encoded x2t WASM is labelled
 * `Content-Encoding: br`. Small on purpose -- the alternative is every test run
 * depending on a framework's preview server agreeing with production about
 * those three behaviours, which is exactly the class of bug the E2E suite exists
 * to catch.
 *
 *   node bin/serve-dist.mjs --dir dist --port 4173
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = path.resolve(getArg('dir', 'dist'));
const port = Number(getArg('port', '4173'));
const host = getArg('host', '127.0.0.1');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** The pre-encoded asset: brotli bytes under a `.br` name (see public/_headers). */
const BROTLI = new Set(['/sdkjs/common/wasm/x2t/x2t.wasm.br']);

const inside = (target) => target === root || target.startsWith(root + path.sep);

const isFile = (target) => {
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
};

const isDirectory = (target) => {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Resolve a URL the way the hosts do.
 *
 * The order matters and is the reason this lives here rather than in a
 * framework's preview server: a clean URL is `<name>.html` and it wins over a
 * directory of the same name that has no index -- `/es` is `es.html` even when
 * `es/home.html` also exists next to it. Only a directory that actually holds
 * an `index.html` gets the 308 to its slashed form, and `/es/` still answers
 * with the sibling file so the slashed spelling of a language route is not a
 * 404.
 */
function resolve(pathname) {
  const target = path.join(root, pathname);
  if (!inside(target)) return { kind: 'forbidden' };
  const bare = pathname.replace(/\/$/, '');

  if (pathname.endsWith('/')) {
    const index = path.join(target, 'index.html');
    if (isFile(index)) return { kind: 'file', file: index };
    const sibling = `${path.join(root, bare)}.html`;
    if (inside(sibling) && isFile(sibling)) return { kind: 'file', file: sibling };
    return { kind: 'missing' };
  }

  const asHtml = `${target}.html`;
  if (isFile(asHtml)) return { kind: 'file', file: asHtml };
  if (isFile(target)) return { kind: 'file', file: target };
  const asIndex = path.join(target, 'index.html');
  if (isFile(asIndex)) return { kind: 'redirect', to: `${pathname}/` };
  if (isDirectory(target)) return { kind: 'redirect', to: `${pathname}/` };
  return { kind: 'missing' };
}

const server = createServer((req, res) => {
  const [rawPath, query] = (req.url ?? '/').split('?');
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    pathname = rawPath;
  }

  const resolved = resolve(pathname);

  if (resolved.kind === 'redirect') {
    res.writeHead(308, { Location: `${resolved.to}${query ? `?${query}` : ''}` });
    res.end();
    return;
  }

  if (resolved.kind === 'forbidden' || resolved.kind === 'missing') {
    const fallback = path.join(root, '404.html');
    if (existsSync(fallback)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      createReadStream(fallback).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(resolved.file);
  const headers = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' };
  if (BROTLI.has(pathname)) {
    headers['Content-Encoding'] = 'br';
    headers['Content-Type'] = 'application/octet-stream';
  }
  // Deploy-coupled files are revalidated by the real hosts; the E2E runs start
  // from an empty browser profile anyway, so no caching here keeps a test from
  // reading yesterday's bytes.
  headers['Cache-Control'] = 'no-cache';

  res.writeHead(200, headers);
  createReadStream(resolved.file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[serve-dist] ${root} on http://${host}:${port}`);
});
