import { makeWorkspace, exportJson, diagnosticVerdict, diffJson } from './lab-core.js';
const $ = (id) => document.getElementById(id);
const set = (id, value) => { $(id).textContent = String(value ?? '—'); };
const fmtMs = (value) => Number.isFinite(value) ? `${Math.round(value)} ms` : '—';
const samples = [
  { label: 'Duplicate charge', text: 'I was charged twice for my monthly subscription. Please refund the duplicate payment.' },
  { label: 'CSV crash', text: 'The CSV export crashes with an error every time I click Download.' },
  { label: 'Access reset', text: 'My password reset link expired and I cannot sign in to my account.' },
  { label: 'Feature request', text: 'Could you add dark mode to the dashboard in a future release?' },
];
let local = false;
let prepared = false;
let staticData = null;
let currentRuns = [];
let activeRequest = false;
let browserWorkspace = null;
let lastMigration = null;
let selectedRecord = null;
let networkEvents = [];
let lastNetworkCheck = null;

function errorBox(id, message) { const box = $(id); box.textContent = message; box.hidden = !message; }
function buttonBusy(id, busy, label) { const el = $(id); el.disabled = busy; el.textContent = label; }
async function api(route, body) {
  const options = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  const response = await fetch(route, { ...options, signal: AbortSignal.timeout(120000) });
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`Studio returned HTTP ${response.status} without JSON.`); }
  if (!response.ok) throw new Error(payload.error?.message || `Studio returned HTTP ${response.status}.`);
  return payload;
}
function setStep(index) {
  [...$('challenge-steps').children].forEach((step, i) => {
    step.classList.toggle('active', i === index);
    step.classList.toggle('done', i < index);
  });
}
function setCore(state) {
  const ring = $('core-ring');
  ring.classList.toggle('running', state === 'RUNNING');
  ring.classList.toggle('active', state === 'LOADED' || state === 'RUNNING');
  set('core-state', state === 'LOADED' ? 'MODEL LOADED' : state === 'RUNNING' ? 'GENERATING' : 'MODEL IDLE');
}
function renderSamples() {
  for (const item of samples) {
    const button = document.createElement('button');
    button.className = 'sample'; button.type = 'button'; button.textContent = item.label;
    button.addEventListener('click', () => { $('ticket-input').value = item.text; $('ticket-input').focus(); });
    $('sample-tickets').append(button);
  }
  $('ticket-input').value = samples[1].text;
}
function renderRecordedSamples() {
  const run = staticData?.runs?.at(-1);
  const rows = run?.rows || [];
  const labels = { B01: 'Duplicate charge', U01: 'CSV crash', A01: 'Access reset', F01: 'Feature request' };
  const box = $('sample-tickets'); box.replaceChildren();
  if (!rows.length) {
    set('result-status', 'RECORDED RESULTS UNAVAILABLE');
    set('result-summary', 'The published evaluation data could not be loaded. Read the committed reports in the source repository.');
    return;
  }
  function select(row, button) {
    selectedRecord = { runAt: run.generatedAt, sdkVersion: run.sdkVersion, model: run.model, ...row };
    $('ticket-input').value = row.text;
    for (const item of box.children) item.setAttribute('aria-pressed', String(item === button));
    set('result-category', row.predicted || 'Unavailable');
    $('result-category').classList.add('has-result');
    set('result-summary', row.summary || 'No summary was recorded for this ticket.');
    set('lab-duration', fmtMs(row.latencyMs));
    set('lab-model', run.model);
    set('lab-execution', 'RECORDED QVAC / NOT LIVE');
    set('result-status', `RECORDED OUTPUT / ${row.id}`);
    set('result-time', new Date(run.generatedAt).toLocaleDateString());
    set('recorded-meta', `Expected: ${row.expected} · Observed: ${row.predicted || 'error'} · ${row.correct ? 'MATCH' : 'MISMATCH'} · ${row.error || 'No recorded error'} · Evaluation: ${new Date(run.generatedAt).toLocaleString()}`);
  }
  for (const row of rows) {
    const button = document.createElement('button');
    button.className = 'sample'; button.type = 'button'; button.textContent = labels[row.id] || row.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => select(row, button));
    box.append(button);
  }
  box.children[0]?.click();
}
function updateStatus(status) {
  const loaded = status.runtime === 'LOADED';
  set('mode-badge', loaded ? 'LOCAL / MODEL LOADED' : 'LOCAL / MODEL IDLE');
  set('trust-runtime', loaded ? 'MODEL LOADED' : status.cachedFilePresent ? 'CACHED FILE PRESENT' : 'MODEL NOT LOADED');
  set('lab-model', status.model);
  if (!activeRequest) setCore(loaded ? 'LOADED' : 'IDLE');
  if (!activeRequest) set('lab-execution', loaded ? 'QVAC WORKER ACTIVE' : 'AWAITING REQUEST');
}
async function refreshStatus() { if (!local) return; try { updateStatus(await api('/api/status')); } catch {} }

