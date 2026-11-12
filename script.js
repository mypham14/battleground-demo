// Local dev server: serves the static files and runs api/fight.js without the Vercel CLI.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  console.warn('No .env found. Create a .env file with ANTHROPIC_API_KEY and OPENAI_API_KEY.');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let fightHandler = null;
function getFightHandler() {
  if (!fightHandler) fightHandler = require('./api/fight.js');
  return fightHandler;
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => (raw += chunk));
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function handleApi(request, response) {
  const vercelStyleResponse = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      sendJson(response, this.statusCode || 200, body);
    },
  };

  request.body = await readJsonBody(request);
  request.headers['x-forwarded-for'] = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

  try {
    await getFightHandler()(request, vercelStyleResponse);
  } catch (error) {
    console.error(error.message);
    sendJson(response, 500, { error: 'server_error', message: error.message });
  }
}

function handleStatic(request, response) {
  const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relativePath = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = path.join(ROOT, relativePath);

  if (!filePath.startsWith(ROOT + path.sep) || /(^|[\\/])(\.|node_modules|api)/.test(relativePath)) {
    response.writeHead(404).end('Not found');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    response.end(data);
  });
}

http
  .createServer((request, response) => {
    if (request.url.split('?')[0] === '/api/fight') {
      handleApi(request, response);
    } else {
      handleStatic(request, response);
    }
  })
  .listen(PORT, () => console.log(`Battleground running at http://localhost:${PORT}`));
