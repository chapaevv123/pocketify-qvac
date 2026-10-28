import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseTriage } from '../src/triage.mjs';
import { scanRepository } from '../src/scanner.mjs';
import { migrateExample } from '../src/migration.mjs';
import { OpenAICompatClient } from '../src/openai-compatible-client.mjs';

test('cloud transport is disabled unless explicitly opted in', () => {
  const previous = process.env.POCKETIFY_ALLOW_CLOUD;
  delete process.env.POCKETIFY_ALLOW_CLOUD;
  try {
    assert.throws(() => new OpenAICompatClient({ provider: 'cloud-openai-compatible', baseURL: 'https://api.openai.com/v1', apiKeyEnv: 'OPENAI_API_KEY' }), /Cloud calls are disabled/);
  } finally {
    if (previous === undefined) delete process.env.POCKETIFY_ALLOW_CLOUD;
    else process.env.POCKETIFY_ALLOW_CLOUD = previous;
  }
});

test('parseTriage accepts constrained JSON and rejects invalid answers', () => {
  assert.deepEqual(parseTriage('<think>reasoning</think>{"category":"bug","summary":"Export fails."}'),
    { category: 'bug', summary: 'Export fails.' });
  assert.throws(() => parseTriage('{"category":"unknown","summary":"x"}'), /invalid category/);
  assert.throws(() => parseTriage('plain text'), /JSON object/);
});

test('scanner locates supported integration and migration is backed up and idempotent', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pocketify-test-'));
  try {
    await mkdir(path.join(root, 'node_modules'));
    await writeFile(path.join(root, 'node_modules', 'ignored.js'), 'new OpenAI()');
    await writeFile(path.join(root, 'app.ts'), "import OpenAI from 'openai';\nconst client = new OpenAICompatClient();\nawait client.chat.completions.create({});\n");
    const cloud = { provider: 'cloud-openai-compatible', baseURL: 'https://api.openai.com/v1', model: 'example' };
    await writeFile(path.join(root, 'pocketify.json'), JSON.stringify(cloud));
    const scan = await scanRepository(root);
    assert.equal(scan.scannedFiles, 1);
    assert.equal(scan.supportedMigration, true);
    assert.deepEqual(scan.findings.map((x) => x.kind), ['openai-import', 'chat-completions', 'pocketify-client']);
    const migrated = await migrateExample(root);
    assert.equal(migrated.changed, true);
    assert.deepEqual(JSON.parse(await readFile(migrated.backup, 'utf8')), cloud);
    assert.equal(JSON.parse(await readFile(migrated.file, 'utf8')).provider, 'qvac-sdk');
    assert.equal((await migrateExample(root)).changed, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('migration rejects an unsupported cloud config without changing it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pocketify-reject-'));
  try {
    await writeFile(path.join(root, 'app.js'), 'new OpenAICompatClient()');
    const config = '{"provider":"unexpected","baseURL":"http://localhost"}';
    await writeFile(path.join(root, 'pocketify.json'), config);
    await assert.rejects(migrateExample(root), /Unsupported cloud config/);
    assert.equal(await readFile(path.join(root, 'pocketify.json'), 'utf8'), config);
  } finally { await rm(root, { recursive: true, force: true }); }
});