async function analyze() {
  if (!local || activeRequest) return;
  const ticket = $('ticket-input').value.trim();
  if (!ticket) return errorBox('lab-error', 'Enter a ticket or choose a sample.');
  errorBox('lab-error', ''); activeRequest = true;
  buttonBusy('analyze-button', true, 'Analyzing with QVAC…');
  setCore('RUNNING'); set('lab-execution', 'LOCAL INFERENCE IN PROGRESS'); set('result-status', 'WORKING');
  try {
    const result = await api('/api/triage', { ticket });
    set('result-category', result.category);
    $('result-category').classList.add('has-result');
    set('result-summary', result.summary);
    set('lab-duration', fmtMs(result.inferenceMs));
    set('lab-model', result.model);
    set('lab-execution', result.execution === 'LOCAL_QVAC' ? 'LOCAL QVAC / CONFIRMED' : 'UNVERIFIED');
    set('result-status', 'GENERATED BY LOCAL QVAC');
    set('result-time', new Date(result.at).toLocaleTimeString());
  } catch (error) {
    set('result-status', 'INFERENCE FAILED');
    errorBox('lab-error', `${error.message} Check that the model is cached and run scripts/setup.ps1 if needed.`);
  } finally {
    activeRequest = false; buttonBusy('analyze-button', false, 'Analyze Locally ↗');
    await refreshStatus();
  }
}

