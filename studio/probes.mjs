import dns from 'node:dns/promises';
import net from 'node:net';
import { spawn } from 'node:child_process';

const LIMIT_MS = 2500;
const resolver = new dns.Resolver();
resolver.setServers(['1.1.1.1']);
const blockedCodes = new Set(['EACCES', 'ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ABORT_ERR']);
const make = (name, target, state, detail, durationMs) => ({ name, target, state, detail, durationMs });

function classify(error) {
  const code = error?.code || error?.cause?.code || error?.name || 'UNKNOWN';
  return { state: blockedCodes.has(code) ? 'BLOCKED' : 'UNAVAILABLE', detail: String(code) };
}

async function dnsProbe() {
  const start = performance.now();
  let timer;
  try {
    const answer = await Promise.race([
      resolver.resolve4('example.com'),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), LIMIT_MS); }),
    ]);
    return make('DNS', 'example.com A via 1.1.1.1', 'REACHABLE', `${answer.length} address(es)`, Math.round(performance.now() - start));
  } catch (error) {
    const x = classify(error);
    return make('DNS', 'example.com A via 1.1.1.1', x.state, x.detail, Math.round(performance.now() - start));
  } finally { clearTimeout(timer); }
}

function tcpProbe() {
  const start = performance.now();
  return new Promise((resolve) => {
    const socket = net.connect({ host: '1.1.1.1', port: 443 });
    let done = false;
    const finish = (state, detail) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(make('TCP', '1.1.1.1:443', state, detail, Math.round(performance.now() - start)));
    };
    socket.setTimeout(LIMIT_MS, () => finish('BLOCKED', 'timeout'));
    socket.once('connect', () => finish('REACHABLE', 'connected'));
    socket.once('error', (error) => {
      const x = classify(error);
      finish(error.code === 'ECONNREFUSED' ? 'REACHABLE' : x.state, error.code || x.detail);
    });
  });
}

async function httpsProbe() {
  const start = performance.now();
  try {
    const response = await fetch(`https://example.com/?pocketify=${Date.now()}`, {
      method: 'HEAD', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(LIMIT_MS),
    });
    return make('HTTPS', 'https://example.com', 'REACHABLE', `HTTP ${response.status}`, Math.round(performance.now() - start));
  } catch (error) {
    const x = classify(error);
    // A TLS validation error still means the remote host was reached.
    const state = /CERT|TLS|SSL/.test(x.detail) ? 'REACHABLE' : x.state;
    return make('HTTPS', 'https://example.com', state, x.detail, Math.round(performance.now() - start));
  }
}

function icmpProbe() {
  const start = performance.now();
  return new Promise((resolve) => {
    const args = process.platform === 'win32' ? ['-n', '1', '-w', '1000', '1.1.1.1'] : ['-c', '1', '-W', '1', '1.1.1.1'];
    const child = spawn('ping', args, { windowsHide: true, stdio: 'ignore' });
    let done = false;
    const finish = (state, detail) => {
      if (done) return;
      done = true;
      resolve(make('ICMP', '1.1.1.1', state, detail, Math.round(performance.now() - start)));
    };
    const timer = setTimeout(() => { child.kill(); finish('UNAVAILABLE', 'process timeout'); }, LIMIT_MS);
    child.once('error', (error) => { clearTimeout(timer); finish('UNAVAILABLE', error.code || error.message); });
    child.once('exit', (code) => { clearTimeout(timer); finish(code === 0 ? 'REACHABLE' : 'BLOCKED', `exit ${code}`); });
  });
}

export async function probeExternal() {
  const checks = await Promise.all([dnsProbe(), tcpProbe(), httpsProbe(), icmpProbe()]);
  return { at: new Date().toISOString(), checks,
    status: checks.some((x) => x.state === 'REACHABLE') ? 'REACHABLE' :
      checks.some((x) => x.state === 'UNAVAILABLE') ? 'UNVERIFIED' : 'BLOCKED' };
}

export function challengeVerdict({ manualDisconnected, before, after, inferenceSucceeded, localServerReached }) {
  if (!localServerReached || !inferenceSucceeded) return 'FAIL';
  if (before.status === 'REACHABLE' || after.status === 'REACHABLE') return 'FAIL';
  if (!manualDisconnected || before.status !== 'BLOCKED' || after.status !== 'BLOCKED') return 'UNVERIFIED';
  return 'PASS';
}
