/**
 * Start Expo with system ngrok (v3) so Expo Go can connect from any network.
 *
 *   Mac Metro :8081  ←  ngrok public URL  ←  iPhone Expo Go
 *
 * Usage: npm run start:ngrok
 *
 * For agent + Expo QR in one terminal, use: npm run outdoor:all (from video_ops root)
 */

import { type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { launchOutdoorExpo } from '../../bin/outdoor-expo-ngrok.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IOS_TELEPROMPTER_ROOT = path.resolve(__dirname, '..');
const VIDEO_OPS_ROOT = path.resolve(IOS_TELEPROMPTER_ROOT, '..');

const children: ChildProcess[] = [];

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

await launchOutdoorExpo({
  logPrefix: 'start:ngrok',
  children,
  videoOpsRoot: VIDEO_OPS_ROOT,
  iosTeleprompterRoot: IOS_TELEPROMPTER_ROOT,
  startAgent: true,
});

await new Promise(() => {});
