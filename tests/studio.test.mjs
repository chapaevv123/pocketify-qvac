import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createStudioServer } from '../studio/server.mjs';
import { challengeVerdict } from '../studio/probes.mjs';

async function withServer(fn) {
  const server = createStudioServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('challenge verdict is conservative', () => {
  const blocked = { status: 'BLOCKED' };
  const reachable = { status: 'REACHABLE' };
  const uncertain = { status: 'UNVERIFIED' };
  const base = { manualDisconnected: true, before: blocked, after: blocked,
    inferenceSucceeded: true, localServerReached: true };
  assert.equal(challengeVerdict(base), 'PASS');
  assert.equal(challengeVerdict({ ...base, before: reachable }), 'FAIL');
  assert.equal(challengeVerdict({ ...base, after: reachable }), 'FAIL');
  assert.equal(challengeVerdict({ ...base, inferenceSucceeded: false }), 'FAIL');
  assert.equal(challengeVerdict({ ...base, after: uncertain }), 'INCONCLUSIVE');
  assert.equal(challengeVerdict({ ...base, manualDisconnected: false }), 'INCONCLUSIVE');
});

test('Studio serves local assets and actual status without claiming a loaded model', async () => withServer(async (base) => {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Turn off the internet/);
  const capture = await fetch(`${base}/studio-live-lab.png`);
  assert.equal(capture.status, 200);
  assert.match(capture.headers.get('content-type'), /^image\/png/);
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.equal(status.model, 'QWEN3_600M_INST_Q4');
  assert.ok(['IDLE', 'LOADED'].includes(status.runtime));
  assert.equal(status.localOnly, true);
  const data = await (await fetch(`${base}/data.json`)).json();
  assert.equal(data.runs.length, 5);
  assert.equal(data.videoUrl, null);
}));

test('Studio rejects foreign origins, hosts, oversized and invalid requests', async () => withServer(async (base) => {
  const foreign = await fetch(`${base}/api/triage`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(foreign.status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    const target = new URL('/api/status', base);
    http.get({ hostname: target.hostname, port: target.port, path: target.pathname,
      headers: { host: 'evil.example' } }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  assert.equal(hostStatus, 403);
  const invalid = await fetch(`${base}/api/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticket: '' }) });
  assert.equal(invalid.status, 400);
  const large = await fetch(`${base}/api/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticket: 'a'.repeat(9000) }) });
  assert.equal(large.status, 413);
  const unknown = await fetch(`${base}/api/anything`);
  assert.equal(unknown.status, 404);
}));

test('migration API uses only the dedicated workspace and preserves a backup', async () => withServer(async (base) => {
  const post = (route) => fetch(`${base}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const reset = await (await post('/api/migration/reset')).json();
  assert.equal(reset.config.provider, 'cloud-openai-compatible');
  const before = await (await fetch(`${base}/api/migration`)).json();
  assert.ok(before.scan.findings.some((x) => x.kind === 'chat-completions'));
  assert.equal(before.preview.sourceCodeEdited, false);
  const migrated = await (await post('/api/migration/run')).json();
  assert.equal(migrated.result.changed, true);
  assert.equal(migrated.state.config.provider, 'qvac-sdk');
  assert.equal(migrated.state.backup.provider, 'cloud-openai-compatible');
  const again = await (await post('/api/migration/run')).json();
  assert.equal(again.result.changed, false);
  const restored = await (await post('/api/migration/reset')).json();
  assert.equal(restored.config.provider, 'cloud-openai-compatible');
}));
