/**
 * Start Expo with --tunnel (Expo's ngrok) so it does NOT fight your system ngrok on :8788.
 *
 *   Expo  → expo.dev tunnel (any network)
 *   Agent → your ngrok on 8788 OR LAN via outdoor-endpoints.json
 *
 * Usage: npm run start:tunnel:outdoor
 */

import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { syncOutdoorEndpoints } from '../../bin/sync-outdoor-endpoints.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IOS_TELEPROMPTER_ROOT = path.resolve(__dirname, '..');
const VIDEO_OPS_ROOT = path.resolve(IOS_TELEPROMPTER_ROOT, '..');
const AGENT_PORT = Number(Deno.env.get('AGENT_PORT') || 8788);

const children: ChildProcess[] = [];

function log(message: string): void {
  console.log(`[start:tunnel:outdoor] ${message}`);
}

function spawnTracked(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'ignore' } = {},
): ChildProcess {
  const child = spawn(command, args, {
    stdio: options.stdio ?? 'inherit',
    cwd: options.cwd,
    env: options.env ?? process.env,
  });
  children.push(child);
  return child;
}

function cleanup(): void {
  for (const child of children) {
    try {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
  }
}

Deno.addSignalListener('SIGINT', () => {
  cleanup();
  Deno.exit(0);
});
Deno.addSignalListener('SIGTERM', () => {
  cleanup();
  Deno.exit(0);
});

log(`Starting outdoor agent on 0.0.0.0:${AGENT_PORT} (LAN — does not use your ngrok port)`);
spawnTracked(
  Deno.build.os === 'windows' ? 'deno.cmd' : 'deno',
  [
    'task',
    '--config',
    path.join(VIDEO_OPS_ROOT, 'outdoor_agent/deno.json'),
    'start:lan',
    '--',
    '--port',
    String(AGENT_PORT),
  ],
  { cwd: VIDEO_OPS_ROOT },
);

await new Promise((resolve) => setTimeout(resolve, 1200));
await syncOutdoorEndpoints();

console.log('\n' + '='.repeat(72));
console.log('EXPO TUNNEL MODE — does not use your reserved ngrok hostname');
console.log('Scan the QR code below in Expo Go (works away from home Wi‑Fi)');
console.log('Agent/pipeline: npm run outdoor-agent:ngrok  OR  same Wi‑Fi + Refresh iCloud');
console.log('='.repeat(72) + '\n');

if (Deno.build.os === 'darwin') {
  spawnTracked('caffeinate', ['-dims'], { stdio: 'ignore' });
}

spawnTracked(Deno.build.os === 'windows' ? 'npx.cmd' : 'npx', ['expo', 'start', '--tunnel'], {
  cwd: IOS_TELEPROMPTER_ROOT,
});

await new Promise(() => {});
