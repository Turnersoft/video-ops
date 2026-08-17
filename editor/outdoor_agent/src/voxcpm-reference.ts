import path from 'node:path';
import { createHash } from 'node:crypto';

import { scanVideoOpsCatalog } from './catalog.ts';
import { fileExists } from './fs_util.ts';
import { ensureDir, takeSourceVideoPath, VIDEO_OPS_ROOT } from './paths.ts';
import { runCommand } from './subprocess.ts';
import { VOXCPM_REFERENCE_MAX_SECONDS } from './voxcpm-config.ts';

export type VoxcpmReferenceOptions = {
  referenceTakeId?: string;
  referenceAudioPath?: string;
};

export function resolveVoxcpmReferenceAudio(
  scriptId: string,
  options: VoxcpmReferenceOptions,
): string {
  if (options.referenceAudioPath?.trim()) {
    const resolved = path.resolve(options.referenceAudioPath);
    if (!fileExists(resolved)) {
      throw new Error(`Reference audio not found: ${resolved}`);
    }
    return resolved;
  }
  if (options.referenceTakeId?.trim()) {
    const fromTake = takeSourceVideoPath(scriptId, options.referenceTakeId.trim());
    if (!fileExists(fromTake)) {
      throw new Error(`Reference take has no source video: ${options.referenceTakeId}`);
    }
    return fromTake;
  }
  const catalog = scanVideoOpsCatalog();
  const script = catalog.scripts.find((entry) => entry.scriptId === scriptId);
  const withSource = script?.takes?.find((take) => take.hasSourceVideo);
  if (withSource) {
    return takeSourceVideoPath(scriptId, withSource.takeId);
  }
  throw new Error(
    'No reference voice — film a take first or pass referenceTakeId with source video',
  );
}

function referenceClipCachePath(sourcePath: string, maxSeconds: number): string {
  const stat = Deno.statSync(sourcePath);
  const digest = createHash('sha256')
    .update(
      `${path.resolve(sourcePath)}\n${stat.size}\n${stat.mtime?.getTime() ?? 0}\n${maxSeconds}`,
    )
    .digest('hex')
    .slice(0, 20);
  const directory = path.join(VIDEO_OPS_ROOT, '.cache', 'voxcpm-reference-clips');
  ensureDir(directory);
  return path.join(directory, `ref-${digest}-${maxSeconds}s.wav`);
}

/** Mono 16 kHz reference clip for voice cloning. maxSeconds <= 0 uses the full source. */
export async function resolveVoxcpmReferenceClip(
  scriptId: string,
  options: VoxcpmReferenceOptions,
  maxSeconds: number = VOXCPM_REFERENCE_MAX_SECONDS,
): Promise<string> {
  const sourcePath = resolveVoxcpmReferenceAudio(scriptId, options);
  if (!(maxSeconds > 0)) {
    return sourcePath;
  }
  const clampedSeconds = Math.min(120, Math.max(3, maxSeconds));
  const cached = referenceClipCachePath(sourcePath, clampedSeconds);
  if (fileExists(cached)) {
    return cached;
  }
  const temporaryPath = `${cached}.${crypto.randomUUID()}.tmp.wav`;
  await runCommand('ffmpeg', [
    '-y',
    '-i',
    sourcePath,
    '-t',
    clampedSeconds.toFixed(3),
    '-ac',
    '1',
    '-ar',
    '16000',
    temporaryPath,
  ]);
  Deno.renameSync(temporaryPath, cached);
  return cached;
}
