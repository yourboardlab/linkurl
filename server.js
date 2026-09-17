const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8'
};

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const groups = JSON.parse(raw);
    return Array.isArray(groups) ? groups : [];
  } catch (e) {
    return [];
  }
}

function writeData(groups) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf8');
}

function safeStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return path.join(ROOT, normalized);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/data') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ groups: readData() }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      let tooLarge = false;
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) { tooLarge = true; req.destroy(); }
      });
      req.on('end', () => {
        if (tooLarge) return;
        try {
          const groups = JSON.parse(body);
          if (!Array.isArray(groups)) throw new Error('invalid payload');
          writeData(groups);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'invalid JSON' }));
        }
      });
      return;
    }
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const filePath = safeStaticPath(url.pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`바로가기 서버 실행 중: http://localhost:${PORT}`);
  console.log('이 창을 열어둔 채로, 두 크롬 프로필에서 위 주소로 접속하세요.');
});
