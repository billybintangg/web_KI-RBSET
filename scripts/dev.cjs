// Local-only server; production continues to use api/analytics.js on Vercel.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(GA_PROPERTY_ID|GA_CLIENT_EMAIL|GA_PRIVATE_KEY_BASE64)\s*=\s*(.*?)\s*$/);
    if (match) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const analytics = require('../api/analytics');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.pdf':'application/pdf', '.ico':'image/x-icon' };
const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/api/analytics') return await analytics(req, res);
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
    // Only the page and public assets are served, never credentials or source folders.
    if (urlPath !== '/' && urlPath !== '/index.html' && !urlPath.startsWith('/src/Assets/')) return res.status(404).end('Not found');
    const target = path.resolve(root, '.' + (urlPath === '/' ? '/index.html' : urlPath));
    const real = fs.realpathSync(target);
    const publicRoot = fs.realpathSync(path.join(root, 'src/Assets')) + path.sep;
    if (real !== path.join(root, 'index.html') && !real.startsWith(publicRoot)) return res.status(404).end();
    if (!fs.statSync(real).isFile() || !mime[path.extname(real).toLowerCase()]) return res.status(404).end();
    res.setHeader('Content-Type', mime[path.extname(real).toLowerCase()]);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(real).on('error', () => res.destroy()).pipe(res);
  } catch { if (!res.headersSent) res.status(404).end('Not found'); else res.destroy(); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port sudah dipakai. Hentikan server lama atau gunakan PORT=3001 npm run dev.' : 'Server gagal dimulai.'); process.exitCode = 1; });
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Website: http://localhost:${server.address().port}/#report`));
