// spec 12.2: dist/를 <prefix>(기본 /english1/) 아래로 주는 작은 정적 서버(E2E용). .wasm은 application/wasm.
// 사용: node scripts/serve-dist.mjs --dir dist --prefix /english1/ --port 4173 --host 127.0.0.1
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
/** @param {string} name @param {string} def @returns {string} */
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  const v = i >= 0 ? args[i + 1] : undefined;
  return v !== undefined ? v : def;
};
const dir = resolve(arg('dir', 'dist'));
let prefix = arg('prefix', '/english1/');
if (!prefix.startsWith('/')) prefix = `/${prefix}`;
if (!prefix.endsWith('/')) prefix = `${prefix}/`;
const port = Number(arg('port', process.env.E2E_PORT ?? '4173'));
const host = arg('host', '127.0.0.1');

/** @type {Record<string, string>} */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(dir)) {
  console.error(`[serve-dist] ${dir} 폴더가 없어요. npm run build를 먼저 하세요.`);
  process.exit(1);
}

const server = createServer((req, res) => {
  let url;
  let path;
  try {
    url = new URL(req.url ?? '/', `http://${host}`);
    path = decodeURIComponent(url.pathname);
  } catch {
    // 잘못된 % 인코딩 등 → 400(서버가 죽지 않게, review R9)
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }
  if (path === prefix.slice(0, -1)) {
    res.writeHead(301, { Location: prefix + url.search });
    res.end();
    return;
  }
  if (!path.startsWith(prefix)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }
  let rel = path.slice(prefix.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(dir, rel));
  if (!(file === dir || file.startsWith(dir + sep)) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }
  const st = statSync(file);
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': String(st.size),
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[serve-dist] http://${host}:${port}${prefix} → ${dir}`);
});
