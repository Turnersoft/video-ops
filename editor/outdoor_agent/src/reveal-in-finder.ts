import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { fileExists } from './fs_util.ts';
import { VIDEO_OPS_ROOT } from './paths.ts';

const execFileAsync = promisify(execFile);

function isUnderRoot(filePath: string, root: string): boolean {
  const resolved = path.resolve(filePath);
  const resolvedRoot = path.resolve(root);
  return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`);
}

export async function revealPathInFinder(filePath: string): Promise<void> {
  if (!fileExists(filePath)) {
    throw new Error('File not found');
  }
  if (!isUnderRoot(filePath, VIDEO_OPS_ROOT)) {
    throw new Error('Path outside video_ops root');
  }
  if (Deno.build.os !== 'darwin') {
    throw new Error('Reveal in Finder is only supported on macOS');
  }
  await execFileAsync('open', ['-R', filePath]);
}
