import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { QvacClient, MODEL } from './qvac-client.mjs';
import { triage } from './triage.mjs';
import { probeOutbound } from './network.mjs';
import { renderReport } from './report.mjs';

const sort = (xs) => [...xs].sort((a, b) => a - b);
const median = (xs) => { const a = sort(xs); return a.length ? (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2 : null; };

export async function evaluate({ root = process.cwd(), offline = false } = {}) {
  const probe = await probeOutbound();
  if (offline && probe.reachable) throw new Error(`Offline run refused: outbound ${probe.target} is reachable. Disconnect manually and retry.`);
  const tickets = JSON.parse(await readFile(path.join(root, 'data/golden-tickets.json'), 'utf8'));
  const sdkVersion = JSON.parse(await readFile(path.join(root, 'node_modules/@qvac/sdk/package.json'), 'utf8')).version;
  const client = new QvacClient();
  const freeBefore = os.freemem();
  const rows = [];
  let freeAfterLoad;
  try {
    await client.open();
    freeAfterLoad = os.freemem();
    for (const item of tickets) {
      try {
        const result = await triage(client, item.text);
        rows.push({ id: item.id, text: item.text, expected: item.expected,
          predicted: result.category, summary: result.summary, correct: result.category === item.expected,
          latencyMs: result.inferenceMs, clientRssBytes: result.clientRssBytes });
      } catch (error) {
        rows.push({ id: item.id, text: item.text, expected: item.expected, predicted: null,
          summary: '', correct: false, latencyMs: null, error: error.message });
      }
      console.error(`${rows.length}/${tickets.length} ${item.id}: ${rows.at(-1).predicted ?? 'ERROR'}`);
    }
  } finally { await client.close(); }
  const times = rows.map((x) => x.latencyMs).filter(Number.isFinite);
  const result = {
    generatedAt: new Date().toISOString(),
    backend: '@qvac/sdk', sdkVersion, model: MODEL.name,
    modelFile: MODEL.modelId, modelExpectedBytes: MODEL.expectedSize, modelSha256: MODEL.sha256Checksum,
    offlineRequested: offline, networkProbe: probe,
    offlineEvidence: offline ? 'QVAC cached-model run while outbound TCP and ICMP probes both failed; failed probes alone do not prove complete network isolation.' : 'Not an offline run',
    cloudBaseline: 'NOT MEASURED',
    environment: { platform: process.platform, arch: process.arch, node: process.version,
      cpus: os.cpus().map((c) => c.model).filter((x, i, a) => a.indexOf(x) === i), totalRamBytes: os.totalmem() },
    memory: { hostFreeBeforeBytes: freeBefore, hostFreeAfterLoadBytes: freeAfterLoad,
      hostFreeAfterEvalBytes: os.freemem(), note: 'Host free RAM is a system-wide snapshot, not QVAC process memory. clientRssBytes excludes the QVAC worker.' },
    loadMs: client.loadMs,
    accuracy: rows.filter((x) => x.correct).length / rows.length,
    correct: rows.filter((x) => x.correct).length,
    count: rows.length, successfulInferences: times.length,
    medianLatencyMs: median(times), minLatencyMs: times.length ? Math.min(...times) : null,
    maxLatencyMs: times.length ? Math.max(...times) : null,
    rows,
  };
  const out = path.join(root, 'reports');
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'latest.json'), JSON.stringify(result, null, 2) + '\n');
  await writeFile(path.join(out, 'latest.html'), renderReport(result));
  return result;
}
