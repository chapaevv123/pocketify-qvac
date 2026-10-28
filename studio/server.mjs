import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, copyFile, stat, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { QvacClient, MODEL } from '../src/qvac-client.mjs';
import { triage } from '../src/triage.mjs';
import { scanRepository } from '../src/scanner.mjs';
import { migrateExample } from '../src/migration.mjs';
import { evaluate } from '../src/evaluation.mjs';
import { probeExternal, challengeVerdict } from './probes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const workspace = path.join(root, 'examples', 'studio-workspace');
const receipts = path.join(root, '.studio', 'receipts');
const configPath = path.join(root, 'qvac.config.json');
const portArg = process.argv.indexOf('--port');
const port = portArg < 0 ? 4317 : Number(process.argv[portArg + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be 1024–65535');

const client = new QvacClient();
const pendingChallenges = new Map();
let busy = false;
let shuttingDown = false;
const json = (res, status, data, extra = {}) => {
  const bytes = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'content-length': bytes.length, ...extra });
  res.end(bytes);
};
const fail = (res, status, code, message) => json(res, status, { error: { code, message } });
const digest = (value) => createHash('sha256').update(value).digest('hex');

async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('JSON content type required'), { status: 415 });
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8192) throw Object.assign(new Error('Request exceeds 8 KiB'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

async function cacheStatus() {
  try {
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const names = await readdir(config.cacheDirectory);
    for (const name of names) {
      if (!name.endsWith(MODEL.modelId)) continue;
      if ((await stat(path.join(config.cacheDirectory, name))).size === MODEL.expectedSize) return true;
    }
  } catch { /* setup or cache absent */ }
  return false;
}

async function status() {
  return { runtime: client.modelId ? 'LOADED' : 'IDLE', model: MODEL.name, modelFile: MODEL.modelId,
    modelId: client.modelId, modelLoadMs: client.loadMs, sdkVersion: '0.22.0', cachedFilePresent: await cacheStatus(),
    busy, localOnly: true, at: new Date().toISOString() };
}

async function seedWorkspace() {
  await mkdir(workspace, { recursive: true });
  const source = path.join(workspace, 'app.mjs');
  const config = path.join(workspace, 'pocketify.json');
  try { await stat(source); } catch { await copyFile(path.join(root, 'examples', 'ticket-triage', 'app.mjs'), source); }
  try { await stat(config); } catch { await copyFile(path.join(root, 'studio', 'seed', 'pocketify.json'), config); }
}

async function migrationState() {
  await seedWorkspace();
  const config = JSON.parse(await readFile(path.join(workspace, 'pocketify.json'), 'utf8'));
  const original = JSON.parse(await readFile(path.join(root, 'studio', 'seed', 'pocketify.json'), 'utf8'));
  let backup = null;
  try { backup = JSON.parse(await readFile(path.join(workspace, 'pocketify.json.cloud.backup'), 'utf8')); } catch {}
  return { scan: await scanRepository(workspace), source: await readFile(path.join(workspace, 'app.mjs'), 'utf8'),
    original, config, backup, preview: {
      from: { provider: original.provider, model: original.model, destination: original.baseURL },
      to: { provider: 'qvac-sdk', model: MODEL.name, destination: 'QVAC Bare worker on this device' },
      filesChanged: ['pocketify.json'], backup: 'pocketify.json.cloud.backup', sourceCodeEdited: false,
    } };
}

async function benchmarks() {
  const files = ['sample-2026-10-29.json', 'sample-release-2026-10-29.json', 'sample-current-2026-10-29.json'];
  const runs = [];
  for (const file of files) {
    try { runs.push(JSON.parse(await readFile(path.join(root, 'reports', file), 'utf8'))); } catch {}
  }
  try { runs.push(JSON.parse(await readFile(path.join(root, 'reports', 'latest.json'), 'utf8'))); } catch {}
  return { runs, cloudBaseline: 'NOT MEASURED' };
}

async function runExclusive(task) {
  if (busy) throw Object.assign(new Error('QVAC is busy. Wait for the current operation to finish.'), { status: 409 });
  busy = true;
  try { return await task(); } finally { busy = false; }
}

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/mark.svg', ['mark.svg', 'image/svg+xml']],
  ['/studio-desktop.png', ['studio-desktop.png', 'image/png']],
  ['/studio-live-lab.png', ['studio-live-lab.png', 'image/png']],
  ['/data.json', ['data.json', 'application/json; charset=utf-8']],
]);

