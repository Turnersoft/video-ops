import path from 'node:path';
import os from 'node:os';

import { OUTDOOR_POST_ROOT } from './paths.ts';

export function resolveCaptionTranslatePython(): string {
  const explicit = Deno.env.get('CAPTION_TRANSLATE_PYTHON')?.trim();
  if (explicit) {
    return explicit;
  }
  const indexTtsRoot = Deno.env.get('INDEX_TTS_ROOT')?.trim() || path.join(os.homedir(), 'index-tts');
  const indexTtsPython = path.join(indexTtsRoot, '.venv', 'bin', 'python');
  try {
    Deno.statSync(indexTtsPython);
    return indexTtsPython;
  } catch {
    return 'python3';
  }
}

export function runFfmpeg(args: string[]): void {
  const command = new Deno.Command('ffmpeg', {
    args,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const { code } = command.outputSync();
  if (code !== 0) {
    throw new Error(`ffmpeg ${args.join(' ')} failed (exit ${code})`);
  }
}

export function runCommandOutput(bin: string, args: string[]): string {
  const command = new Deno.Command(bin, {
    args,
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  });
  const { code, stdout, stderr } = command.outputSync();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);
  if (code !== 0) {
    throw new Error(`${bin} ${args.join(' ')} failed: ${err || out || `exit ${code}`}`);
  }
  return out.trim();
}

export function probeDurationSeconds(videoPath: string): number {
  const raw = runCommandOutput('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]);
  const seconds = Number.parseFloat(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Could not read duration from ${videoPath}`);
  }
  return seconds;
}

export function extractAudio(videoPath: string, audioPath: string): void {
  runFfmpeg(['-y', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', audioPath]);
}

export function transcribeLocal(audioPath: string, transcriptPath: string): Record<string, unknown> {
  const helperPath = path.join(OUTDOOR_POST_ROOT, 'transcribe-local.py');
  const raw = runCommandOutput('python3', [helperPath, audioPath]);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  Deno.writeTextFileSync(transcriptPath, `${JSON.stringify(parsed, null, 2)}\n`);
  return parsed;
}

export function runCommandJsonInput(bin: string, args: string[], input: string): Promise<string> {
  const command = new Deno.Command(bin, {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  });
  const child = command.spawn();
  return (async () => {
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    const { code, stdout, stderr } = await child.output();
    const out = new TextDecoder().decode(stdout);
    const err = new TextDecoder().decode(stderr);
    if (code !== 0) {
      throw new Error(`${bin} ${args.join(' ')} failed: ${err || out || `exit ${code}`}`);
    }
    return out.trim();
  })();
}

export async function translateCaptionsLocal(lines: string[]): Promise<string[]> {
  const helperPath = path.join(OUTDOOR_POST_ROOT, 'translate-captions-local.py');
  const python = resolveCaptionTranslatePython();
  const raw = await runCommandJsonInput(python, [helperPath], JSON.stringify({ lines }));
  const parsed = JSON.parse(raw) as { lines?: string[] };
  const out = parsed.lines ?? [];
  if (out.length !== lines.length) {
    throw new Error(
      `Local caption translate count mismatch: expected ${lines.length}, got ${out.length}.`,
    );
  }
  return out.map((line) => String(line ?? '').replace(/\s+/g, ' ').trim());
}
