import path from 'node:path';

import { runCommand } from './subprocess.ts';

export type IndexTtsHealthSnapshot = {
  ok: boolean;
  url: string;
  loaded?: boolean;
  device?: string;
  error?: string;
};

export type IndexTtsCloneOptions = {
  text: string;
  referenceAudioPath: string;
  outputPath: string;
};

function indexTtsUrl(): string {
  return (Deno.env.get('INDEX_TTS_URL') ?? 'http://127.0.0.1:8792').replace(/\/+$/, '');
}

export async function checkIndexTtsHealth(): Promise<IndexTtsHealthSnapshot> {
  const url = indexTtsUrl();
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      return { ok: false, url, error: `IndexTTS health ${response.status}` };
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

export async function ensureIndexTtsServer(options: { maxWaitMs?: number } = {}): Promise<void> {
  const maxWaitMs = options.maxWaitMs ?? 120_000;
  const deadline = Date.now() + maxWaitMs;
  let lastError = 'connection refused';
  while (Date.now() < deadline) {
    const health = await checkIndexTtsHealth();
    if (health.ok && health.loaded) {
      return;
    }
    lastError = health.error ?? 'unreachable';
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    `IndexTTS server not reachable at ${indexTtsUrl()} (${lastError}) — run npm run outdoor:all`,
  );
}

export async function cloneIndexTtsAudio(options: IndexTtsCloneOptions): Promise<void> {
  const response = await fetch(`${indexTtsUrl()}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: options.text,
      referenceAudioPath: options.referenceAudioPath,
      outputPath: options.outputPath,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `IndexTTS clone failed (${response.status})`;
    throw new Error(message);
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
  return Math.round((Number.isFinite(value) && value > 0 ? value : 0.5) * 1000) / 1000;
}

export function indexTtsRoot(): string {
  return (Deno.env.get('INDEX_TTS_ROOT') ?? path.join(Deno.env.get('HOME') ?? '', 'index-tts')).trim();
}