function probeRows(before, after) {
  const list = $('probe-list'); list.replaceChildren();
  const add = (name, state, detail) => {
    const row = document.createElement('div'); row.className = 'probe-row';
    const label = document.createElement('span'); label.textContent = name;
    const result = document.createElement('b'); result.textContent = `${state} · ${detail}`;
    result.className = state === 'BLOCKED' || state === 'LOCAL READY' ? 'pass' : state === 'REACHABLE' || state === 'FAILED' ? 'fail' : 'unknown';
    row.append(label, result); list.append(row);
  };
  add('LOCAL SERVER', 'LOCAL READY', '127.0.0.1');
  for (const check of before.checks) add(`${check.name} / BEFORE`, check.state, check.detail);
  if (after) for (const check of after.checks) add(`${check.name} / AFTER`, check.state, check.detail);
}
function verdictUI(receipt, result) {
  const box = $('challenge-verdict'); box.className = `challenge-verdict ${receipt.verdict.toLowerCase()}`;
  box.replaceChildren();
  box.append(document.createTextNode(receipt.verdict));
  const detail = document.createElement('span');
  detail.textContent = receipt.verdict === 'PASS' ? 'All tested external routes blocked; real QVAC inference completed.' :
    receipt.verdict === 'FAIL' ? 'An external route was reachable or inference failed. No offline pass claimed.' :
      'External connectivity could not be confidently determined.';
  box.append(detail);
  set('receipt-id', receipt.id);
  set('challenge-clock', new Date(receipt.at).toLocaleString());
  $('receipt-download').href = `/api/receipts/${receipt.id}`;
  $('receipt-download').hidden = false;
  if (result) {
    set('result-category', result.category);
    set('result-summary', result.summary);
    $('result-category').classList.add('has-result');
    set('result-status', 'CHALLENGE INFERENCE / LOCAL QVAC');
    set('lab-duration', fmtMs(receipt.inference.durationMs));
  }
}
async function prepareChallenge() {
  if (!local || activeRequest) return;
  errorBox('challenge-error', ''); activeRequest = true;
  buttonBusy('prepare-button', true, 'Preparing local model…');
  setStep(0); setCore('RUNNING');
  set('challenge-verdict', 'PREPARING');
  try {
    const state = await api('/api/prepare', {});
    if (state.runtime !== 'LOADED' || !state.warmup?.completed) throw new Error(state.warmup?.error || 'QVAC warm-up inference did not complete.');
    prepared = true; setStep(1);
    const box = $('challenge-verdict'); box.className = 'challenge-verdict';
    box.replaceChildren(document.createTextNode('DISCONNECT'));
    const note = document.createElement('span'); note.textContent = 'Model loaded. Disconnect Wi-Fi or Ethernet manually, then verify.'; box.append(note);
    $('verify-button').disabled = !$('manual-confirm').checked;
    buttonBusy('prepare-button', false, 'Model Prepared ✓');
    updateStatus(state);
  } catch (error) {
    errorBox('challenge-error', `${error.message} Run setup and cache the model once online, then retry.`);
    buttonBusy('prepare-button', false, 'Start Offline Challenge');
  } finally { activeRequest = false; }
}
async function runChallenge() {
  if (!local || !prepared || activeRequest || !$('manual-confirm').checked) return;
  errorBox('challenge-error', ''); activeRequest = true;
  buttonBusy('verify-button', true, 'Checking network…');
  setStep(2); set('challenge-verdict', 'VERIFYING');
  const ticket = $('ticket-input').value.trim() || samples[1].text;
  try {
    const check = await api('/api/challenge/verify', { ticket, manualDisconnected: true });
    probeRows(check.before);
    setStep(3); set('challenge-verdict', 'INFERRING');
    buttonBusy('verify-button', true, 'Running real QVAC inference…');
    const done = await api('/api/challenge/infer', { ticket, verificationId: check.verificationId });
    setStep(4); probeRows(done.receipt.externalBefore, done.receipt.externalAfter);
    verdictUI(done.receipt, done.result);
    if (!done.receipt.inference.completed) errorBox('challenge-error', done.receipt.inference.error || 'QVAC inference failed.');
  } catch (error) {
    const box = $('challenge-verdict'); box.className = 'challenge-verdict unverified';
    box.textContent = 'UNVERIFIED';
    errorBox('challenge-error', `${error.message} Reconnect if needed, prepare the model, then retry.`);
  } finally { activeRequest = false; buttonBusy('verify-button', false, 'Verify & Infer'); }
}

