import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeWorkspace, scanSources, migrateConfig, diagnosticVerdict, exportJson } from '../site/lab-core.js';

const source = await readFile(new URL('../examples/ticket-triage/app.mjs', import.meta.url), 'utf8');
const seed = JSON.parse(await readFile(new URL('../studio/seed/pocketify.json', import.meta.url), 'utf8'));

test('browser scanner analyzes actual bundled source and gives line excerpts', () => {
  const scan = scanSources({ 'app.mjs': source });
  assert.equal(scan.scannedFiles, 1);
  assert.equal(scan.supportedMigration, true);
  assert.ok(scan.findings.some(x => x.kind === 'chat-completions' && x.line > 0 && x.excerpt.includes('.chat.completions.create')));
  assert.equal(scanSources({ 'empty.js': 'const x = 1;' }).supportedMigration, false);
});

test('in-memory migration preserves backup, is idempotent and resets', () => {
  const workspace = makeWorkspace(source, seed);
  assert.equal(workspace.migrate().changed, true);
  assert.deepEqual(workspace.state.backup, seed);
  assert.equal(workspace.state.config.provider, 'qvac-sdk');
  assert.equal(workspace.migrate().changed, false);
  workspace.reset();
  assert.deepEqual(workspace.state.config, seed);
  assert.equal(workspace.state.backup, null);
  assert.throws(() => migrateConfig({ ...seed, provider: 'unknown' }, workspace.scan()), /Unsupported/);
});

test('browser diagnostics avoid isolation claims', () => {
  assert.equal(diagnosticVerdict([{ ok: true }]), 'SAME-ORIGIN REACHABLE');
  assert.equal(diagnosticVerdict([{ ok: false }]), 'REQUESTS FAILED / ISOLATION UNPROVEN');
});

test('JSON report export produces a downloadable blob with measured fields', async () => {
  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  let blob;
  let clicked;
  globalThis.document = { createElement: () => ({ click() { clicked = { name: this.download, url: this.href }; } }) };
  URL.createObjectURL = value => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  try {
    exportJson('report.json', { accuracy: 0.6, actual: true });
    assert.deepEqual(clicked, { name: 'report.json', url: 'blob:test' });
    assert.deepEqual(JSON.parse(await blob.text()), { accuracy: 0.6, actual: true });
  } finally { globalThis.document = previousDocument; URL.createObjectURL = previousCreate; URL.revokeObjectURL = previousRevoke; }
});
