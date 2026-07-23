/**
 * Outdoor agent + ngrok on :8788 for iPhone pipeline review away from Wi‑Fi.
 * Expo must already be loaded on the phone (or use LAN for Expo separately).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { syncOutdoorEndpoints } from './sync-outdoor-endpoints.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_OPS_ROOT = path.resolve(__dirname, '..');
const AGENT_PORT = Number(Deno.env.get('AGENT_PORT') || 8788);

const children: ChildProcess[] = [];

function log(message: string): void {
  console.log(`[outdoor-agent:ngrok] ${message}`);
}

function shutdown(): void {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  Deno.exit(0);
}

Deno.addSignalListener('SIGINT', shutdown);
Deno.addSignalListener('SIGTERM', shutdown);

log(`Starting outdoor agent on 0.0.0.0:${AGENT_PORT}`);
const agent = spawn(
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
  { cwd: VIDEO_OPS_ROOT, stdio: 'inherit' },
);
children.push(agent);

await new Promise((resolve) => setTimeout(resolve, 1200));

log(`Starting ngrok http ${AGENT_PORT} (pipeline API for iPhone)`);
const ngrok = spawn(Deno.env.get('NGROK_BIN') || 'ngrok', ['http', String(AGENT_PORT)], {
  stdio: 'inherit',
});
children.push(ngrok);

await new Promise((resolve) => setTimeout(resolve, 2500));
await syncOutdoorEndpoints();

console.log('\n' + '='.repeat(72));
console.log('OUTDOOR AGENT + NGROK — iPhone pipeline');
console.log('='.repeat(72));
console.log('iPhone: Mac connection → Refresh from iCloud → Test agent');
console.log('Note: free ngrok = one port. Stop Expo ngrok first if tunnel fails.');
console.log('='.repeat(72) + '\n');

await new Promise(() => {});
