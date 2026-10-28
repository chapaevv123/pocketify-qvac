import net from 'node:net';
import { spawn } from 'node:child_process';

function tcpProbe(timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '1.1.1.1', port: 443 });
    const finish = (reachable, detail) => { socket.destroy(); resolve({ reachable, detail }); };
    socket.setTimeout(timeoutMs, () => finish(false, 'timeout'));
    socket.once('connect', () => finish(true, 'connected'));
    socket.once('error', (error) => finish(false, error.code || error.message));
  });
}

function icmpProbe() {
  return new Promise((resolve) => {
    const args = process.platform === 'win32' ? ['-n', '1', '-w', '1000', '1.1.1.1'] : ['-c', '1', '-W', '1', '1.1.1.1'];
    const child = spawn('ping', args, { windowsHide: true, stdio: 'ignore' });
    child.once('error', (error) => resolve({ reachable: false, detail: error.code || error.message }));
    child.once('exit', (code) => resolve({ reachable: code === 0, detail: `exit=${code}` }));
  });
}

export async function probeOutbound(timeoutMs = 2000) {
  const [tcp, icmp] = await Promise.all([tcpProbe(timeoutMs), icmpProbe()]);
  return { target: '1.1.1.1', reachable: tcp.reachable || icmp.reachable,
    detail: `TCP ${tcp.detail}; ICMP ${icmp.detail}`, tcp, icmp };
}
