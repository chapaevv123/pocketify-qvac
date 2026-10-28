import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioServer } from '../studio/server.mjs';

test('Studio API uses real QVAC and issues a conservative challenge receipt', { timeout: 120000 }, async () => {
  const server = createStudioServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const ticket = 'The CSV export crashes with an error after I click Download.';
  const post = async (route, body) => {
    const response = await fetch(`${base}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 200, `${route}: ${await response.clone().text()}`);
    return response.json();
  };
  try {
    const prepared = await post('/api/prepare', {});
    assert.equal(prepared.runtime, 'LOADED');
    const triage = await post('/api/triage', { ticket });
    assert.equal(triage.execution, 'LOCAL_QVAC');
    assert.equal(triage.model, 'QWEN3_600M_INST_Q4');
    assert.ok(triage.summary.length > 5);
    assert.ok(triage.inferenceMs > 0);
    const verification = await post('/api/challenge/verify', { ticket, manualDisconnected: false });
    const challenge = await post('/api/challenge/infer', { ticket, verificationId: verification.verificationId });
    assert.equal(challenge.receipt.inference.completed, true);
    assert.notEqual(challenge.receipt.verdict, 'PASS');
    assert.equal(challenge.receipt.modelId, triage.modelId);
    const receiptResponse = await fetch(`${base}/api/receipts/${challenge.receipt.id}`);
    assert.equal(receiptResponse.status, 200);
    assert.equal((await receiptResponse.json()).id, challenge.receipt.id);
  } finally {
    await server.closeStudio();
  }
});
