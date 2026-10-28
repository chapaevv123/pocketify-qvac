import test from 'node:test';
import assert from 'node:assert/strict';
import { QvacClient, MODEL } from '../src/qvac-client.mjs';
import { triage } from '../src/triage.mjs';

test('real cached QVAC model classifies and summarizes a ticket', { timeout: 120000 }, async () => {
  const client = new QvacClient();
  try {
    const result = await triage(client, 'The CSV export crashes with an error after I click Download.');
    assert.ok(['billing', 'bug', 'access', 'feature', 'other'].includes(result.category));
    assert.ok(result.summary.length > 5);
    assert.ok(result.inferenceMs > 0);
    assert.equal(MODEL.name, 'QWEN3_600M_INST_Q4');
  } finally { await client.close(); }
});
