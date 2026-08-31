import path from 'node:path';

import { fileExists } from '../fs_util.ts';
import { ensureDir } from '../paths.ts';
import { runCommand } from '../subprocess.ts';

const SLIDE_SECONDS = 2.5;

export async function renderBeatPosterSlideshow(params: {
  imagePaths: string[];
  outputPath: string;
  abortKey?: string;
}): Promise<string> {
  if (!params.imagePaths.length) {
    throw new Error('Slideshow needs at least one poster PNG');
  }
  const tempDir = await Deno.makeTempDir({ prefix: 'poster-slideshow-' });
  try {
    for (const [index, source] of params.imagePaths.entries()) {
      if (!fileExists(source)) {
        throw new Error(`Missing poster for slideshow: ${path.basename(source)}`);
      }
      Deno.copyFileSync(
        source,
        path.join(tempDir, `${String(index).padStart(3, '0')}.png`),
      );
    }
    ensureDir(path.dirname(params.outputPath));
    await runCommand('ffmpeg', [
      '-y',
      '-framerate',
      `1/${SLIDE_SECONDS}`,
      '-i',
      path.join(tempDir, '%03d.png'),
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf',
      'scale=1080:1440:force_original_aspect_ratio=decrease,pad=1080:1440:(ow-iw)/2:(oh-ih)/2:color=0x020617,fps=30,format=yuv420p',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      params.outputPath,
    ], params.abortKey ? { abortKey: params.abortKey } : undefined);
    if (!fileExists(params.outputPath)) {
      throw new Error('ffmpeg did not produce the poster slideshow');
    }
    return params.outputPath;
  } finally {
    try {
      Deno.removeSync(tempDir, { recursive: true });
    } catch {
      // temp cleanup is best-effort
    }
  }
}
