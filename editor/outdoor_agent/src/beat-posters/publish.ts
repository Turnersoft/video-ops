import path from 'node:path';

import { fileExists, readJson, writeJson } from '../fs_util.ts';
import { buildLiveScript } from '../live-script.ts';
import { readAnimationMd } from '../animation-md.ts';
import {
  postizIntegrationIdFor,
  postizPublishMode,
  POSTIZ_IMAGE_PLATFORMS,
  publishImagesAlbumToPostiz,
  deletePostizPost,
} from '../publish/postiz.ts';
import {
  publishNoteAlbumToSau,
  sauPublishMode,
} from '../publish/sau.ts';
import { scriptBeatPosterPublishStatePath, scriptDirFor } from '../paths.ts';
import { parseAnimationFrontmatter } from './content.ts';
import {
  buildBeatPosterPlatformPreviews,
  BEAT_POSTER_SAU_NOTE_PLATFORMS,
  isBeatPosterPostizPlatform,
  isBeatPosterSauNotePlatform,
  loadInfographicCopyFromSocial,
  listBeatPosterReviewPlatforms,
  type BeatPosterSocialPostsFile,
} from '../../../../src/beatPosterPublishPreview.ts';
import { beatPosterPreviewJpegUrl } from './preview-jpeg.ts';
import {
  generateBeatPoster,
  generateBeatPosterCover,
  listBeatPosters,
} from './generate.ts';
import type {
  BeatPosterLang,
  BeatPosterPublishPreview,
  BeatPosterPublishRecord,
  BeatPosterPublishState,
} from './types.ts';
import { BEAT_POSTER_COVER_ID } from './types.ts';
import type { PublishVisibility } from '../schema.ts';

const ALBUM_BEAT_ID = 'album';

function emptyPublishState(scriptId: string): BeatPosterPublishState {
  return { schemaVersion: 1, scriptId, posts: [] };
}

function loadPublishState(scriptId: string): BeatPosterPublishState {
  const statePath = scriptBeatPosterPublishStatePath(scriptId);
  if (!fileExists(statePath)) {
    return emptyPublishState(scriptId);
  }
  const raw = readJson<Partial<BeatPosterPublishState>>(statePath);
  return {
    schemaVersion: 1,
    scriptId,
    posts: Array.isArray(raw.posts) ? raw.posts : [],
  };
}

function savePublishState(state: BeatPosterPublishState): void {
  writeJson(scriptBeatPosterPublishStatePath(state.scriptId), state);
}

function publishKey(platform: string, lang: BeatPosterLang): string {
  return `${platform}:${ALBUM_BEAT_ID}:${lang}`;
}

export function listBeatPosterPlatforms(): string[] {
  return [...POSTIZ_IMAGE_PLATFORMS, ...BEAT_POSTER_SAU_NOTE_PLATFORMS];
}

export function listBeatPosterPublishPlatforms(lang: BeatPosterLang): string[] {
  return lang === 'zh'
    ? [...BEAT_POSTER_SAU_NOTE_PLATFORMS]
    : [...POSTIZ_IMAGE_PLATFORMS];
}

export { listBeatPosterReviewPlatforms };

function readSocialPostsFile(scriptId: string): BeatPosterSocialPostsFile | null {
  const socialPath = path.join(scriptDirFor(scriptId), 'social-posts.json');
  if (!fileExists(socialPath)) {
    return null;
  }
  return readJson<BeatPosterSocialPostsFile>(socialPath);
}

function copyFallbacks(scriptId: string): {
  socialTitleEnglish?: string;
  socialTitleChina?: string;
  promotionalDescription?: string;
  promotionalDescriptionChina?: string;
  scriptTitle?: string;
} {
  const md = readAnimationMd(scriptId);
  const frontmatter = md.exists ? parseAnimationFrontmatter(md.markdown) : {};
  return {
    socialTitleEnglish: frontmatter.socialTitleEnglish,
    socialTitleChina: frontmatter.socialTitleChina,
    promotionalDescription: frontmatter.promotionalDescription,
    promotionalDescriptionChina: frontmatter.promotionalDescriptionChina,
    scriptTitle: frontmatter.title,
  };
}

function loadInfographicCopy(
  scriptId: string,
  platform: string,
  lang: BeatPosterLang,
  imageCount: number,
): { title: string; body: string } {
  return loadInfographicCopyFromSocial({
    social: readSocialPostsFile(scriptId),
    platform,
    lang,
    imageCount,
    fallbacks: copyFallbacks(scriptId),
    scriptId,
  });
}

function sortedAlbumPosters<T extends { beatIndex: number }>(posters: T[]): T[] {
  return [...posters].sort((a, b) => a.beatIndex - b.beatIndex);
}

