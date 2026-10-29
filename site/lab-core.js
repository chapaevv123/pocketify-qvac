// Pure browser/Node logic. The CLI scanner imports the same detection rules.
export const PATTERNS = [
  ['openai-import', /(?:from\s*['"]openai['"]|require\(['"]openai['"]\))/g],
  ['openai-constructor', /new\s+OpenAI\s*\(/g],
  ['chat-completions', /\.chat\.completions\.create\s*\(/g],
  ['responses-api', /\.responses\.create\s*\(/g],
  ['pocketify-client', /new\s+OpenAICompatClient\s*\(/g],
];

export function scanSources(files, hasConfig = true) {
  const findings = [];
  for (const [file, source] of Object.entries(files)) {
    const lines = source.split(/\r?\n/);
    for (const [kind, regex] of PATTERNS) for (const match of source.matchAll(regex)) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push({ file, line, kind, excerpt: lines[line - 1]?.trim() || '',
        supported: kind === 'pocketify-client' || kind === 'chat-completions' });
    }
  }
  return { scannedFiles: Object.keys(files).length, findings,
    supportedMigration: hasConfig && findings.some(x => x.kind === 'pocketify-client'),
    scope: 'Only a validated pocketify.json configuration is migrated; source code is untouched.' };
}

export function migrateConfig(current, scan) {
  if (!scan.supportedMigration) throw new Error('Supported OpenAICompatClient call site and pocketify.json required.');
  if (current.provider === 'qvac-sdk' && current.model === 'QWEN3_600M_INST_Q4') return { changed: false, config: structuredClone(current) };
  if (current.provider !== 'cloud-openai-compatible' || typeof current.baseURL !== 'string' ||
      !current.baseURL.startsWith('https://') || typeof current.model !== 'string' || 'apiKey' in current)
    throw new Error('Unsupported cloud configuration; workspace unchanged.');
  return { changed: true, config: { provider: 'qvac-sdk', model: 'QWEN3_600M_INST_Q4',
    migratedFrom: { provider: current.provider, baseURL: current.baseURL, model: current.model } },
    changedFields: ['provider', 'model', 'baseURL → migratedFrom.baseURL', 'migratedFrom'] };
}

export function makeWorkspace(source, seedConfig) {
  const original = structuredClone(seedConfig);
  let config = structuredClone(original);
  let backup = null;
  const scan = () => scanSources({ 'app.mjs': source }, true);
  return {
    scan, get state() { return { source, original: structuredClone(original), config: structuredClone(config),
      backup: backup && structuredClone(backup), scan: scan() }; },
    migrate() { const result = migrateConfig(config, scan());
      if (result.changed) { backup = structuredClone(config); config = result.config; }
      return result; },
    reset() { config = structuredClone(original); backup = null; return this.state; },
  };
}

export function diagnosticVerdict(checks) {
  if (checks.some(x => x.ok)) return 'SAME-ORIGIN REACHABLE';
  return 'REQUESTS FAILED / ISOLATION UNPROVEN';
}

export function diffJson(before, after) {
  const left = JSON.stringify(before, null, 2).split('\n');
  const right = JSON.stringify(after, null, 2).split('\n');
  const lcs = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--)
    lcs[i][j] = left[i] === right[j] ? 1 + lcs[i + 1][j + 1] : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const lines = ['--- pocketify.json / before', '+++ pocketify.json / after'];
  let i = 0, j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) { lines.push(` ${left[i++]}`); j++; }
    else if (i < left.length && (j === right.length || lcs[i + 1][j] >= lcs[i][j + 1])) lines.push(`-${left[i++]}`);
    else lines.push(`+${right[j++]}`);
  }
  return lines.join('\n');
}

export function exportJson(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  const timer = setTimeout(() => URL.revokeObjectURL(url), 30000);
  timer.unref?.();
}
