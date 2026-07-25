import fs from 'node:fs';
import path from 'node:path';

import { canonicalVideoOpsScriptId, videoOpsScriptDiskFolder } from './videoOpsPaths.ts';

function episodeHasAnimationMd(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'animation.md'));
}

/** Resolve episode folder on disk; legacy prefixed ids alias to the canonical folder. */
export function resolveVideoOpsScriptDiskDir(videoOpsDir: string, scriptId: string): string {
  const trimmed = scriptId.trim();
  const direct = path.join(videoOpsDir, videoOpsScriptDiskFolder(trimmed));
  if (episodeHasAnimationMd(direct)) {
    return direct;
  }
  const canonicalId = canonicalVideoOpsScriptId(trimmed);
  if (canonicalId !== trimmed) {
    const aliased = path.join(videoOpsDir, videoOpsScriptDiskFolder(canonicalId));
    if (episodeHasAnimationMd(aliased)) {
      return aliased;
    }
  }
  return direct;
}
