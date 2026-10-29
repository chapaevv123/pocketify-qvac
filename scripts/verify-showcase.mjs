// Optional no-dependency browser smoke check for a separately served static site.
import { writeFile } from 'node:fs/promises';

const pages = await (await fetch('http://127.0.0.1:9224/json')).json();
const page = pages.find((item) => item.type === 'page' && item.url.startsWith('http://127.0.0.2:4320/'));
if (!page) throw new Error('Start static site on 127.0.0.2:4320 and Chrome DevTools on 127.0.0.1:9224.');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
const errors = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((x) => x.value || x.description).join(' '));
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
};
function command(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
try {
  await command('Runtime.enable');
  await command('Page.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await command('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const initial = await evaluate('({mode: document.getElementById("mode-badge").textContent, status: document.getElementById("result-status").textContent, samples: document.querySelectorAll("#sample-tickets button").length, scannerReady: !document.getElementById("scan-button").disabled, migrationReady: !document.getElementById("migrate-button").disabled, customReadonly: document.getElementById("ticket-input").readOnly})');
  if (!initial.mode.includes('LIVE IN BROWSER') || !initial.status.startsWith('RECORDED OUTPUT') || initial.samples !== 10 || !initial.scannerReady || !initial.migrationReady || !initial.customReadonly) throw new Error(`Public mode failed: ${JSON.stringify(initial)}`);
  await evaluate('document.querySelectorAll("#sample-tickets button")[0].click(); true');
  const selected = await evaluate('({status: document.getElementById("result-status").textContent, category: document.getElementById("result-category").textContent, meta: document.getElementById("recorded-meta").textContent, duration: document.getElementById("lab-duration").textContent, execution: document.getElementById("lab-execution").textContent})');
  if (selected.status !== 'RECORDED OUTPUT / B01' || !selected.meta.includes('Expected: billing') || !selected.meta.includes('MISMATCH') || selected.execution !== 'RECORDED QVAC / NOT LIVE') throw new Error(`Recorded row mismatch: ${JSON.stringify(selected)}`);
  await evaluate('document.getElementById("scan-button").click(); document.getElementById("migrate-button").click(); true');
  const migration = await evaluate('({config:document.getElementById("migration-config").textContent,backup:document.getElementById("migration-backup").textContent,diff:document.getElementById("migration-diff").textContent,scan:document.getElementById("scan-output").textContent})');
  if (!migration.config.includes('qvac-sdk') || !migration.backup.includes('cloud-openai-compatible') || !migration.diff.includes('+++') || !migration.scan.includes('app.mjs:')) throw new Error(`Browser migration failed: ${JSON.stringify(migration)}`);
  await evaluate('document.getElementById("reset-button").click(); document.getElementById("network-button").click(); true');
  const reset = await evaluate('document.getElementById("migration-config").textContent.includes("cloud-openai-compatible") && document.getElementById("migration-backup").textContent.includes("Backup not created")');
  if (!reset) throw new Error('Workspace reset failed');
  await new Promise((resolve) => setTimeout(resolve, 900));
  const network = await evaluate('({result:document.getElementById("network-result").textContent,download:document.getElementById("network-download").disabled})');
  if (!network.result.includes('HTTP') || network.download) throw new Error(`Network check failed: ${JSON.stringify(network)}`);
  await command('Network.enable');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await evaluate('document.getElementById("network-button").click(); true');
  await new Promise((resolve) => setTimeout(resolve, 600));
  const offlineNetwork = await evaluate('document.getElementById("network-result").textContent');
  await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  if (!offlineNetwork.includes('ISOLATION UNPROVEN')) throw new Error(`Failed-request handling missing: ${offlineNetwork}`);
  const anchors = await evaluate('Array.from(document.querySelectorAll(".hero-utility a, .hero-actions a")).map(a => ({href: a.getAttribute("href"), label: a.textContent.trim()}))');
  const brokenAnchors = await evaluate('Array.from(document.querySelectorAll("a[href^=\u0027#\u0027]")).filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash)');
  if (brokenAnchors.length) throw new Error(`Broken anchors: ${brokenAnchors.join(', ')}`);
  const desktop = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('evidence/render-showcase-desktop.png', Buffer.from(desktop.data, 'base64'));
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const layout = await evaluate('({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})');
  if (layout.scrollWidth > layout.width + 1) throw new Error(`Horizontal overflow: ${JSON.stringify(layout)}`);
  const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('evidence/render-showcase-mobile.png', Buffer.from(shot.data, 'base64'));
  await command('Page.navigate', { url: 'http://127.0.0.2:4320/offline.html' });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const offlinePage = await evaluate('({title:document.title,steps:document.querySelectorAll(".step-card").length,copy:document.querySelectorAll("[data-copy]").length,width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  if (offlinePage.steps !== 10 || offlinePage.copy < 4 || offlinePage.scrollWidth > offlinePage.width + 1) throw new Error(`Offline guide failed: ${JSON.stringify(offlinePage)}`);
  await evaluate('document.querySelector("video").muted=true; document.querySelector("video").play().catch(()=>{}); true');
  await new Promise((resolve) => setTimeout(resolve, 400));
  const offlineClip = await evaluate('({ready:document.querySelector("video").readyState,time:document.querySelector("video").currentTime,error:document.querySelector("video").error?.message||null})');
  if (offlineClip.ready < 2 || offlineClip.error || offlineClip.time <= 0) throw new Error(`Offline highlight failed: ${JSON.stringify(offlineClip)}`);
  await command('Page.navigate', { url: 'http://127.0.0.2:4320/evidence.html' });
  await new Promise((resolve) => setTimeout(resolve, 750));
  const evidencePage = await evaluate('({runs:document.querySelectorAll("#run-cards article").length,receipts:document.querySelectorAll("#receipt-cards article").length,width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  if (evidencePage.runs !== 5 || evidencePage.receipts !== 2 || evidencePage.scrollWidth > evidencePage.width + 1) throw new Error(`Evidence page failed: ${JSON.stringify(evidencePage)}`);
  await evaluate('document.querySelector("video").muted=true; document.querySelector("video").play().catch(()=>{}); true');
  await new Promise((resolve) => setTimeout(resolve, 400));
  const migrationClip = await evaluate('({ready:document.querySelector("video").readyState,time:document.querySelector("video").currentTime,error:document.querySelector("video").error?.message||null})');
  if (migrationClip.ready < 2 || migrationClip.error || migrationClip.time <= 0) throw new Error(`Migration highlight failed: ${JSON.stringify(migrationClip)}`);
  await command('Page.navigate', { url: 'http://127.0.0.2:4320/' });
  await new Promise((resolve) => setTimeout(resolve, 650));
  await evaluate('document.querySelector("#watch video").muted=true; document.querySelector("#watch video").play().catch(()=>{}); true');
  await new Promise((resolve) => setTimeout(resolve, 850));
  const video = await evaluate('({ready:document.querySelector("#watch video").readyState,time:document.querySelector("#watch video").currentTime,error:document.querySelector("#watch video").error?.message||null})');
  if (video.ready < 2 || video.error || video.time <= 0) throw new Error(`Video playback failed: ${JSON.stringify(video)}`);
  if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ initial, selected, migration: { backedUp: true, diff: true }, network, offlineNetwork, layout, offlinePage, offlineClip, evidencePage, migrationClip, video, heroLinks: anchors.length, consoleErrors: errors.length }, null, 2));
} finally { socket.close(); }
