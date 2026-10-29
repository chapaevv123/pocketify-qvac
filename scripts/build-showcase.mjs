import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRepository } from '../src/scanner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reports = ['sample-2026-10-29.json', 'sample-release-2026-10-29.json', 'sample-current-2026-10-29.json',
  'prompt-refined-run-1.json', 'prompt-refined-run-2.json'];
const runs = await Promise.all(reports.map(async (file) => JSON.parse(await readFile(path.join(root, 'reports', file), 'utf8'))));
const seed = JSON.parse(await readFile(path.join(root, 'studio', 'seed', 'pocketify.json'), 'utf8'));
const source = await readFile(path.join(root, 'examples', 'ticket-triage', 'app.mjs'), 'utf8');
const scan = await scanRepository(path.join(root, 'examples', 'ticket-triage'));
const data = {
  generatedAt: runs.at(-1).generatedAt,
  mode: 'PUBLIC_SHOWCASE',
  repository: 'https://github.com/chapaevv123/pocketify-qvac',
  videoUrl: './media/pocketify-demo-1080p.mp4',
  model: 'QWEN3_600M_INST_Q4',
  sdkVersion: '0.22.0',
  seedConfig: seed,
  source,
  findings: scan.findings,
  runs,
  runFiles: reports,
  notes: {
    cloudBaseline: 'NOT MEASURED',
    physicalOffline: 'REPORTED by owner; saved gate log lacks simultaneous network state.',
    earlyTcpProbe: 'An early TCP-only check failed but later ICMP succeeded; it was not full offline proof.',
  },
};
await writeFile(path.join(root, 'site', 'data.json'), JSON.stringify(data, null, 2) + '\n');
await mkdir(path.join(root, 'site', 'evidence', 'runs'), { recursive: true });
for (const file of reports) await copyFile(path.join(root, 'reports', file), path.join(root, 'site', 'evidence', 'runs', file));
console.log(`Built site/data.json from ${runs.length} measured evaluation runs and the actual example source.`);
