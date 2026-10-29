const runsBox = document.getElementById('run-cards');
const receiptsBox = document.getElementById('receipt-cards');
const element = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
const date = value => new Date(value).toLocaleString();
async function load() {
  const [dataResponse, indexResponse] = await Promise.all([fetch('./data.json'), fetch('./evidence/receipts.json')]);
  if (!dataResponse.ok || !indexResponse.ok) throw new Error('Evidence assets could not be loaded.');
  const data = await dataResponse.json(); const index = await indexResponse.json();
  runsBox.replaceChildren();
  data.runs.forEach((run, i) => {
    const card = element('article', 'evidence-card');
    card.append(element('small', '', `${i < 3 ? 'ORIGINAL PROMPT' : 'REVERTED PROMPT EXPERIMENT'} / ${date(run.generatedAt)}`),
      element('h3', '', `Run ${String(i + 1).padStart(2, '0')}`), element('strong', 'metric-line', `${run.correct}/${run.count}`),
      element('p', '', `Median inference ${run.medianLatencyMs} ms · model load ${run.loadMs} ms · SDK ${run.sdkVersion}`));
    const misses = run.rows.filter(row => !row.correct).map(row => `${row.id}: ${row.expected} → ${row.predicted || 'ERROR'}`);
    card.append(element('p', '', `Mismatches: ${misses.join('; ') || 'none recorded'}`));
    const link = element('a', '', 'Download full run JSON ↗'); link.href = `./evidence/runs/${data.runFiles[i]}`; link.download = data.runFiles[i]; card.append(link);
    runsBox.append(card);
  });
  receiptsBox.replaceChildren();
  for (const entry of index.records) {
    const response = await fetch(entry.url); if (!response.ok) throw new Error(`Receipt ${entry.id} unavailable.`);
    const receipt = await response.json();
    const card = element('article', 'receipt-card');
    card.append(element('small', 'status-chip warn', receipt.verdict), element('h3', '', `Receipt ${receipt.id}`),
      element('p', '', `UTC ${receipt.at} · Fresh QVAC inference ${receipt.inference.durationMs} ms · ${receipt.inference.category}`),
      element('p', '', receipt.analysis));
    const table = element('table', 'data-table');
    const head = element('tr'); for (const label of ['Probe', 'Before', 'After']) head.append(element('th', '', label)); table.append(head);
    for (const before of receipt.externalBefore.checks) {
      const after = receipt.externalAfter.checks.find(item => item.name === before.name);
      const row = element('tr'); for (const value of [before.name, `${before.state} / ${before.detail}`, `${after?.state || 'MISSING'} / ${after?.detail || '—'}`]) row.append(element('td', '', value)); table.append(row);
    }
    card.append(table);
    const link = element('a', '', 'Download sanitized receipt JSON ↗'); link.href = entry.url; link.download = `${receipt.id}.json`; card.append(link);
    receiptsBox.append(card);
  }
}
load().catch(error => { runsBox.textContent = error.message; receiptsBox.textContent = error.message; });
