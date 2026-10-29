import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const ids = ['38baaf0f-f070-4e61-bf1a-5c55b8a5199c', '63ac8842-8be4-48fa-952e-39bbb728a002'];
const out = path.join(root, 'site/evidence/receipts');
await mkdir(out, { recursive: true });
const index = [];
for (const id of ids) {
  const source = JSON.parse(await readFile(path.join(root, `.studio/receipts/${id}.json`), 'utf8'));
  if (source.id !== id || source.verdict !== 'INCONCLUSIVE' || !source.inference?.completed)
    throw new Error(`Receipt ${id} failed provenance checks`);
  const receipt = {
    id: source.id, at: source.at, originalVerdict: source.verdict,
    verdict: source.verdict, manualDisconnectedAcknowledged: source.manualDisconnected,
    localServerReached: source.localServerReached,
    sdkVersion: source.sdkVersion, model: source.model, modelId: source.modelId,
    warmup: { completed: source.warmup?.completed, at: source.warmup?.at,
      durationMs: source.warmup?.durationMs, onlineObservation: source.warmup?.onlineObservation },
    externalBefore: source.externalBefore, externalAfter: source.externalAfter,
    inference: { completed: source.inference.completed, category: source.inference.category,
      summary: source.inference.summary, durationMs: source.inference.durationMs },
    analysis: 'DNS ECONNREFUSED was UNAVAILABLE. No reachable external route was observed before disconnection. Physical adapter state was not independently captured.',
    limitations: ['Selected probes do not prove all external routes unavailable.',
      'Manual disconnection is owner acknowledgement; supplied video does not show Windows adapter state.'],
  };
  const filename = `${id}.json`;
  await writeFile(path.join(out, filename), JSON.stringify(receipt, null, 2) + '\n');
  index.push({ id, at: receipt.at, verdict: receipt.verdict, inferenceMs: receipt.inference.durationMs,
    beforeStatus: receipt.externalBefore.status, afterStatus: receipt.externalAfter.status,
    url: `./evidence/receipts/${filename}` });
}
await writeFile(path.join(root, 'site/evidence/receipts.json'), JSON.stringify({ records: index }, null, 2) + '\n');
console.log(`Sanitized ${index.length} original local receipts without changing their verdicts.`);
