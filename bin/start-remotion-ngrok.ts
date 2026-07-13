/**
 * Point the reserved ngrok hostname at Remotion Studio (:3000).
 *
 *   npm run remotion:ngrok
 *
 * Free ngrok = one hostname. Stop outdoor:all / agent ngrok first, or this
 * command stops any running ngrok and swaps the hostname to localhost:3000.
 * Pipeline API on iPhone then needs same-Wi‑Fi LAN until you restart outdoor:all.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { syncOutdoorEndpoints } from './sync-outdoor-endpoints.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_OPS_ROOT = path.resolve(__dirname, '..');
const REMOTION_PORT = Number(Deno.env.get('REMOTION_PORT') || 3000);

const children: ChildProcess[] = [];

function log(message: string): void {
  console.log(`[remotion:ngrok] ${message}`);
}

function shutdown(): void {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  Deno.exit(0);
}

Deno.addSignalListener('SIGINT', shutdown);
Deno.addSignalListener('SIGTERM', shutdown);

if (Deno.build.os === 'windows') {
  spawn('taskkill', ['/F', '/IM', 'ngrok.exe'], { stdio: 'ignore' });
} else {
  spawn('pkill', ['-f', 'ngrok'], { stdio: 'ignore' });
}

await new Promise((resolve) => setTimeout(resolve, 900));

const ngrokBin = Deno.env.get('NGROK_BIN') || 'ngrok';
const configPath = path.join(VIDEO_OPS_ROOT, 'ngrok.outdoor.yml');
const home = Deno.env.get('HOME') ?? '';
const userConfig = home
  ? path.join(home, 'Library/Application Support/ngrok/ngrok.yml')
  : null;
const args = ['start', 'remotion'];
if (userConfig) {
  args.push('--config', userConfig);
}
args.push('--config', configPath, '--log=stdout');

log(`Starting ngrok remotion → localhost:${REMOTION_PORT}`);
const ngrok = spawn(ngrokBin, args, { stdio: 'inherit' });
children.push(ngrok);

await new Promise((resolve) => setTimeout(resolve, 2500));
await syncOutdoorEndpoints();

console.log('\n' + '='.repeat(72));
console.log('REMOTION ngrok — reserved hostname → localhost:3000');
console.log('Run: cd remotion && npm run studio:lan');
console.log('iPhone: Refresh from iCloud in Mac connection');
console.log('To restore agent ngrok: restart npm run outdoor:all');
console.log('='.repeat(72) + '\n');

await new Promise(() => {});
