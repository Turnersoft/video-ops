/**
 * Start outdoor Mac services for iPhone filming away from home Wi‑Fi.
 *
 *   1. Outdoor agent (pipeline API) on :8788
 *   2. ngrok tunnel → agent (optional; LAN sync when on same Wi‑Fi)
 *   3. Prints Expo teleprompter instructions (run start:ngrok separately)
 */

import os from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NgrokTunnel } from './ngrok-types.ts';
import { OUTDOOR_ENDPOINTS_FILE, writeOutdoorEndpoints } from './outdoor-endpoints.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_OPS_ROOT = path.resolve(__dirname, '..');
const AGENT_PORT = Number(Deno.env.get('AGENT_PORT') || 8788);
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const LINK_FILE = path.join(VIDEO_OPS_ROOT, 'outdoor-agent-ngrok.txt');

const children: ChildProcess[] = [];

function log(message: string): void {
  console.log(`[outdoor-mac] ${message}`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAgentTunnel(): Promise<string | null> {
  const response = await fetch(NGROK_API);
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { tunnels?: NgrokTunnel[] };
  const tunnels = Array.isArray(payload.tunnels) ? payload.tunnels : [];
  const match = tunnels.find((tunnel) => {
    const addr = tunnel.config?.addr ?? '';
    return addr.endsWith(`:${AGENT_PORT}`) || addr === String(AGENT_PORT);
  });
  const https = tunnels.find((t) => t.public_url?.startsWith('https://'));
  return (match ?? https)?.public_url ?? null;
}

async function waitForTunnel(timeoutMs = 25000): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const url = await fetchAgentTunnel();
      if (url) {
        return url;
      }
    } catch {
      // ngrok not ready
    }
    await sleep(500);
  }
  return null;
}

function spawnProc(label: string, command: string, args: string[], options: { cwd?: string } = {}): ChildProcess {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      log(`${label} exited with code ${code}`);
    }
  });
  return child;
}

function shutdown(): void {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  Deno.exit(0);
}

Deno.addSignalListener('SIGINT', shutdown);
Deno.addSignalListener('SIGTERM', shutdown);

function detectLanIp(): string | null {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

async function ngrokApiReachable(): Promise<boolean> {
  try {
    const response = await fetch(NGROK_API);
    return response.ok;
  } catch {
    return false;
  }
}

log('Starting outdoor agent on 0.0.0.0:' + AGENT_PORT);
spawnProc(
  'agent',
  'deno',
  [
    'task',
    '--config',
    path.join(VIDEO_OPS_ROOT, 'editor/outdoor_agent/deno.json'),
    'start:lan',
    '--',
    '--port',
    String(AGENT_PORT),
  ],
  { cwd: VIDEO_OPS_ROOT },
);

await sleep(1500);

const skipNgrok = Deno.env.get('SKIP_AGENT_NGROK') === '1' || Deno.env.get('SKIP_NGROK') === '1';
if (!skipNgrok) {
  if (await ngrokApiReachable()) {
    log('ngrok already running — reusing existing tunnel (set SKIP_AGENT_NGROK=1 to skip)');
  } else {
    log(`Starting ngrok http ${AGENT_PORT}`);
    spawnProc('ngrok', Deno.env.get('NGROK_BIN') || 'ngrok', ['http', String(AGENT_PORT)]);
  }
} else {
  log('SKIP_AGENT_NGROK=1 — agent listens on LAN only');
}

const publicUrl = await waitForTunnel();
const lanIp = detectLanIp();
const agentUrl = publicUrl
  ? publicUrl.replace(/\/+$/, '')
  : lanIp
    ? `http://${lanIp}:${AGENT_PORT}`
    : `http://127.0.0.1:${AGENT_PORT}`;

const endpoints = writeOutdoorEndpoints({ agentUrl });

const instructions = `# Outdoor agent URL (paste in iPhone → Agent Settings)
# Started: ${new Date().toISOString()}

AGENT_URL=${agentUrl}

# iPhone reads automatically from iCloud:
#   TurnOutdoor/outdoor-endpoints.json
#   (${OUTDOOR_ENDPOINTS_FILE})
#   cd ios-teleprompter && npm run start:ngrok
#   paste exp://… from outdoor-expo-link.txt into Expo Go
`;

fs.writeFileSync(LINK_FILE, instructions, 'utf8');

console.log('\n' + '='.repeat(72));
console.log('OUTDOOR PIPELINE — Mac ready');
console.log('='.repeat(72));
console.log(`Agent URL for iPhone:  ${endpoints.agentUrl}`);
console.log(`iCloud endpoints:      ${OUTDOOR_ENDPOINTS_FILE}`);
console.log('\nNext on Mac: cd ios-teleprompter && npm run start:ngrok');
console.log('='.repeat(72) + '\n');

await new Promise(() => {});
