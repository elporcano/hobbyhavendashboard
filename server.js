const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const dataFile = path.join(dataDir, 'store.json');
const htmlFile = path.join(rootDir, 'bookshop_reading_corner_dashboard.html');

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}', 'utf8');
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/state') {
    ensureDataFile();
    const raw = fs.readFileSync(dataFile, 'utf8') || '{}';
    try {
      const parsed = JSON.parse(raw);
      sendJson(res, 200, parsed);
    } catch (error) {
      sendJson(res, 500, { error: 'Invalid state file' });
    }
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/api/state') {
    ensureDataFile();
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        fs.writeFileSync(dataFile, JSON.stringify(parsed, null, 2), 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    serveStaticFile(res, htmlFile, 'text/html; charset=utf-8');
    return;
  }

  const safePath = url.pathname === '/' ? htmlFile : path.join(rootDir, url.pathname.replace(/^\/+/, ''));

  if (safePath.startsWith(rootDir) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml'
    };

    serveStaticFile(res, safePath, contentTypes[ext] || 'application/octet-stream');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Harley's Hobby Haven dashboard running at http://localhost:${PORT}`);
  console.log(`State file: ${dataFile}`);
});
