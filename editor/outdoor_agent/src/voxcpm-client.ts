import path from 'node:path';

import {
  VOXCPM_CFG_VALUE,
  VOXCPM_INFERENCE_TIMESTEPS,
  VOXCPM_TEXT_CHUNK_MAX_CHARS,
} from './voxcpm-config.ts';
import { runCommand } from './subprocess.ts';

export type VoxcpmHealthSnapshot = {
  ok: boolean;
  url: string;
  loaded?: boolean;
  device?: string;
  error?: string;
};

export type VoxcpmLogsSnapshot = {
  ok: boolean;
  url: string;
  lines?: string[];
  text?: string;
  lineCount?: number;
  error?: string;
};

export type VoxcpmCloneOptions = {
  text: string;
  referenceAudioPath: string;
  outputPath: string;
  promptText?: string;
  promptWavPath?: string;
  cfgValue?: number;
  inferenceTimesteps?: number;
};

function roundSeconds(value: number): number {
  return Math.round(value * 100) / 100;
}

function voxcpmUrl(): string {
  return (Deno.env.get('VOXCPM_URL') ?? 'http://127.0.0.1:8791').replace(/\/+$/, '');
}

/** Split long spoken lines into short VoxCPM requests. */
export function chunkVoxcpmSynthesisText(
  text: string,
  maxChars: number = VOXCPM_TEXT_CHUNK_MAX_CHARS,
): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }
  if (!(maxChars > 0) || normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks: string[] = [];
  let rest = normalized;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1);
    let splitAt = -1;
    for (const delimiter of ['; ', '. ', '? ', '! ', ', ', ' — ', ' - ', ': ', ' ']) {
      const index = window.lastIndexOf(delimiter);
      if (index > Math.floor(maxChars * 0.35)) {
        splitAt = index + delimiter.length;
        break;
      }
    }
    if (splitAt <= 0) {
      splitAt = maxChars;
    }
    const piece = rest.slice(0, splitAt).trim();
    if (piece) {
      chunks.push(piece);
    }
    rest = rest.slice(splitAt).trim();
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks.length > 0 ? chunks : [normalized];
}

function concatListLine(filePath: string): string {
  return `file '${filePath.replace(/'/g, "'\\''")}'`;
}

async function concatWavSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  if (segmentPaths.length === 1) {
    Deno.copyFileSync(segmentPaths[0]!, outputPath);
    return;
  }
  const listPath = `${outputPath}.concat.txt`;
  await Deno.writeTextFile(
    listPath,
    segmentPaths.map((segmentPath) => concatListLine(segmentPath)).join('\n'),
  );
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c',
    'copy',
    outputPath,
  ]);
  await Deno.remove(listPath).catch(() => undefined);
}

async function cloneVoxcpmAudioOnce(options: VoxcpmCloneOptions): Promise<void> {
  const response = await fetch(`${voxcpmUrl()}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: options.text,
      referenceAudioPath: options.referenceAudioPath,
      outputPath: options.outputPath,
      promptText: options.promptText,
      promptWavPath: options.promptWavPath,
      cfgValue: options.cfgValue ?? VOXCPM_CFG_VALUE,
      inferenceTimesteps: options.inferenceTimesteps ?? VOXCPM_INFERENCE_TIMESTEPS,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `VoxCPM clone failed (${response.status})`;
    throw new Error(message);
  }
}

export async function fetchVoxcpmLogs(limit = 200): Promise<VoxcpmLogsSnapshot> {
  const url = voxcpmUrl();
  const capped = Math.max(1, Math.min(limit, 500));
  try {
    const response = await fetch(`${url}/logs?limit=${capped}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      return { ok: false, url, error: `VoxCPM logs ${response.status}` };
    }
    const payload = (await response.json().catch(() => ({}))) as {
      lines?: string[];
      text?: string;
      lineCount?: number;
    };
    return {
      ok: true,
      url,
      lines: payload.lines,
      text: payload.text,
      lineCount: payload.lineCount,
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkVoxcpmHealth(): Promise<VoxcpmHealthSnapshot> {
  const url = voxcpmUrl();
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      return { ok: false, url, error: `VoxCPM health ${response.status}` };
    }
    const payload = (await response.json().catch(() => ({}))) as {
      loaded?: boolean;
      device?: string;
    };
    return { ok: true, url, loaded: payload.loaded, device: payload.device };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function ensureVoxcpmServer(options: { maxWaitMs?: number } = {}): Promise<void> {
  const maxWaitMs = options.maxWaitMs ?? 60_000;
  const deadline = Date.now() + maxWaitMs;
  let lastError = 'connection refused';
  while (Date.now() < deadline) {
    const health = await checkVoxcpmHealth();
    if (health.ok) {
      return;
    }
    lastError = health.error ?? 'unreachable';
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    `VoxCPM server not reachable at ${voxcpmUrl()} (${lastError}) — run npm run outdoor:all (or npm run setup:voxcpm)`,
  );
}

export async function cloneVoxcpmAudio(options: VoxcpmCloneOptions): Promise<void> {
  const chunks = chunkVoxcpmSynthesisText(options.text);
  if (chunks.length === 0) {
    throw new Error('VoxCPM text is empty');
  }
  if (chunks.length === 1) {
    await cloneVoxcpmAudioOnce({ ...options, text: chunks[0]! });
    return;
  }

  const segmentPaths: string[] = [];
  const outputDir = path.dirname(options.outputPath);
  const outputStem = path.basename(options.outputPath, path.extname(options.outputPath));
  try {
    for (let index = 0; index < chunks.length; index += 1) {
      const segmentPath = path.join(outputDir, `.${outputStem}.chunk-${index}.wav`);
      await cloneVoxcpmAudioOnce({
        ...options,
        text: chunks[index]!,
        outputPath: segmentPath,
      });
      segmentPaths.push(segmentPath);
    }
    await concatWavSegments(segmentPaths, options.outputPath);
  } finally {
    for (const segmentPath of segmentPaths) {
      await Deno.remove(segmentPath).catch(() => undefined);
    }
  }
}

export async function probeAudioDurationSeconds(filePath: string): Promise<number> {
  const raw = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const value = Number.parseFloat(raw);
  return roundSeconds(Number.isFinite(value) && value > 0 ? value : 0.5);
}