function showMigration(state) {
  set('migration-source', state.source);
  set('migration-config', JSON.stringify(state.config, null, 2));
  set('migration-backup', state.backup ? JSON.stringify(state.backup, null, 2) : 'Backup not created yet. Apply safe migration.');
  set('migration-config-state', state.config.provider === 'qvac-sdk' ? 'LOCAL / ACTIVE' : 'CLOUD / INACTIVE');
  set('migration-status', state.config.provider === 'qvac-sdk' ? 'MIGRATED TO QVAC' : 'CLOUD CONFIGURATION');
  $('migrate-button').disabled = state.config.provider === 'qvac-sdk';
  $('reset-button').disabled = false;
  if (local && state.original) set('migration-diff', `${diffJson(state.original, state.config)}\nValidation: ${state.backup ? 'ORIGINAL BACKUP PRESENT' : 'AWAITING MIGRATION'}`);
}
function showScan(scan) {
  const box = $('scan-output'); box.replaceChildren();
  const title = document.createElement('span'); title.textContent = `SCANNER OUTPUT / ${scan.scannedFiles} SOURCE FILE(S)`; box.append(title);
  const summary = document.createElement('p');
  summary.textContent = scan.findings.length ? scan.findings.map((x) => `${x.file}:${x.line}  ${x.kind} / ${x.supported === false ? 'UNSUPPORTED' : 'DETECTED'}\n${x.excerpt || ''}`).join('\n\n') : 'No supported integration points found.';
  box.append(summary);
  const ready = document.createElement('p'); ready.textContent = `Migration readiness: ${scan.supportedMigration ? 'SUPPORTED CONFIGURATION FOUND' : 'NOT READY'}. ${scan.scope || 'Only pocketify.json is changed.'}`; box.append(ready);
}
async function migrationAction(action) {
  if (!local) {
    try {
      if (action === 'reset') { browserWorkspace.reset(); lastMigration = null; }
      else { const before = browserWorkspace.state.config; const result = browserWorkspace.migrate();
        lastMigration = { at: new Date().toISOString(), before, after: browserWorkspace.state.config,
          backup: browserWorkspace.state.backup, changedFields: result.changedFields || [],
          validation: { supported: true, backupPreserved: JSON.stringify(before) === JSON.stringify(browserWorkspace.state.backup) } }; }
      showMigration(browserWorkspace.state); showScan(browserWorkspace.scan());
      set('migration-status', action === 'reset' ? 'BROWSER WORKSPACE RESET' : 'MIGRATION APPLIED / LIVE IN BROWSER');
      set('migration-diff', lastMigration ? `${diffJson(lastMigration.before, lastMigration.after)}\nChanged: ${lastMigration.changedFields.join(', ')}\nValidation: ${lastMigration.validation.supported && lastMigration.validation.backupPreserved ? 'PASS / SUPPORTED CONFIG / ORIGINAL BACKUP PRESERVED' : 'FAIL'}` : 'Apply migration to inspect the exact configuration change.');
    } catch (error) { set('migration-status', `ERROR: ${error.message}`); }
    return;
  }
  set('migration-status', action === 'run' ? 'APPLYING MIGRATION…' : 'RESETTING WORKSPACE…');
  try {
    const data = await api(`/api/migration/${action}`, {});
    const state = data.state || data;
    showMigration(state); showScan(state.scan);
  } catch (error) { set('migration-status', `ERROR: ${error.message}`); }
}

function renderBenchmarks(runs) {
  currentRuns = runs.filter((x) => x && Array.isArray(x.rows)).filter((x, i, a) => a.findIndex((y) => y.generatedAt === x.generatedAt) === i);
  if (!currentRuns.length) return;
  const r = currentRuns.at(-1);
  set('metric-size', r.count); set('metric-accuracy', `${Math.round(r.accuracy * 100)}%`);
  set('metric-correct', `${r.correct} OF ${r.count} MATCHED`);
  set('metric-latency', fmtMs(r.medianLatencyMs)); set('metric-load', fmtMs(r.loadMs));
  set('benchmark-date', `${new Date(r.generatedAt).toLocaleString()}${staticData?.runs?.some((x, i) => i >= 3 && x.generatedAt === r.generatedAt) ? ' / PROMPT EXPERIMENT REVERTED' : ''}`);
  set('latency-model', r.model);
  const matrix = $('outcome-matrix'); matrix.replaceChildren();
  for (const row of r.rows) {
    const cell = document.createElement('div'); cell.className = `matrix-cell ${row.correct ? 'correct' : 'incorrect'}`;
    cell.title = `${row.id}: expected ${row.expected}; model ${row.predicted || 'error'}`;
    const id = document.createElement('strong'); id.textContent = row.id;
    const result = document.createElement('span'); result.textContent = row.predicted || 'ERROR';
    cell.append(id, result); matrix.append(cell);
  }
  const comparison = $('run-comparison'); comparison.replaceChildren();
  currentRuns.forEach((run, index) => {
    const row = document.createElement('div'); row.className = 'run-line';
    const label = document.createElement('span'); label.textContent = `RUN ${String(index + 1).padStart(2, '0')}${index >= 3 && index <= 4 ? ' / EXP' : ''}`;
    label.title = new Date(run.generatedAt).toLocaleString();
    const bar = document.createElement('div'); bar.className = 'bar';
    const fill = document.createElement('i'); fill.style.width = `${Math.round(run.accuracy * 100)}%`; bar.append(fill);
    const value = document.createElement('strong'); value.textContent = `${run.correct}/${run.count}`;
    row.append(label, bar, value); comparison.append(row);
  });
  const latency = $('latency-chart'); latency.replaceChildren();
  const max = Math.max(...r.rows.map((x) => x.latencyMs || 0), 1);
  for (const row of r.rows) {
    const col = document.createElement('div'); col.className = 'latency-col';
    const value = document.createElement('span'); value.className = 'latency-value'; value.textContent = row.latencyMs == null ? 'ERR' : `${row.latencyMs}`;
    const bar = document.createElement('div'); bar.className = 'latency-bar'; bar.style.height = `${Math.max(5, (row.latencyMs || 0) / max * 135)}px`;
    const label = document.createElement('small'); label.textContent = row.id;
    col.append(value, bar, label); latency.append(col);
  }
}
async function rerunEvaluation() {
  if (!local || activeRequest) return;
  activeRequest = true; buttonBusy('evaluate-button', true, 'Evaluating 10 tickets…');
  set('evaluate-status', 'Real QVAC evaluation in progress. This may take around 20 seconds.');
  try {
    const run = await api('/api/evaluate', {});
    renderBenchmarks([...currentRuns, run]);
    set('evaluate-status', `Completed ${new Date(run.generatedAt).toLocaleString()} · ${run.correct}/${run.count} matched.`);
    await refreshStatus();
  } catch (error) { set('evaluate-status', `Evaluation failed: ${error.message}`); }
  finally { activeRequest = false; buttonBusy('evaluate-button', false, 'Run Fresh Evaluation'); }
}

