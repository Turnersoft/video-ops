import path from 'node:path';

import { readAnimationMd } from '../animation-md.ts';
import { fileExists, readJson, writeJson } from '../fs_util.ts';
import { buildLiveScript } from '../live-script.ts';
import {
  ensureDir,
  scriptBeatPostersDir,
  scriptBeatPostersManifestPath,
  seriesDirFor,
  seriesForScriptId,
} from '../paths.ts';
import { nowIso } from '../schema.ts';
import { screenshotHtmlFile } from '../social-cards/render.ts';
import { buildBeatPosterCoverSpec, buildBeatPosterSpec, parseAnimationFrontmatter } from './content.ts';
import { buildBeatPosterCoverHtml, buildBeatPosterHtml } from './template.ts';
import { readBeatPosterMd } from './poster-md.ts';
import { beatPosterMdEntryFor, parseBeatPosterMd } from '../../../../src/beatPosterMd.ts';
import type {
  BeatPosterFile,
  BeatPosterLang,
  BeatPosterListItem,
  BeatPostersManifest,
} from './types.ts';
import { BEAT_POSTER_COVER_ID, BEAT_POSTER_HEIGHT, BEAT_POSTER_WIDTH } from './types.ts';

function posterFileName(beatId: string, lang: BeatPosterLang): string {
  return `${beatId}-${lang}`;
}

function loadSeriesTitle(scriptId: string): string {
  const seriesId = seriesForScriptId(scriptId);
  const metaPath = path.join(seriesDirFor(seriesId), 'series.json');
  if (fileExists(metaPath)) {
    try {
      const meta = readJson<{ title?: string }>(metaPath);
      if (meta.title?.trim()) {
        return meta.title.trim();
      }
    } catch {
      // fall through
    }
  }
  return 'Turn-Lang';
}

function emptyManifest(scriptId: string): BeatPostersManifest {
  return {
    schemaVersion: 1,
    scriptId,
    updatedAt: nowIso(),
    beatCount: 0,
    posters: [],
  };
}

function loadManifest(scriptId: string): BeatPostersManifest {
  const manifestPath = scriptBeatPostersManifestPath(scriptId);
  if (!fileExists(manifestPath)) {
    return emptyManifest(scriptId);
  }
  const raw = readJson<Partial<BeatPostersManifest>>(manifestPath);
  return {
    schemaVersion: 1,
    scriptId,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso(),
    beatCount: typeof raw.beatCount === 'number' ? raw.beatCount : 0,
    posters: Array.isArray(raw.posters) ? raw.posters : [],
  };
}

function saveManifest(scriptId: string, manifest: BeatPostersManifest): void {
  ensureDir(scriptBeatPostersDir(scriptId));
  writeJson(scriptBeatPostersManifestPath(scriptId), manifest);
}

