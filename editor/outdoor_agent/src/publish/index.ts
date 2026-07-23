import path from 'node:path';

import { resolveCoverFileForPlatform } from '../covers.ts';
import { fileExists, readJson } from '../fs_util.ts';
import { loadJob, loadPublishState, saveJob, savePublishState } from '../job-store.ts';
import {
  outdoorCompositeMp4Path,
  resolveTakeFromJobId,
  takeStageRunDir,
} from '../paths.ts';
import type { OutdoorJob, PublishRecord } from '../schema.ts';
import { hideSauPost, deleteSauPost, isSauPlatform, publishToSau, SAU_PLATFORMS } from './sau.ts';
import {
  hideZernioPost,
  deleteZernioPost,
  isZernioPlatform,
  publishToZernio,
  ZERNIO_PLATFORMS,
} from './zernio.ts';

export const SUPPORTED_PLATFORMS = [...new Set([...ZERNIO_PLATFORMS, ...SAU_PLATFORMS])];

const PORTRAIT_PLATFORMS = new Set([
  'youtube',
  'instagram',
  'tiktok',
  'douyin',
  'xiaohongshu',
  'kuaishou',
]);
const LANDSCAPE_PLATFORMS = new Set(['bilibili', 'wechat_channels', 'facebook', 'linkedin']);

type SocialCopy = {
  title?: string;
  body?: string;
};

type SocialPosts = {
  titleEnglish?: string;
  titleChina?: string;
  english?: Record<string, SocialCopy>;
  china?: Record<string, SocialCopy>;
};

type PublishOptions = {
  format?: 'portrait' | 'landscape';
};

export type PublishAllResult = {
  published: Array<{ platform: string; record: PublishRecord }>;
  skippedLive: string[];
  skippedNoTitle: string[];
  failed: Array<{ platform: string; error: string }>;
};

type ReadyToPublish = {
  job: OutdoorJob;
  ref: { scriptId: string; takeId: string };
  compositeDir: string;
  socialPath: string;
  portrait: string;
  landscape: string;
};

export function providerFor(platform: string): string | null {
  if (isZernioPlatform(platform)) {
    return 'zernio';
  }
  if (isSauPlatform(platform)) {
    return 'social-auto-upload';
  }
  return null;
}

export function canPublish(jobId: string, platform: string): boolean {
  const state = loadPublishState(jobId);
  const live = state.posts.find(
    (post) => post.platform === platform && post.status === 'live',
  );
  return !live;
}

export function assertReadyToPublish(jobId: string): ReadyToPublish {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (!job.selectedRuns.composite || !job.selectedRuns.social) {
    throw new Error('Publish requires approved composite and social pack runs');
  }
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    throw new Error(`Cannot resolve take folder for ${jobId}`);
  }
  const compositeDir = takeStageRunDir(ref.scriptId, ref.takeId, 'composite', job.selectedRuns.composite);
  const socialPath = path.join(
    takeStageRunDir(ref.scriptId, ref.takeId, 'social', job.selectedRuns.social),
    'social-posts.json',
  );
  if (!fileExists(socialPath)) {
    throw new Error('Social pack missing');
  }
  const portrait = outdoorCompositeMp4Path(compositeDir, job.scriptId, 'portrait');
  const landscape = outdoorCompositeMp4Path(compositeDir, job.scriptId, 'landscape');
  if (!fileExists(portrait) && !fileExists(landscape)) {
    throw new Error('Composite renders missing');
  }
  return { job, ref, compositeDir, socialPath, portrait, landscape };
}

function pickVideoPath({
  platform,
  format,
  portrait,
  landscape,
}: {
  platform: string;
  format?: 'portrait' | 'landscape';
  portrait: string;
  landscape: string;
}): string {
  if (format === 'portrait' || format === 'landscape') {
    const chosen = format === 'landscape' ? landscape : portrait;
    if (!fileExists(chosen)) {
      throw new Error(`Video not found for format ${format}`);
    }
    return chosen;
  }
  if (LANDSCAPE_PLATFORMS.has(platform) && fileExists(landscape)) {
    return landscape;
  }
  if (PORTRAIT_PLATFORMS.has(platform) && fileExists(portrait)) {
    return portrait;
  }
  if (fileExists(portrait)) {
    return portrait;
  }
  if (fileExists(landscape)) {
    return landscape;
  }
  throw new Error(`No composite video available for ${platform}`);
}

function socialCopyForPlatform(
  social: SocialPosts,
  platform: string,
  job: OutdoorJob,
): { title: string; description: string; group: string } {
  const english = social.english?.[platform];
  const china = social.china?.[platform];
  const copy = english ?? china ?? {
    title: social.titleEnglish ?? social.titleChina ?? job.scriptTitle,
    body: '',
  };
  return {
    title: copy.title ?? job.scriptTitle,
    description: copy.body ?? copy.title ?? '',
    group: english ? 'english' : china ? 'china' : 'fallback',
  };
}