function publicMode() {
  local = false;
  set('mode-badge', 'LIVE IN BROWSER / RECORDED REAL QVAC');
  set('trust-runtime', 'RUN LOCALLY TO VERIFY');
  set('lab-execution', 'RECORDED / NOT LIVE'); setCore('IDLE');
  set('lab-intro', 'Explore genuine outputs saved by a previous local QVAC evaluation. Choose a ticket to inspect the recorded classification, summary and timing. New inference requires the local Studio.');
  set('sample-heading', 'EXPLORE RECORDED TICKETS');
  set('lab-microcopy', 'Recorded results are historical measurements. Selecting a ticket does not call a model or an API.');
  set('output-panel-label', 'RECORDED RESULT / LOCAL QVAC RUN');
  $('recorded-meta').hidden = false;
  $('public-lab-note').hidden = false;
  $('ticket-input').readOnly = true;
  renderRecordedSamples();
  for (const id of ['analyze-button', 'prepare-button', 'verify-button', 'evaluate-button']) $(id).disabled = true;
  $('scan-button').disabled = false;
  $('analyze-button').hidden = true;
  $('evaluate-button').hidden = true;
  $('prepare-button').hidden = true;
  $('verify-button').hidden = true;
  $('manual-confirm').closest('.confirm').hidden = true;
  const box = $('challenge-verdict'); box.className = 'challenge-verdict unverified'; box.textContent = 'RUN LOCALLY';
  errorBox('challenge-error', 'A public static site cannot inspect your device or run local QVAC. Launch the local Studio to attempt the challenge.');
  set('evaluate-status', 'Stored measured results shown. Re-run locally.');
}

