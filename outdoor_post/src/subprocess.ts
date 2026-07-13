import path from 'node:path';

import { OUTDOOR_POST_ROOT } from './paths.ts';

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