export async function buildBeatPosterPublishPreview(
  scriptId: string,
  lang: BeatPosterLang,
): Promise<BeatPosterPublishPreview> {
  const payload = await listBeatPosters(scriptId);
  const posters = sortedAlbumPosters(
    payload.posters.filter((poster) => poster.lang === lang),
  );
  const imageUrls = posters.map((poster) =>
    beatPosterPreviewJpegUrl(scriptId, poster.beatId, lang),
  );
  const beatCount = payload.beats.length;

  const platforms = buildBeatPosterPlatformPreviews({
    scriptId,
    lang,
    beatCount,
    imageUrls,
    social: readSocialPostsFile(scriptId),
    fallbacks: copyFallbacks(scriptId),
  });

  return { scriptId, lang, beatCount, platforms };
}

export async function publishBeatPosterAlbum(params: {
  scriptId: string;
  lang: BeatPosterLang;
  platform: string;
}): Promise<{ publishState: BeatPosterPublishState; record: BeatPosterPublishRecord }> {
  const { scriptId, lang, platform } = params;
  if (lang === 'en' && !isBeatPosterPostizPlatform(platform)) {
    throw new Error(`${platform} is not a Postiz infographic platform for English albums`);
  }
  if (lang === 'zh' && !isBeatPosterSauNotePlatform(platform)) {
    throw new Error(`${platform} is not a SAU note platform for 中文 albums — use manual upload`);
  }
  if (lang === 'zh' && isBeatPosterPostizPlatform(platform)) {
    throw new Error(`${platform} uses Postiz for English albums only — switch language to EN`);
  }
  if (lang === 'en' && isBeatPosterSauNotePlatform(platform)) {
    throw new Error(`${platform} uses SAU for 中文 albums — switch language to 中文`);
  }

  const state = loadPublishState(scriptId);
  const key = publishKey(platform, lang);
  const existing = state.posts.find(
    (entry) =>
      publishKey(entry.platform, entry.lang) === key &&
      (entry.status === 'live' || entry.status === 'pending'),
  );
  if (existing) {
    throw new Error(
      `Already published ${lang} infographic album to ${platform} — hide/delete in creator studio first`,
    );
  }

  const live = await buildLiveScript(scriptId);
  if (!live?.beats.length) {
    throw new Error(`No beats found for ${scriptId}`);
  }

  const imagePaths: string[] = [];
  const cover = await generateBeatPosterCover(scriptId, lang);
  imagePaths.push(cover.pngPath);
  for (const beat of live.beats) {
    const poster = await generateBeatPoster(scriptId, beat.id, lang);
    imagePaths.push(poster.pngPath);
  }

  const preview = await buildBeatPosterPublishPreview(scriptId, lang);
  const platformPreview = preview.platforms.find((entry) => entry.platform === platform);
  const fallbackCopy = loadInfographicCopy(
    scriptId,
    platform,
    lang,
    preview.platforms[0]?.imageCount ?? imagePaths.length,
  );
  const copy = platformPreview ?? { title: fallbackCopy.title, body: fallbackCopy.body };

  let record: {
    postId: string;
    url: string;
    status: PublishVisibility;
    publishedAt: string;
    stub?: boolean;
  };

  if (isBeatPosterPostizPlatform(platform)) {
    if (postizPublishMode() !== 'live') {
      throw new Error('Postiz is in stub mode — enable live on #/platforms');
    }
    if (!postizIntegrationIdFor(platform)) {
      throw new Error(`No Postiz integration for ${platform} — Sync on #/platforms`);
    }
    record = await publishImagesAlbumToPostiz({
      platform,
      imagePaths,
      title: copy.title,
      description: platformPreview?.body ?? copy.body,
      jobId: `script-${scriptId}`,
      compositeRunId: null,
    });
  } else if (isBeatPosterSauNotePlatform(platform)) {
    if (sauPublishMode() !== 'live') {
      throw new Error('SAU is in stub mode — enable live on #/platforms');
    }
    const sauResult = await publishNoteAlbumToSau({
      platform,
      imagePaths,
      title: copy.title,
      note: platformPreview?.body ?? copy.body,
      jobId: `script-${scriptId}`,
    });
    record = {
      postId: sauResult.postId,
      url: sauResult.url,
      status: sauResult.status,
      publishedAt: sauResult.publishedAt,
      stub: sauResult.stub,
    };
  } else {
    throw new Error(`${platform} does not support automated infographic album publish`);
  }

  state.posts.push({
    platform,
    beatId: ALBUM_BEAT_ID,
    lang,
    postId: record.postId,
    url: record.url,
    status: record.status === 'pending' ? 'pending' : record.status === 'failed' ? 'failed' : 'live',
    publishedAt: record.publishedAt,
    imageCount: imagePaths.length,
    stub: record.stub,
  });
  savePublishState(state);
  const savedRecord = state.posts[state.posts.length - 1];
  return { publishState: state, record: savedRecord };
}