async function init() {
  renderSamples();
  $('analyze-button').addEventListener('click', analyze);
  $('prepare-button').addEventListener('click', prepareChallenge);
  $('verify-button').addEventListener('click', runChallenge);
  $('manual-confirm').addEventListener('change', () => { $('verify-button').disabled = !local || !prepared || !$('manual-confirm').checked; });
  $('scan-button').addEventListener('click', async () => { try { const scan = local ? (await api('/api/migration')).scan : browserWorkspace.scan(); showScan(scan); set('migration-status', `SCANNED ${scan.scannedFiles} SOURCE FILE / LIVE IN BROWSER`); } catch (error) { set('migration-status', error.message); } });
  $('migrate-button').addEventListener('click', () => migrationAction('run'));
  $('reset-button').addEventListener('click', () => migrationAction('reset'));
  $('evaluate-button').addEventListener('click', rerunEvaluation);
  $('migration-report').addEventListener('click', () => exportJson('pocketify-migration-report.json',
    { mode: local ? 'LIVE LOCAL QVAC' : 'LIVE IN BROWSER', ...lastMigration, workspace: local ? undefined : browserWorkspace.state }));
  $('evidence-download').addEventListener('click', () => { if (selectedRecord) exportJson(`qvac-record-${selectedRecord.id}.json`,
    { mode: 'RECORDED REAL QVAC', freshInference: false, ...selectedRecord }); });
  $('network-button').addEventListener('click', runNetworkCheck);
  $('network-download').addEventListener('click', () => { if (lastNetworkCheck) exportJson('pocketify-browser-network.json', lastNetworkCheck); });
  for (const type of ['online', 'offline']) window.addEventListener(type, () => { networkEvents.push({ type, at: new Date().toISOString() }); set('network-state', navigator.onLine ? 'BROWSER REPORTS ONLINE' : 'BROWSER REPORTS OFFLINE'); });
  set('network-state', navigator.onLine ? 'BROWSER REPORTS ONLINE' : 'BROWSER REPORTS OFFLINE');
  try { staticData = await (await fetch('./data.json', { cache: 'no-store' })).json(); }
  catch { staticData = { runs: [], source: '', seedConfig: {}, findings: [] }; }
  browserWorkspace = makeWorkspace(staticData.source, staticData.seedConfig);
  const possibleLocal = ['127.0.0.1', 'localhost'].includes(location.hostname);
  if (possibleLocal) {
    try {
      updateStatus(await api('/api/status')); local = true;
      set('lab-intro', 'Try the actual support workflow. Every new result is generated by the cached QVAC model on this machine.');
      set('lab-microcopy', 'No canned result. No cloud AI request. Input is processed by the local QVAC runtime.');
      set('output-panel-label', 'RESULT / LOCAL ONLY');
      set('result-status', 'READY FOR INPUT');
      set('result-summary', 'Choose a sample ticket or write your own, then run the model.');
      for (const id of ['analyze-button', 'prepare-button', 'evaluate-button']) $(id).disabled = false;
      $('evidence-download').hidden = true;
    }
    catch { publicMode(); }
  } else publicMode();
  if (local) {
    try { const state = await api('/api/migration'); showMigration(state); $('scan-button').disabled = false; }
    catch (error) { set('migration-status', `Workspace unavailable: ${error.message}`); }
    try { renderBenchmarks((await api('/api/benchmarks')).runs); }
    catch { renderBenchmarks(staticData.runs); }
    setInterval(refreshStatus, 15000);
  } else {
    showMigration(browserWorkspace.state);
    renderBenchmarks(staticData.runs);
    if (staticData.videoUrl) { $('video-link').href = staticData.videoUrl; $('video-link').hidden = false; set('video-state', 'AVAILABLE'); }
  }
}

async function runNetworkCheck() {
  $('network-button').disabled = true;
  set('network-result', 'Checking same-origin resources…');
  const checks = [];
  for (const resource of ['./mark.svg', './data.json']) {
    const started = performance.now();
    try {
      const response = await fetch(`${resource}?network_check=${crypto.randomUUID()}`, {
        cache: 'no-store', signal: AbortSignal.timeout(5000) });
      checks.push({ resource, ok: response.ok, status: response.status, durationMs: Math.round(performance.now() - started), at: new Date().toISOString() });
    } catch (error) { checks.push({ resource, ok: false, error: error.name || String(error), durationMs: Math.round(performance.now() - started), at: new Date().toISOString() }); }
  }
  lastNetworkCheck = { mode: 'LIVE IN BROWSER', at: new Date().toISOString(), navigatorOnline: navigator.onLine,
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller), checks, events: [...networkEvents],
    verdict: diagnosticVerdict(checks), limitation: 'Same-origin fetch may be served by cache or service worker. Browser status and failed requests do not prove physical internet isolation.' };
  set('network-result', `${lastNetworkCheck.verdict}\n${checks.map(x => `${x.resource}: ${x.ok ? `HTTP ${x.status}` : x.error} / ${x.durationMs} ms`).join('\n')}\n${lastNetworkCheck.limitation}`);
  $('network-download').disabled = false;
  $('network-button').disabled = false;
}
init();
