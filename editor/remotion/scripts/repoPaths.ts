import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const remotionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveVideoOpsRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (
      fs.existsSync(path.join(dir, 'manifest.json')) &&
      (fs.existsSync(path.join(dir, 'projects')) || fs.existsSync(path.join(dir, 'scripts')))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return path.resolve(startDir, '../..');
}

export const VIDEO_OPS_ROOT = resolveVideoOpsRoot(remotionDir);
export const REMOTION_ROOT = remotionDir;
export const TURN_USER_ROOT = path.resolve(VIDEO_OPS_ROOT, '../codetree/turn/turn-user');