export function createStudioServer() {
  const server = http.createServer(async (req, res) => {
    const activePort = server.address()?.port || port;
    const host = req.headers.host;
    if (host !== `127.0.0.1:${activePort}` && host !== `localhost:${activePort}`) return fail(res, 403, 'HOST_DENIED', 'Use the local Studio address.');
    const origin = req.headers.origin;
    if (req.method === 'POST' && origin && origin !== `http://127.0.0.1:${activePort}` && origin !== `http://localhost:${activePort}`) {
      return fail(res, 403, 'ORIGIN_DENIED', 'Cross-origin requests are disabled.');
    }
    res.setTimeout(120000);
    let url;
    try { url = new URL(req.url, `http://127.0.0.1:${activePort}`); }
    catch { return fail(res, 400, 'BAD_URL', 'Invalid request URL.'); }
    try {
      if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, await status());
      if (req.method === 'GET' && url.pathname === '/api/migration') return json(res, 200, await migrationState());
      if (req.method === 'GET' && url.pathname === '/api/benchmarks') return json(res, 200, await benchmarks());
      if (req.method === 'GET' && /^\/api\/receipts\/[0-9a-f-]{36}$/.test(url.pathname)) {
        const id = url.pathname.split('/').at(-1);
        const contents = await readFile(path.join(receipts, `${id}.json`));
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename="pocketify-${id}.json"`, 'content-length': contents.length,
          'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        return res.end(contents);
      }
      if (req.method === 'POST' && url.pathname === '/api/prepare') return json(res, 200, await runExclusive(async () => { await client.open(); return status(); }));
      if (req.method === 'POST' && url.pathname === '/api/triage') {
        const body = await readJson(req);
        if (typeof body.ticket !== 'string' || !body.ticket.trim() || body.ticket.length > 4000) return fail(res, 400, 'INVALID_TICKET', 'Ticket must be 1–4000 characters.');
        return json(res, 200, await runExclusive(async () => {
          const result = await triage(client, body.ticket);
          return { ...result, model: MODEL.name, execution: 'LOCAL_QVAC', at: new Date().toISOString() };
        }));
      }
      if (req.method === 'POST' && url.pathname === '/api/challenge/verify') {
        const body = await readJson(req);
        if (typeof body.ticket !== 'string' || !body.ticket.trim() || body.ticket.length > 4000 || typeof body.manualDisconnected !== 'boolean') {
          return fail(res, 400, 'INVALID_CHALLENGE', 'Provide ticket and manualDisconnected boolean.');
        }
        return json(res, 200, await runExclusive(async () => {
          const before = await probeExternal();
          const verificationId = randomUUID();
          pendingChallenges.set(verificationId, { before, ticketSha256: digest(body.ticket),
            manualDisconnected: body.manualDisconnected, created: Date.now() });
          if (pendingChallenges.size > 16) pendingChallenges.delete(pendingChallenges.keys().next().value);
          return { verificationId, before, localServerReached: true };
        }));
      }
      if (req.method === 'POST' && url.pathname === '/api/challenge/infer') {
        const body = await readJson(req);
        if (typeof body.ticket !== 'string' || !body.ticket.trim() || body.ticket.length > 4000 ||
            typeof body.verificationId !== 'string') return fail(res, 400, 'INVALID_CHALLENGE', 'Provide ticket and verificationId.');
        const pending = pendingChallenges.get(body.verificationId);
        if (!pending || Date.now() - pending.created > 120000 || pending.ticketSha256 !== digest(body.ticket)) {
          return fail(res, 409, 'VERIFICATION_EXPIRED', 'Verification expired or ticket changed. Start verification again.');
        }
        return json(res, 200, await runExclusive(async () => {
          pendingChallenges.delete(body.verificationId);
          const before = pending.before;
          let inference = null;
          let inferenceError = null;
          try { inference = await triage(client, body.ticket); }
          catch (error) { console.error(`[studio] challenge inference: ${error.stack || error.message}`); inferenceError = 'QVAC inference failed; check the Studio terminal.'; }
          const after = await probeExternal();
          const verdict = challengeVerdict({ manualDisconnected: pending.manualDisconnected, before, after,
            inferenceSucceeded: Boolean(inference), localServerReached: true });
          const id = randomUUID();
          const receipt = { id, at: new Date().toISOString(), verdict, manualDisconnected: pending.manualDisconnected,
            localServerReached: true, externalBefore: before, externalAfter: after,
            model: MODEL.name, modelFile: MODEL.modelId, modelId: client.modelId,
            sdkVersion: '0.22.0', ticketSha256: digest(body.ticket),
            modelLoadMs: client.loadMs,
            inference: inference ? { completed: true, category: inference.category,
              durationMs: inference.inferenceMs, clientRssBytes: inference.clientRssBytes,
              outputSha256: digest(JSON.stringify({ category: inference.category, summary: inference.summary })) } :
              { completed: false, error: inferenceError },
            note: 'This receipt records local checks and model execution. It is not cryptographic proof of total internet isolation.' };
          await mkdir(receipts, { recursive: true });
          await writeFile(path.join(receipts, `${id}.json`), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
          return { receipt, result: inference ? { category: inference.category, summary: inference.summary } : null };
        }));
      }
      if (req.method === 'POST' && url.pathname === '/api/migration/run') return json(res, 200, await runExclusive(async () => {
        await seedWorkspace();
        const result = await migrateExample(workspace);
        return { result, state: await migrationState() };
      }));
      if (req.method === 'POST' && url.pathname === '/api/migration/reset') return json(res, 200, await runExclusive(async () => {
        await seedWorkspace();
        await copyFile(path.join(root, 'studio', 'seed', 'pocketify.json'), path.join(workspace, 'pocketify.json'));
        return migrationState();
      }));
      if (req.method === 'POST' && url.pathname === '/api/evaluate') return json(res, 200, await runExclusive(async () => {
        await client.close();
        return evaluate({ root, offline: false });
      }));
      if (req.method === 'GET' && assets.has(url.pathname)) {
        const [file, type] = assets.get(url.pathname);
        const contents = await readFile(path.join(site, file));
        res.writeHead(200, { 'content-type': type, 'content-length': contents.length,
          'x-content-type-options': 'nosniff', 'cache-control': file === 'data.json' ? 'no-store' : 'public, max-age=3600' });
        return res.end(contents);
      }
      return fail(res, 404, 'NOT_FOUND', 'No such local Studio route.');
    } catch (error) {
      console.error(`[studio] ${req.method} ${url.pathname}: ${error.stack || error.message}`);
      if (error.status) return fail(res, error.status, 'REQUEST_REJECTED', error.message);
      if (/QVAC model unavailable/.test(error.message)) return fail(res, 503, 'MODEL_UNAVAILABLE', 'QVAC model unavailable. Run scripts/setup.ps1 and cache the model once online.');
      return fail(res, 500, 'STUDIO_ERROR', 'Local operation failed. Check the Studio terminal for details.');
    }
  });
  server.closeStudio = async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await client.close();
  };
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createStudioServer();
  server.listen(port, '127.0.0.1', () => console.log(`Pocketify Studio Local: http://127.0.0.1:${port}`));
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    try { await server.closeStudio(); } catch (error) { console.error(`QVAC shutdown: ${error.message}`); }
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
