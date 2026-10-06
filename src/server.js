import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { plan } from '../public/js/planner.js';
import { coachNote, modelStatus, DEFAULT_HOST, DEFAULT_MODEL } from './ollama.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:",
};

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) tooBig = true;
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) return reject(httpError(413, 'Request body too large'));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(httpError(400, 'Request body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function serveStatic(res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return sendJson(res, 400, { error: 'Bad path' });
  }
  const relative = decoded === '/' ? '/index.html' : decoded;
  const file = path.join(PUBLIC_DIR, path.normalize(relative));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

/**
 * Create the HTTP server. Options are injectable so tests can fake Ollama.
 * @param {{ ollama?: { host?: string, model?: string, fetchImpl?: typeof fetch } }} [options]
 */
export function createApp({ ollama = {} } = {}) {
  const host = ollama.host ?? DEFAULT_HOST;
  const model = ollama.model ?? DEFAULT_MODEL;
  const fetchImpl = ollama.fetchImpl ?? fetch;

  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && pathname === '/api/health') {
        const status = await modelStatus({ host, model, fetchImpl });
        return sendJson(res, 200, { ok: true, model, ollama: status });
      }

      if (req.method === 'POST' && pathname === '/api/advice') {
        const { date, lastFrost, firstFrost } = (await readJson(req)) ?? {};
        let tasks;
        try {
          // The plan is recomputed here, so the model only ever sees our own data.
          tasks = plan({ date, lastFrost, firstFrost });
        } catch (err) {
          throw httpError(400, err.message);
        }
        if (tasks.length === 0) {
          return sendJson(res, 200, {
            advice: 'Nothing to sow or plant this week. Go and look at your soil instead.',
            model: null,
          });
        }
        try {
          const advice = await coachNote(tasks, { date, host, model, fetchImpl });
          return sendJson(res, 200, { advice, model });
        } catch (err) {
          return sendJson(res, 503, { error: `Local model unavailable: ${err.message}` });
        }
      }

      if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(res, pathname);
      sendJson(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      sendJson(res, err.status ?? 500, { error: err.status ? err.message : 'Internal error' });
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT ?? 8787);
  const bind = process.env.HOST ?? '127.0.0.1';
  const ollamaHost = process.env.OLLAMA_HOST ?? DEFAULT_HOST;
  const ollamaModel = process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  createApp({ ollama: { host: ollamaHost, model: ollamaModel } }).listen(port, bind, () => {
    console.log(`Frostline: http://${bind}:${port}  (model ${ollamaModel} via ${ollamaHost})`);
  });
}
