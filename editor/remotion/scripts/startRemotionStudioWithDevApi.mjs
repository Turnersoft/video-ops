#!/usr/bin/env node
/**
 * Run Remotion Studio with the animation.md dev API sidecar on :3021.
 * Restarts the dev API if it exits while Studio is still running.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const remotionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lan = process.argv.includes('--lan');

let shuttingDown = false;
let devApiChild = null;

function spawnDevApi() {
  devApiChild = spawn('npx', ['tsx', 'scripts/dev-api/videoOpsDevApiServerCli.ts'], {
    cwd: remotionDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(lan ? { VIDEO_OPS_DEV_API_HOST: '0.0.0.0' } : {}),
    },
  });
  devApiChild.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    const reason = code != null ? `code ${code}` : String(signal ?? 'unknown');
    console.warn(`[video-ops] dev API exited (${reason}) — restarting in 1s`);
    setTimeout(spawnDevApi, 1000);
  });
}

spawnDevApi();

const studioArgs = ['remotion', 'studio', ...(lan ? ['--hostname', '0.0.0.0'] : [])];
const studioChild = spawn('npx', studioArgs, {
  cwd: remotionDir,
  stdio: 'inherit',
});

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  devApiChild?.kill('SIGTERM');
  studioChild.kill('SIGTERM');
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

studioChild.on('exit', (code) => {
  shutdown(code ?? 0);
});
