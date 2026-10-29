import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const read = file => readFile(path.join(site, file), 'utf8');

test('static pages link only to existing local assets and anchors', async () => {
  for (const page of ['index.html', 'offline.html', 'evidence.html']) {
    const html = await read(page);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      if (target.startsWith('#')) { assert.ok(ids.has(target.slice(1)), `${page}: ${target}`); continue; }
      const [file] = target.split('#');
      await stat(path.join(site, file.replace(/^\.\//, '')));
    }
  }
});

test('all published run metrics equal their immutable source reports', async () => {
  const data = JSON.parse(await read('data.json'));
  assert.equal(data.runs.length, 5);
  for (const [i, name] of data.runFiles.entries()) {
    const source = JSON.parse(await readFile(path.join(root, 'reports', name), 'utf8'));
    const publicRun = JSON.parse(await read(`evidence/runs/${name}`));
    assert.deepEqual(data.runs[i], source);
    assert.deepEqual(publicRun, source);
  }
  assert.deepEqual(data.runs.map(run => run.correct), [8, 6, 6, 6, 5]);
});

test('sanitized receipts retain original INCONCLUSIVE decisions and probe errors', async () => {
  const index = JSON.parse(await read('evidence/receipts.json'));
  assert.equal(index.records.length, 2);
  for (const entry of index.records) {
    const receipt = JSON.parse(await read(`evidence/receipts/${entry.id}.json`));
    assert.equal(receipt.verdict, 'INCONCLUSIVE');
    assert.equal(receipt.originalVerdict, 'INCONCLUSIVE');
    assert.equal(receipt.inference.completed, true);
    assert.equal(receipt.externalBefore.checks.find(x => x.name === 'DNS').detail, 'ECONNREFUSED');
    assert.equal(receipt.warmup.onlineObservation.status, 'UNVERIFIED');
    assert.ok(!JSON.stringify(receipt).includes('C:\\Users\\'));
  }
});

test('film manifest and public video assets are complete', async () => {
  const manifest = JSON.parse(await read('media/source-manifest.json'));
  assert.equal(manifest.durationSeconds, 101);
  assert.equal(manifest.playbackSpeed, 1);
  assert.equal(manifest.scenes.reduce((sum, x) => sum + x.end - x.start, 0), 101);
  assert.ok(manifest.scenes.some(x => x.claim.includes('physical adapter state not shown')));
  for (const asset of ['pocketify-demo-1080p.mp4', 'pocketify-demo-preview.mp4', 'pocketify-demo-poster.webp',
    'pocketify-offline-highlight.webp', 'pocketify-migration-highlight.webp', 'pocketify-offline-highlight.mp4',
    'pocketify-migration-highlight.mp4', 'pocketify-demo-captions.vtt'])
    assert.ok((await stat(path.join(site, 'media', asset))).size > 100);
});