function platformsFromSocial(social: SocialPosts): string[] {
  const platforms = new Set<string>();
  for (const platform of Object.keys(social.english ?? {})) {
    platforms.add(platform);
  }
  for (const platform of Object.keys(social.china ?? {})) {
    platforms.add(platform);
  }
  return [...platforms];
}

function hasPublishableTitle(social: SocialPosts, platform: string, job: OutdoorJob): boolean {
  const { title } = socialCopyForPlatform(social, platform, job);
  return Boolean(title.trim());
}

export async function publishJob(
  jobId: string,
  platform: string,
  options: PublishOptions = {},
): Promise<PublishRecord> {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  if (!canPublish(jobId, platform)) {
    throw new Error(
      `Cannot publish to ${platform} while a live post exists. Hide or delete it first.`,
    );
  }

  const { job, portrait, landscape, socialPath } = assertReadyToPublish(jobId);
  const social = readJson<SocialPosts>(socialPath);
  const videoPath = pickVideoPath({ platform, format: options.format, portrait, landscape });
  const { title, description } = socialCopyForPlatform(social, platform, job);
  if (!title.trim()) {
    throw new Error(`No title for ${platform}`);
  }

  const cover = resolveCoverFileForPlatform(jobId, platform);
  if (cover) {
    console.log(`[publish] ${platform} using cover ${cover.coverId}`);
  } else {
    console.log(`[publish] ${platform} has no selected cover`);
  }

  let record: PublishRecord;
  if (isZernioPlatform(platform)) {
    record = await publishToZernio({
      platform,
      videoPath,
      title,
      description,
      jobId,
      compositeRunId: job.selectedRuns.composite!,
      thumbnailPath: cover?.filePath,
      coverId: cover?.coverId,
    });
  } else if (isSauPlatform(platform)) {
    record = await publishToSau({
      platform,
      videoPath,
      title,
      description,
      jobId,
      compositeRunId: job.selectedRuns.composite!,
      thumbnailPath: cover?.filePath,
      coverId: cover?.coverId,
    });
  } else {
    throw new Error(`Unhandled platform: ${platform}`);
  }

  const state = loadPublishState(jobId);
  state.posts.push(record);
  savePublishState(state);

  const savedJob = loadJob(jobId);
  if (savedJob) {
    savedJob.status = 'published';
    saveJob(savedJob);
  }

  return record;
}

export async function publishAll(jobId: string): Promise<PublishAllResult> {
  const { socialPath, job } = assertReadyToPublish(jobId);
  const social = readJson<SocialPosts>(socialPath);
  const platforms = platformsFromSocial(social).filter((platform) =>
    SUPPORTED_PLATFORMS.includes(platform)
  );

  const result: PublishAllResult = {
    published: [],
    skippedLive: [],
    skippedNoTitle: [],
    failed: [],
  };

  for (const platform of platforms) {
    if (!canPublish(jobId, platform)) {
      result.skippedLive.push(platform);
      continue;
    }
    if (!hasPublishableTitle(social, platform, job)) {
      result.skippedNoTitle.push(platform);
      continue;
    }
    try {
      const record = await publishJob(jobId, platform);
      result.published.push({ platform, record });
    } catch (error) {
      result.failed.push({
        platform,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export async function hidePublishedPost(jobId: string, platform: string): Promise<PublishRecord> {
  const state = loadPublishState(jobId);
  const post = state.posts.find((entry) => entry.platform === platform && entry.status === 'live');
  if (!post) {
    throw new Error(`No live ${platform} post for job ${jobId}`);
  }

  if (post.provider === 'zernio' || isZernioPlatform(platform)) {
    await hideZernioPost(post.postId);
  } else if (post.provider === 'social-auto-upload' || isSauPlatform(platform)) {
    await hideSauPost(platform, post.postId);
  } else if (post.provider === 'mixpost' || post.provider === 'postiz') {
    throw new Error(`Legacy ${post.provider} post — clear local publish-state or delete in that dashboard`);
  } else {
    throw new Error(`Unknown provider for ${platform}`);
  }

  post.status = 'hidden';
  post.hiddenAt = new Date().toISOString();
  savePublishState(state);
  return post;
}

export async function deletePublishedPost(jobId: string, platform: string): Promise<PublishRecord> {
  const state = loadPublishState(jobId);
  const post = state.posts.find(
    (entry) => entry.platform === platform && (entry.status === 'live' || entry.status === 'hidden'),
  );
  if (!post) {
    throw new Error(`No post to delete for ${platform}`);
  }

  if (post.provider === 'zernio' || isZernioPlatform(platform)) {
    await deleteZernioPost(post.postId);
  } else if (post.provider === 'social-auto-upload' || isSauPlatform(platform)) {
    await deleteSauPost(platform, post.postId);
  } else if (post.provider === 'mixpost' || post.provider === 'postiz') {
    throw new Error(`Legacy ${post.provider} post — clear local publish-state or delete in that dashboard`);
  } else {
    throw new Error(`Unknown provider for ${platform}`);
  }

  post.status = 'deleted';
  post.deletedAt = new Date().toISOString();
  savePublishState(state);
  return post;
}