function posterAssetUrl(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
  ext: 'png' | 'html',
): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/${encodeURIComponent(beatId)}/${lang}/${ext}`;
}

export async function generateBeatPoster(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): Promise<BeatPosterFile> {
  const live = await buildLiveScript(scriptId);
  if (!live?.beats.length) {
    throw new Error(`No beats found for ${scriptId} — sync animation.md first`);
  }
  const beat = live.beats.find((entry) => entry.id === beatId);
  if (!beat) {
    throw new Error(`Beat not found: ${beatId}`);
  }

  const md = readAnimationMd(scriptId);
  const frontmatter = md.exists ? parseAnimationFrontmatter(md.markdown) : {};
  const seriesTitle = loadSeriesTitle(scriptId);
  const nextBeat = live.beats.find((entry) => entry.index === beat.index + 1) ?? null;
  const posterMd = readBeatPosterMd(scriptId);
  const posterDoc = posterMd.exists ? parseBeatPosterMd(posterMd.markdown) : null;
  const spec = buildBeatPosterSpec({
    scriptId,
    beat,
    nextBeat,
    lang,
    seriesTitle,
    episodeTitleEn: frontmatter.socialTitleEnglish ?? live.title,
    episodeTitleZh: frontmatter.socialTitleChina ?? frontmatter.socialTitleEnglish ?? live.title,
    poster: beatPosterMdEntryFor(posterDoc, beat.index),
  });

  const dir = scriptBeatPostersDir(scriptId);
  ensureDir(dir);
  const baseName = posterFileName(beatId, lang);
  const htmlPath = path.join(dir, `${baseName}.html`);
  const pngPath = path.join(dir, `${baseName}.png`);
  Deno.writeTextFileSync(htmlPath, buildBeatPosterHtml(spec));
  await screenshotHtmlFile(htmlPath, pngPath, spec.width, spec.height);
  try {
    const { exportBeatPosterPreviewJpeg } = await import('./preview-jpeg.ts');
    await exportBeatPosterPreviewJpeg(scriptId, beatId, lang);
  } catch {
    // preview JPEG is best-effort for the web UI
  }

  const createdAt = nowIso();
  const entry: BeatPosterFile = {
    beatId,
    beatIndex: beat.index,
    lang,
    width: spec.width,
    height: spec.height,
    htmlPath,
    pngPath,
    createdAt,
  };

  const manifest = loadManifest(scriptId);
  const key = `${beatId}:${lang}`;
  manifest.posters = manifest.posters.filter(
    (poster) => `${poster.beatId}:${poster.lang}` !== key,
  );
  manifest.posters.push(entry);
  manifest.beatCount = live.beats.length;
  manifest.updatedAt = createdAt;
  saveManifest(scriptId, manifest);
  return entry;
}

export async function generateBeatPosterCover(
  scriptId: string,
  lang: BeatPosterLang,
): Promise<BeatPosterFile> {
  const live = await buildLiveScript(scriptId);
  if (!live?.beats.length) {
    throw new Error(`No beats found for ${scriptId} — sync animation.md first`);
  }

  const md = readAnimationMd(scriptId);
  const frontmatter = md.exists ? parseAnimationFrontmatter(md.markdown) : {};
  const seriesTitle = loadSeriesTitle(scriptId);
  const spec = buildBeatPosterCoverSpec({
    scriptId,
    lang,
    seriesTitle,
    episodeTitleEn: frontmatter.socialTitleEnglish ?? live.title,
    episodeTitleZh: frontmatter.socialTitleChina ?? frontmatter.socialTitleEnglish ?? live.title,
    promotionalDescriptionEn: frontmatter.promotionalDescription,
    promotionalDescriptionZh: frontmatter.promotionalDescriptionChina,
    beatCount: live.beats.length,
  });

  const dir = scriptBeatPostersDir(scriptId);
  ensureDir(dir);
  const baseName = posterFileName(BEAT_POSTER_COVER_ID, lang);
  const htmlPath = path.join(dir, `${baseName}.html`);
  const pngPath = path.join(dir, `${baseName}.png`);
  Deno.writeTextFileSync(htmlPath, buildBeatPosterCoverHtml(spec));
  await screenshotHtmlFile(htmlPath, pngPath, spec.width, spec.height);
  try {
    const { exportBeatPosterPreviewJpeg } = await import('./preview-jpeg.ts');
    await exportBeatPosterPreviewJpeg(scriptId, BEAT_POSTER_COVER_ID, lang);
  } catch {
    // preview JPEG is best-effort for the web UI
  }

  const createdAt = nowIso();
  const entry: BeatPosterFile = {
    beatId: BEAT_POSTER_COVER_ID,
    beatIndex: -1,
    lang,
    width: spec.width,
    height: spec.height,
    htmlPath,
    pngPath,
    createdAt,
  };

  const manifest = loadManifest(scriptId);
  const key = `${BEAT_POSTER_COVER_ID}:${lang}`;
  manifest.posters = manifest.posters.filter(
    (poster) => `${poster.beatId}:${poster.lang}` !== key,
  );
  manifest.posters.push(entry);
  manifest.beatCount = live.beats.length;
  manifest.updatedAt = createdAt;
  saveManifest(scriptId, manifest);
  return entry;
}

function decodePngBase64(value: string): Uint8Array {
  const raw = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Save a PNG captured from the live React preview (same CSS as the UI). */
export async function saveUploadedBeatPosterPng(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
  pngBase64: string,
): Promise<BeatPosterFile> {
  const live = await buildLiveScript(scriptId);
  if (!live?.beats.length) {
    throw new Error(`No beats found for ${scriptId}`);
  }
  if (beatId !== BEAT_POSTER_COVER_ID && !live.beats.some((beat) => beat.id === beatId)) {
    throw new Error(`Beat not found: ${beatId}`);
  }

  const bytes = decodePngBase64(pngBase64);
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
    throw new Error('pngBase64 is not a PNG');
  }

  const dir = scriptBeatPostersDir(scriptId);
  ensureDir(dir);
  const baseName = posterFileName(beatId, lang);
  const htmlPath = path.join(dir, `${baseName}.html`);
  const pngPath = path.join(dir, `${baseName}.png`);
  Deno.writeFileSync(pngPath, bytes);
  try {
    const { exportBeatPosterPreviewJpeg } = await import('./preview-jpeg.ts');
    await exportBeatPosterPreviewJpeg(scriptId, beatId, lang);
  } catch {
    // preview JPEG is best-effort for the web UI
  }

  const beatIndex = beatId === BEAT_POSTER_COVER_ID
    ? -1
    : (live.beats.find((beat) => beat.id === beatId)?.index ?? 0);
  const createdAt = nowIso();
  const entry: BeatPosterFile = {
    beatId,
    beatIndex,
    lang,
    width: BEAT_POSTER_WIDTH,
    height: BEAT_POSTER_HEIGHT,
    htmlPath,
    pngPath,
    createdAt,
  };

  const manifest = loadManifest(scriptId);
  const key = `${beatId}:${lang}`;
  manifest.posters = manifest.posters.filter(
    (poster) => `${poster.beatId}:${poster.lang}` !== key,
  );
  manifest.posters.push(entry);
  manifest.beatCount = live.beats.length;
  manifest.updatedAt = createdAt;
  saveManifest(scriptId, manifest);
  return entry;
}

export async function generateAllBeatPosters(scriptId: string): Promise<BeatPostersManifest> {
  const live = await buildLiveScript(scriptId);
  if (!live?.beats.length) {
    throw new Error(`No beats found for ${scriptId}`);
  }
  for (const lang of ['en', 'zh'] as BeatPosterLang[]) {
    await generateBeatPosterCover(scriptId, lang);
  }
  for (const beat of live.beats) {
    for (const lang of ['en', 'zh'] as BeatPosterLang[]) {
      await generateBeatPoster(scriptId, beat.id, lang);
    }
  }
  return loadManifest(scriptId);
}

export function resolveBeatPosterFile(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): BeatPosterFile | null {
  const manifest = loadManifest(scriptId);
  const entry = manifest.posters.find(
    (poster) => poster.beatId === beatId && poster.lang === lang,
  );
  if (!entry || !fileExists(entry.pngPath)) {
    return null;
  }
  return entry;
}

export function readBeatPosterAsset(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
  ext: 'png' | 'html',
): { filePath: string } | null {
  const manifest = loadManifest(scriptId);
  const entry = manifest.posters.find(
    (poster) => poster.beatId === beatId && poster.lang === lang,
  );
  if (!entry) {
    return null;
  }
  const filePath = ext === 'png' ? entry.pngPath : entry.htmlPath;
  if (!fileExists(filePath)) {
    return null;
  }
  return { filePath };
}

export async function listBeatPosters(scriptId: string): Promise<{
  manifest: BeatPostersManifest;
  beats: Array<{
    id: string;
    index: number;
    title: string;
    hasEn: boolean;
    hasZh: boolean;
  }>;
  posters: BeatPosterListItem[];
}> {
  const live = await buildLiveScript(scriptId);
  const manifest = loadManifest(scriptId);
  const titleByBeatId = new Map(
    (live?.beats ?? []).map((beat) => [beat.id, beat.title.trim() || `Beat ${beat.index + 1}`]),
  );
  titleByBeatId.set(BEAT_POSTER_COVER_ID, 'Cover');

  const posters: BeatPosterListItem[] = manifest.posters
    .filter((poster) => fileExists(poster.pngPath))
    .map((poster) => ({
      ...poster,
      beatTitle: titleByBeatId.get(poster.beatId) ?? poster.beatId,
      pngUrl: posterAssetUrl(scriptId, poster.beatId, poster.lang, 'png'),
      htmlUrl: posterAssetUrl(scriptId, poster.beatId, poster.lang, 'html'),
    }));

  const beats = (live?.beats ?? []).map((beat) => ({
    id: beat.id,
    index: beat.index,
    title: beat.title.trim() || `Beat ${beat.index + 1}`,
    hasEn: Boolean(resolveBeatPosterFile(scriptId, beat.id, 'en')),
    hasZh: Boolean(resolveBeatPosterFile(scriptId, beat.id, 'zh')),
  }));

  return { manifest, beats, posters };
}

export async function buildBeatPosterCaption(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): Promise<{ title: string; body: string }> {
  const live = await buildLiveScript(scriptId);
  if (!live) {
    throw new Error(`Script not found: ${scriptId}`);
  }
  const beat = live.beats.find((entry) => entry.id === beatId);
  if (!beat) {
    throw new Error(`Beat not found: ${beatId}`);
  }
  const md = readAnimationMd(scriptId);
  const frontmatter = md.exists ? parseAnimationFrontmatter(md.markdown) : {};
  const episode = lang === 'zh'
    ? (frontmatter.socialTitleChina ?? live.title)
    : (frontmatter.socialTitleEnglish ?? live.title);
  const hook = lang === 'zh'
    ? (beat.chinese.trim() || beat.say.trim())
    : beat.say.trim();
  const footer = lang === 'zh'
    ? '完整逐拍系列见 turn-lang.com'
    : 'Full beat-by-beat series at turn-lang.com';
  const hashtags = lang === 'zh'
    ? '#TurnLang #Lean4 #形式化数学 #证明助手'
    : '#TurnLang #Lean4 #FormalMethods #ProofAssistant';
  return {
    title: `${episode} · ${beat.title}`.slice(0, 120),
    body: `${hook.slice(0, 500)}\n\n${footer}\n\n${hashtags}`,
  };
}
