import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fileExists } from '../fs_util.ts';
import { runCommand } from '../subprocess.ts';
import type { BeatPosterLang } from './types.ts';
import { resolveBeatPosterFile } from './generate.ts';
import { BEAT_POSTER_COVER_ID } from './types.ts';
import { buildLiveScript } from '../live-script.ts';

const WEB_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../web',
);

export function beatPosterPreviewWebDir(scriptId: string): string {
  return path.join(WEB_ROOT, 'beat-poster-preview', scriptId);
}

export function beatPosterPreviewJpegFile(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): string {
  return path.join(beatPosterPreviewWebDir(scriptId), `${beatId}-${lang}.jpg`);
}

export function beatPosterPreviewJpegUrl(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): string {
  return `/beat-poster-preview/${encodeURIComponent(scriptId)}/${encodeURIComponent(beatId)}-${lang}.jpg`;
}

export function beatPosterPreviewAlbumJpegUrls(
  scriptId: string,
  lang: BeatPosterLang,
  beatIds: string[],
): string[] {
  return [BEAT_POSTER_COVER_ID, ...beatIds].map((beatId) =>
    beatPosterPreviewJpegUrl(scriptId, beatId, lang)
  );
}

async function pngToJpeg(pngPath: string, jpegPath: string): Promise<void> {
  await Deno.mkdir(path.dirname(jpegPath), { recursive: true });
  if (Deno.build.os === 'darwin') {
    await runCommand('sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', '85',
      pngPath,
      '--out', jpegPath,
    ]);
    return;
  }
  await runCommand('ffmpeg', ['-y', '-i', pngPath, '-q:v', '2', jpegPath]);
  if (!fileExists(jpegPath)) {
    throw new Error(`Failed to convert ${pngPath} to JPEG`);
  }
}

export async function exportBeatPosterPreviewJpeg(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): Promise<string | null> {
  const poster = resolveBeatPosterFile(scriptId, beatId, lang);
  if (!poster || !fileExists(poster.pngPath)) {
    return null;
  }
  const jpegPath = beatPosterPreviewJpegFile(scriptId, beatId, lang);
  await pngToJpeg(poster.pngPath, jpegPath);
  return jpegPath;
}

export async function syncBeatPosterPreviewJpegs(scriptId: string): Promise<{
  exported: number;
  urls: string[];
}> {
  const live = await buildLiveScript(scriptId);
  const beatIds = (live?.beats ?? []).map((beat) => beat.id);
  const targets: Array<{ beatId: string; lang: BeatPosterLang }> = [];
  for (const lang of ['en', 'zh'] as BeatPosterLang[]) {
    targets.push({ beatId: BEAT_POSTER_COVER_ID, lang });
    for (const beatId of beatIds) {
      targets.push({ beatId, lang });
    }
  }

  const urls: string[] = [];
  let exported = 0;
  for (const target of targets) {
    const jpegPath = await exportBeatPosterPreviewJpeg(scriptId, target.beatId, target.lang);
    if (jpegPath) {
      exported += 1;
      urls.push(beatPosterPreviewJpegUrl(scriptId, target.beatId, target.lang));
    }
  }
  return { exported, urls };
}
