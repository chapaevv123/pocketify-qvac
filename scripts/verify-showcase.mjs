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
  const initial = await evaluate('({mode: document.getElementById("mode-badge").textContent, status: document.getElementById("result-status").textContent, category: document.getElementById("result-category").textContent, samples: document.querySelectorAll("#sample-tickets button").length, disabled: document.getElementById("prepare-button").disabled && document.getElementById("migrate-button").disabled && document.getElementById("evaluate-button").disabled, customReadonly: document.getElementById("ticket-input").readOnly})');
  if (initial.mode !== 'PUBLIC SHOWCASE / NO LIVE RUNTIME' || !initial.status.startsWith('RECORDED OUTPUT') || initial.samples !== 4 || !initial.disabled || !initial.customReadonly) throw new Error(`Public mode failed: ${JSON.stringify(initial)}`);
  await evaluate('document.querySelectorAll("#sample-tickets button")[0].click(); true');
  const selected = await evaluate('({status: document.getElementById("result-status").textContent, category: document.getElementById("result-category").textContent, meta: document.getElementById("recorded-meta").textContent, duration: document.getElementById("lab-duration").textContent, execution: document.getElementById("lab-execution").textContent})');
  if (selected.status !== 'RECORDED OUTPUT / B01' || selected.category !== 'other' || !selected.meta.includes('Expected: billing') || !selected.meta.includes('MISMATCH') || selected.duration !== '7440 ms' || selected.execution !== 'RECORDED QVAC / NOT LIVE') throw new Error(`Recorded row mismatch: ${JSON.stringify(selected)}`);
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
  if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ initial, selected, layout, heroLinks: anchors.length, consoleErrors: errors.length }, null, 2));
} finally { socket.close(); }
