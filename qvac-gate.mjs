import {
  QWEN3_600M_INST_Q4,
  loadModel,
  completion,
  unloadModel,
} from '@qvac/sdk';

const source = QWEN3_600M_INST_Q4;
const prompt = 'Reply in one short sentence: What is the purpose of a support ticket triage system?';
const started = performance.now();
let modelId;

console.log(JSON.stringify({ event: 'start', at: new Date().toISOString(), model: source.name,
  modelId: source.modelId, registryPath: source.registryPath,
  expectedSize: source.expectedSize, sha256: source.sha256Checksum,
  prompt, pid: process.pid }));

try {
  modelId = await loadModel({
    modelSrc: source,
    ...(process.env.POCKETIFY_FALLBACK_SRC ? { fallbackSrc: process.env.POCKETIFY_FALLBACK_SRC } : {}),
    onProgress: (p) => console.error(JSON.stringify({ event: 'download',
      percentage: p.percentage, downloaded: p.downloaded, total: p.total })),
  });
  const loadMs = Math.round(performance.now() - started);
  console.log(JSON.stringify({ event: 'loaded', modelId, loadMs,
    processRssBytes: process.memoryUsage().rss }));

  const inferenceStart = performance.now();
  const result = completion({ modelId, history: [{ role: 'user', content: prompt }], stream: true });
  let output = '';
  for await (const token of result.tokenStream) output += token;
  console.log(JSON.stringify({ event: 'inference', modelId, output,
    inferenceMs: Math.round(performance.now() - inferenceStart),
    totalMs: Math.round(performance.now() - started),
    processRssBytes: process.memoryUsage().rss }));
} catch (error) {
  console.error(JSON.stringify({ event: 'error', name: error?.name,
    message: error?.message, stack: error?.stack,
    totalMs: Math.round(performance.now() - started) }));
  process.exitCode = 1;
} finally {
  if (modelId) {
    try { await unloadModel({ modelId }); }
    catch (error) { console.error(JSON.stringify({ event: 'unload-error', message: error?.message })); process.exitCode = 1; }
  }
  process.exit(process.exitCode || 0);
}
