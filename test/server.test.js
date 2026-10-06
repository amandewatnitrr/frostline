import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/server.js';
import { buildMessages, coachNote, modelStatus } from '../src/ollama.js';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

async function withServer(fetchImpl, run) {
  const server = createApp({ ollama: { host: 'http://ollama.test', model: 'gemma3:4b', fetchImpl } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (base, body) =>
  fetch(`${base}/api/advice`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('buildMessages lists tasks and keeps the system prompt strict', () => {
  const messages = buildMessages(
    [{ verb: 'Direct-sow', crop: 'Peas', status: 'now', closing: true, end: '2026-04-16', start: '2026-03-19', tip: 'Soak seeds.' }],
    '2026-04-02',
  );
  assert.equal(messages[0].role, 'system');
  assert.match(messages[0].content, /ONLY the planting tasks/);
  assert.match(messages[1].content, /Direct-sow Peas: window open until 2026-04-16 \(closing soon\)/);
});

test('coachNote returns trimmed model text and posts to /api/chat', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, body: JSON.parse(init.body) };
    return jsonResponse({ message: { content: '  Sow the peas.  ' } });
  };
  const text = await coachNote([], { date: '2026-04-02', host: 'http://ollama.test', model: 'm:1', fetchImpl });
  assert.equal(text, 'Sow the peas.');
  assert.equal(seen.url, 'http://ollama.test/api/chat');
  assert.equal(seen.body.model, 'm:1');
  assert.equal(seen.body.stream, false);
});

test('coachNote throws on HTTP errors and empty replies', async () => {
  const opts = { date: '2026-04-02' };
  await assert.rejects(coachNote([], { ...opts, fetchImpl: async () => jsonResponse({}, false, 500) }), /HTTP 500/);
  await assert.rejects(
    coachNote([], { ...opts, fetchImpl: async () => jsonResponse({ message: { content: ' ' } }) }),
    /empty reply/,
  );
});

test('modelStatus reports up/down and whether the model is pulled', async () => {
  const up = async () => jsonResponse({ models: [{ name: 'gemma3:4b' }] });
  assert.deepEqual(await modelStatus({ model: 'gemma3:4b', fetchImpl: up }), { up: true, hasModel: true });
  assert.deepEqual(await modelStatus({ model: 'other:1b', fetchImpl: up }), { up: true, hasModel: false });
  const down = async () => {
    throw new Error('ECONNREFUSED');
  };
  assert.deepEqual(await modelStatus({ fetchImpl: down }), { up: false, hasModel: false });
});

test('POST /api/advice returns the model note', async () => {
  const fetchImpl = async () => jsonResponse({ message: { content: 'Sow peas today.' } });
  await withServer(fetchImpl, async (base) => {
    const res = await post(base, { date: '2026-04-02', lastFrost: '04-30', firstFrost: '10-15' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { advice: 'Sow peas today.', model: 'gemma3:4b' });
  });
});

test('POST /api/advice skips the model when there is nothing to do', async () => {
  const fetchImpl = async () => assert.fail('model should not be called');
  await withServer(fetchImpl, async (base) => {
    const res = await post(base, { date: '2026-01-10', lastFrost: '04-30', firstFrost: '10-15' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).model, null);
  });
});

test('POST /api/advice rejects bad input with 400', async () => {
  await withServer(async () => jsonResponse({}), async (base) => {
    const res = await post(base, { date: 'nope', lastFrost: '04-30', firstFrost: '10-15' });
    assert.equal(res.status, 400);
  });
});

test('POST /api/advice returns 503 when the model is down', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNREFUSED');
  };
  await withServer(fetchImpl, async (base) => {
    const res = await post(base, { date: '2026-04-02', lastFrost: '04-30', firstFrost: '10-15' });
    assert.equal(res.status, 503);
  });
});

test('static files are served and path traversal is refused', async () => {
  await withServer(async () => jsonResponse({ models: [] }), async (base) => {
    const index = await fetch(`${base}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Frostline/);

    const escape = await fetch(`${base}/..%2f..%2fpackage.json`);
    assert.notEqual(escape.status, 200);
  });
});