export type BeatPosterPublishAllOutcome = {
  publishState: BeatPosterPublishState;
  published: Array<{
    platform: string;
    postId: string;
    url: string;
    status: 'pending' | 'live';
  }>;
  failed: Array<{
    platform: string;
    error: string;
    step?: string;
    hint?: string;
    details?: string;
  }>;
  skipped: Array<{ platform: string; reason: string }>;
};

export async function publishBeatPosterAlbumAll(
  scriptId: string,
  lang: BeatPosterLang,
): Promise<BeatPosterPublishAllOutcome> {
  let state = loadPublishState(scriptId);
  const published: BeatPosterPublishAllOutcome['published'] = [];
  const failed: BeatPosterPublishAllOutcome['failed'] = [];
  const skipped: BeatPosterPublishAllOutcome['skipped'] = [];
  for (const platform of listBeatPosterPublishPlatforms(lang)) {
    const key = publishKey(platform, lang);
    const existing = state.posts.find(
      (entry) =>
        publishKey(entry.platform, entry.lang) === key &&
        (entry.status === 'live' || entry.status === 'pending'),
    );
    if (existing) {
      skipped.push({ platform, reason: 'Already published' });
      continue;
    }
    try {
      const outcome = await publishBeatPosterAlbum({ scriptId, lang, platform });
      state = outcome.publishState;
      published.push({
        platform,
        postId: outcome.record.postId,
        url: outcome.record.url,
        status: outcome.record.status === 'pending' ? 'pending' : 'live',
      });
    } catch (error) {
      const payload = beatPosterPublishErrorPayload(platform, error);
      failed.push({
        platform,
        error: payload.error,
        step: payload.step,
        hint: payload.hint,
        details: payload.details,
      });
    }
  }
  return { publishState: state, published, failed, skipped };
}

export function getBeatPosterPublishState(scriptId: string): BeatPosterPublishState {
  return loadPublishState(scriptId);
}

export async function revertBeatPosterAlbumPublish(params: {
  scriptId: string;
  platform: string;
  lang: BeatPosterLang;
}): Promise<{ publishState: BeatPosterPublishState; removed: BeatPosterPublishRecord | null }> {
  const { scriptId, platform, lang } = params;
  const state = loadPublishState(scriptId);
  const key = publishKey(platform, lang);
  const index = state.posts.findIndex(
    (entry) => publishKey(entry.platform, entry.lang) === key,
  );
  if (index === -1) {
    throw new Error(`No ${lang} infographic album publish record for ${platform}`);
  }
  const [removed] = state.posts.splice(index, 1);
  if (removed.postId && postizPublishMode() === 'live' && !removed.stub && isBeatPosterPostizPlatform(platform)) {
    try {
      await deletePostizPost(removed.postId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/not found|404/i.test(message)) {
        state.posts.splice(index, 0, removed);
        savePublishState(state);
        throw new Error(`Postiz delete failed — local record kept: ${message}`);
      }
    }
  }
  savePublishState(state);
  return { publishState: state, removed };
}

export function beatPosterPublishErrorPayload(
  platform: string,
  error: unknown,
): {
  error: string;
  platform: string;
  step: string;
  hint?: string;
  details: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  let step = 'publish';
  if (lower.includes('stub mode') || lower.includes('integration')) {
    step = isBeatPosterSauNotePlatform(platform) ? 'sau_config' : 'postiz_config';
  } else if (lower.includes('already published')) {
    step = 'duplicate_check';
  } else if (lower.includes('no beats') || lower.includes('png')) {
    step = 'prepare_album';
  } else if (lower.includes('upload')) {
    step = 'upload_images';
  } else if (lower.includes('postiz http')) {
    step = 'submit_post';
  }

  let hint: string | undefined;
  if (lower.includes('stub mode')) {
    hint = isBeatPosterSauNotePlatform(platform)
      ? 'Open #/platforms → switch SAU from stub to live mode, then retry.'
      : 'Open #/platforms → switch Postiz from stub to live mode, then retry.';
  } else if (lower.includes('integration')) {
    hint = `Open #/platforms → Sync Postiz integrations → connect ${platform}.`;
  } else if (lower.includes('already published')) {
    hint = 'Hide or delete the existing Postiz post for this album, then retry.';
  } else if (lower.includes('no beats')) {
    hint = 'Generate infographics (cover + beats) before publishing.';
  } else if (lower.includes('postiz http 401') || lower.includes('postiz http 403')) {
    hint = 'Postiz API key is invalid or expired. Update POSTIZ_API_KEY on #/platforms.';
  } else if (lower.includes('postiz http')) {
    hint = 'Postiz rejected the request. Check Postiz dashboard logs and platform connection.';
  }

  return {
    error: message,
    platform,
    step,
    hint,
    details: message,
  };
}
