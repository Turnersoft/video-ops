import path from "node:path";

import { resolveCoverFileForPlatform } from "../covers.ts";
import { fileExists, readJson } from "../fs_util.ts";
import {
  loadJob,
  loadPublishState,
  saveJob,
  savePublishState,
} from "../job-store.ts";
import {
  outdoorCompositeMp4Path,
  resolveTakeFromJobId,
  takeStageRunDir,
} from "../paths.ts";
import type {
  OutdoorJob,
  PublishProgress,
  PublishRecord,
  PublishState,
} from "../schema.ts";
import { ensureTakeSocialPack } from "../stages/social.ts";
import {
  hideSauPost,
  deleteSauPost,
  isSauPlatform,
  publishToSau,
  sauPublishMode,
  SAU_PLATFORMS,
} from "./sau.ts";
import {
  deletePostizPost,
  hidePostizPost,
  isPostizImagePlatform,
  isPostizPlatform,
  listPostizRecentPosts,
  POSTIZ_IMAGE_PLATFORMS,
  postizApiText,
  postizIntegrationIdFor,
  postizPublishMode,
  postizSettingsPreview,
  POSTIZ_PLATFORMS,
  publishImageToPostiz,
  publishToPostiz,
} from "./postiz.ts";
import {
  cardFormatForPlatform,
  cardLangForPlatform,
  generateSocialCard,
  listSocialCards,
  resolveSocialCardPathForPlatform,
} from "../social-cards/index.ts";

export const SUPPORTED_PLATFORMS = [
  ...new Set([...POSTIZ_PLATFORMS, ...SAU_PLATFORMS]),
];

const PORTRAIT_PLATFORMS = new Set([
  "youtube",
  "instagram",
  "tiktok",
  "douyin",
  "xiaohongshu",
  "kuaishou",
]);
const LANDSCAPE_PLATFORMS = new Set([
  "bilibili",
  "wechat_channels",
  "facebook",
  "linkedin",
]);

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
  format?: "portrait" | "landscape";
  republish?: boolean;
};

export type PublishAllResult = {
  published: Array<{ platform: string; record: PublishRecord }>;
  skippedLive: string[];
  skippedNoTitle: string[];
  skippedUnavailable: Array<{ platform: string; reason: string }>;
  failed: Array<{ platform: string; error: string }>;
};

export type PublishPlanPlatform = {
  platform: string;
  group: "english" | "china" | "fallback";
  provider: "postiz" | "social-auto-upload" | null;
  format: "portrait" | "landscape";
  videoFileName: string;
  videoUrl: string | null;
  videoExists: boolean;
  title: string;
  body: string;
  /** Exact Postiz `value[0].content` (or SAU body). */
  apiContent: string;
  /** Postiz settings.title when used (YouTube / TikTok). */
  apiTitle: string | null;
  apiSettings: Record<string, unknown> | null;
  coverId: string | null;
  coverUrl: string | null;
  /** True when the cover is sent as a custom thumbnail (YouTube via Postiz). */
  coverAppliesAsThumbnail: boolean;
  canPublish: boolean;
  blockers: string[];
  postizMode?: "stub" | "live";
  hasIntegration?: boolean;
};

export type PublishPlan = {
  jobId: string;
  scriptId: string;
  takeId: string;
  compositeRunId: string | null;
  socialRunId: string | null;
  ready: boolean;
  error: string | null;
  platforms: PublishPlanPlatform[];
};

type ReadyToPublish = {
  job: OutdoorJob;
  ref: { scriptId: string; takeId: string };
  compositeDir: string;
  socialPath: string;
  portrait: string;
  landscape: string;
};

export function providerFor(
  platform: string,
): "postiz" | "social-auto-upload" | null {
  if (isPostizPlatform(platform)) {
    return "postiz";
  }
  if (isSauPlatform(platform)) {
    return "social-auto-upload";
  }
  return null;
}

export function canPublish(jobId: string, platform: string): boolean {
  const state = loadPublishState(jobId);
  const active = state.posts.find(
    (post) =>
      post.platform === platform &&
      (post.status === "live" || post.status === "pending"),
  );
  return !active;
}

function retireLivePosts(jobId: string, platform: string): void {
  const state = loadPublishState(jobId);
  let changed = false;
  for (const post of state.posts) {
    if (
      post.platform === platform &&
      (post.status === "live" || post.status === "pending")
    ) {
      post.status = "deleted";
      changed = true;
    }
  }
  if (changed) {
    savePublishState(state);
  }
}

export function assertReadyToPublish(jobId: string): ReadyToPublish {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (!job.selectedRuns.composite) {
    throw new Error("Publish requires an approved composite run");
  }
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    throw new Error(`Cannot resolve take folder for ${jobId}`);
  }
  const compositeDir = takeStageRunDir(
    ref.scriptId,
    ref.takeId,
    "composite",
    job.selectedRuns.composite,
  );
  const socialPath = ensureTakeSocialPack(job);
  if (!fileExists(socialPath)) {
    throw new Error("Social pack missing");
  }
  const portrait = outdoorCompositeMp4Path(
    compositeDir,
    job.scriptId,
    "portrait",
  );
  const landscape = outdoorCompositeMp4Path(
    compositeDir,
    job.scriptId,
    "landscape",
  );
  if (!fileExists(portrait) && !fileExists(landscape)) {
    throw new Error("Composite renders missing");
  }
  return { job, ref, compositeDir, socialPath, portrait, landscape };
}

function assertReadyForSocialPublish(jobId: string): {
  job: OutdoorJob;
  socialPath: string;
} {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const socialPath = ensureTakeSocialPack(job);
  if (!fileExists(socialPath)) {
    throw new Error("Social pack missing");
  }
  return { job, socialPath };
}

async function ensureSocialCardForPlatform(
  jobId: string,
  platform: string,
): Promise<string> {
  const existing = resolveSocialCardPathForPlatform(jobId, platform);
  if (existing) {
    return existing;
  }
  await generateSocialCard(
    jobId,
    cardFormatForPlatform(platform),
    cardLangForPlatform(platform),
  );
  const generated = resolveSocialCardPathForPlatform(jobId, platform);
  if (!generated) {
    throw new Error(`Failed to generate social card for ${platform}`);
  }
  return generated;
}

function pickVideoPath({
  platform,
  format,
  portrait,
  landscape,
}: {
  platform: string;
  format?: "portrait" | "landscape";
  portrait: string;
  landscape: string;
}): string {
  if (format === "portrait" || format === "landscape") {
    const chosen = format === "landscape" ? landscape : portrait;
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
  const copy = english ??
    china ?? {
      title: social.titleEnglish ?? social.titleChina ?? job.scriptTitle,
      body: "",
    };
  return {
    title: copy.title ?? job.scriptTitle,
    description: copy.body ?? copy.title ?? "",
    group: english ? "english" : china ? "china" : "fallback",
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

function hasPublishableTitle(
  social: SocialPosts,
  platform: string,
  job: OutdoorJob,
): boolean {
  const { title } = socialCopyForPlatform(social, platform, job);
  return Boolean(title.trim());
}

function coverPreviewUrl(
  jobId: string,
  scriptId: string,
  coverId: string | null,
): string | null {
  if (!coverId) {
    return null;
  }
  if (coverId.startsWith("script:")) {
    const slot = coverId.slice("script:".length);
    return `/api/scripts/${encodeURIComponent(scriptId)}/covers/${encodeURIComponent(slot)}/file`;
  }
  return `/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}/file`;
}

function videoArtifactUrl(
  scriptId: string,
  takeId: string,
  compositeRunId: string,
  fileName: string,
): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/artifacts/composite/${encodeURIComponent(compositeRunId)}/${encodeURIComponent(fileName)}`;
}

function resolveVideoFormat(
  videoPath: string,
  portrait: string,
  landscape: string,
): "portrait" | "landscape" {
  if (videoPath === landscape) {
    return "landscape";
  }
  if (videoPath === portrait) {
    return "portrait";
  }
  return path.basename(videoPath).includes("landscape")
    ? "landscape"
    : "portrait";
}

function planBlockersForPlatform({
  jobId,
  platform,
  title,
  videoExists,
  provider,
}: {
  jobId: string;
  platform: string;
  title: string;
  videoExists: boolean;
  provider: "postiz" | "social-auto-upload" | null;
}): string[] {
  const blockers: string[] = [];
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    blockers.push("Unsupported platform");
  }
  if (!title.trim()) {
    blockers.push("No title");
  }
  if (!videoExists) {
    blockers.push("Composite video missing");
  }
  if (!canPublish(jobId, platform)) {
    blockers.push("Live post already exists — hide or delete first");
  }
  if (provider === "postiz") {
    if (postizPublishMode() !== "live") {
      blockers.push("Postiz publishing is in stub mode — enable live on Platforms");
    }
    if (!postizIntegrationIdFor(platform)) {
      blockers.push("Postiz channel not synced — open Platforms and Sync channels");
    }
  }
  if (provider === "social-auto-upload") {
    if (sauPublishMode() !== "live") {
      blockers.push("SAU is in stub mode — enable live on Platforms");
    }
  }
  if (!provider) {
    blockers.push("No publish provider");
  }
  return blockers;
}

function updatePublishAttempt(
  jobId: string,
  attemptId: string,
  update: (record: PublishRecord) => PublishRecord,
): PublishState {
  const state = loadPublishState(jobId);
  const index = state.posts.findIndex((entry) => entry.postId === attemptId);
  if (index >= 0) {
    state.posts[index] = update(state.posts[index]);
    savePublishState(state);
  }
  return state;
}

/** Exact per-platform payload outdoor-ui should preview (same inputs as publish). */
export function buildPublishPlan(jobId: string): PublishPlan {
  const job = loadJob(jobId);
  if (!job) {
    return {
      jobId,
      scriptId: "",
      takeId: "",
      compositeRunId: null,
      socialRunId: null,
      ready: false,
      error: `Job not found: ${jobId}`,
      platforms: [],
    };
  }

  try {
    const ready = assertReadyToPublish(jobId);
    const social = readJson<SocialPosts>(ready.socialPath);
    const platforms = platformsFromSocial(social).filter((platform) =>
      SUPPORTED_PLATFORMS.includes(platform),
    );
    const compositeRunId = job.selectedRuns.composite!;
    const planPlatforms: PublishPlanPlatform[] = [];

    for (const platform of platforms) {
      const { title, description, group } = socialCopyForPlatform(
        social,
        platform,
        job,
      );
      let videoPath = "";
      let videoExists = false;
      let format: "portrait" | "landscape" = PORTRAIT_PLATFORMS.has(platform)
        ? "portrait"
        : LANDSCAPE_PLATFORMS.has(platform)
          ? "landscape"
          : "portrait";
      try {
        videoPath = pickVideoPath({
          platform,
          portrait: ready.portrait,
          landscape: ready.landscape,
        });
        videoExists = fileExists(videoPath);
        format = resolveVideoFormat(
          videoPath,
          ready.portrait,
          ready.landscape,
        );
      } catch {
        videoExists = false;
      }

      const cover = resolveCoverFileForPlatform(jobId, platform);
      const provider = providerFor(platform);
      const apiText =
        provider === "postiz"
          ? postizApiText(platform, title, description)
          : {
              content: description || title,
              settingsTitle: title.trim() ? title : null,
            };
      const blockers = planBlockersForPlatform({
        jobId,
        platform,
        title,
        videoExists,
        provider,
      });
      const fileName = videoPath ? path.basename(videoPath) : "";

      planPlatforms.push({
        platform,
        group: group as PublishPlanPlatform["group"],
        provider,
        format,
        videoFileName: fileName,
        videoUrl:
          videoExists && fileName
            ? videoArtifactUrl(
                ready.ref.scriptId,
                ready.ref.takeId,
                compositeRunId,
                fileName,
              )
            : null,
        videoExists,
        title,
        body: description,
        apiContent: apiText.content,
        apiTitle: apiText.settingsTitle,
        apiSettings:
          provider === "postiz"
            ? postizSettingsPreview(platform, title, Boolean(cover))
            : null,
        coverId: cover?.coverId ?? null,
        coverUrl: coverPreviewUrl(
          jobId,
          ready.ref.scriptId,
          cover?.coverId ?? null,
        ),
        coverAppliesAsThumbnail:
          provider === "postiz" && platform === "youtube" && Boolean(cover),
        canPublish: blockers.length === 0,
        blockers,
        postizMode: provider === "postiz" ? postizPublishMode() : undefined,
        hasIntegration:
          provider === "postiz"
            ? Boolean(postizIntegrationIdFor(platform))
            : undefined,
      });
    }

    return {
      jobId,
      scriptId: ready.ref.scriptId,
      takeId: ready.ref.takeId,
      compositeRunId,
      socialRunId: job.selectedRuns.social ?? null,
      ready: true,
      error: null,
      platforms: planPlatforms,
    };
  } catch (error) {
    const ref = resolveTakeFromJobId(jobId);
    return {
      jobId,
      scriptId: ref?.scriptId ?? job.scriptId,
      takeId: ref?.takeId ?? job.takeId,
      compositeRunId: job.selectedRuns.composite ?? null,
      socialRunId: job.selectedRuns.social ?? null,
      ready: false,
      error: error instanceof Error ? error.message : String(error),
      platforms: [],
    };
  }
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
    if (!options.republish) {
      throw new Error(
        `Cannot publish to ${platform} while a live post exists. Hide or delete it first.`,
      );
    }
    retireLivePosts(jobId, platform);
  }

  const { job, portrait, landscape, socialPath } = assertReadyToPublish(jobId);
  const social = readJson<SocialPosts>(socialPath);
  const videoPath = pickVideoPath({
    platform,
    format: options.format,
    portrait,
    landscape,
  });
  const { title, description } = socialCopyForPlatform(social, platform, job);
  if (!title.trim()) {
    throw new Error(`No title for ${platform}`);
  }

  const cover = resolveCoverFileForPlatform(jobId, platform);
  const format = resolveVideoFormat(videoPath, portrait, landscape);
  const blockers = planBlockersForPlatform({
    jobId,
    platform,
    title,
    videoExists: fileExists(videoPath),
    provider: providerFor(platform),
  });
  if (blockers.length) {
    throw new Error(blockers.join("; "));
  }
  console.log(
    `[publish] ${platform} video=${path.basename(videoPath)} format=${format}` +
      (cover
        ? ` cover=${cover.coverId}`
        : " cover=none") +
      (isPostizPlatform(platform)
        ? ` postizMode=${postizPublishMode()}`
        : ""),
  );

  let record: PublishRecord;
  if (isPostizPlatform(platform)) {
    const startedAt = new Date().toISOString();
    const attemptId = `postiz-pending-${platform}-${Date.now().toString(36)}`;
    const queued: PublishProgress = {
      stage: "queued",
      percent: 0,
      message: "Waiting to upload to Postiz",
      updatedAt: startedAt,
    };
    const state = loadPublishState(jobId);
    state.posts.push({
      platform,
      provider: "postiz",
      postId: attemptId,
      url: "",
      status: "pending",
      publishedAt: startedAt,
      jobId,
      compositeRunId: job.selectedRuns.composite!,
      coverId: cover?.coverId,
      progress: queued,
    });
    savePublishState(state);

    try {
      record = await publishToPostiz({
        platform,
        videoPath,
        title,
        description,
        jobId,
        compositeRunId: job.selectedRuns.composite!,
        thumbnailPath: cover?.filePath,
        coverId: cover?.coverId,
        onProgress: (nextProgress) => {
          updatePublishAttempt(jobId, attemptId, (pending) => ({
            ...pending,
            progress: nextProgress,
          }));
        },
      });
      updatePublishAttempt(jobId, attemptId, () => record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedAt = new Date().toISOString();
      updatePublishAttempt(jobId, attemptId, (pending) => ({
        ...pending,
        status: "failed",
        error: message,
        progress: {
          stage: "failed",
          percent: pending.progress?.percent ?? 0,
          message,
          updatedAt: failedAt,
        },
      }));
      throw error;
    }
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

  if (!isPostizPlatform(platform)) {
    const state = loadPublishState(jobId);
    state.posts.push(record);
    savePublishState(state);
  }

  const savedJob = loadJob(jobId);
  if (savedJob) {
    savedJob.status = "published";
    saveJob(savedJob);
  }

  return record;
}

export async function publishImageJob(
  jobId: string,
  platform: string,
): Promise<PublishRecord> {
  if (!isPostizImagePlatform(platform)) {
    throw new Error(
      `${platform} does not support image-only Postiz posts — use video publish or pick x/linkedin/instagram/etc.`,
    );
  }
  if (!canPublish(jobId, platform)) {
    throw new Error(
      `Cannot publish to ${platform} while a live post exists. Hide or delete it first.`,
    );
  }

  const { job, socialPath } = assertReadyForSocialPublish(jobId);
  const social = readJson<SocialPosts>(socialPath);
  const { title, description } = socialCopyForPlatform(social, platform, job);
  if (!title.trim()) {
    throw new Error(`No title for ${platform}`);
  }
  if (postizPublishMode() !== "live") {
    throw new Error("Postiz is in stub mode — enable live on #/platforms");
  }
  if (!postizIntegrationIdFor(platform)) {
    throw new Error(`No Postiz integration for ${platform} — Sync channels on #/platforms`);
  }

  const imagePath = await ensureSocialCardForPlatform(jobId, platform);
  const compositeRunId = job.selectedRuns.composite ?? null;

  console.log(
    `[publish-image] ${platform} image=${path.basename(imagePath)} postizMode=${postizPublishMode()}`,
  );

  const startedAt = new Date().toISOString();
  const attemptId = `postiz-image-pending-${platform}-${Date.now().toString(36)}`;
  const queued: PublishProgress = {
    stage: "queued",
    percent: 0,
    message: "Waiting to upload image to Postiz",
    updatedAt: startedAt,
  };
  const state = loadPublishState(jobId);
  state.posts.push({
    platform,
    provider: "postiz",
    postId: attemptId,
    url: "",
    status: "pending",
    publishedAt: startedAt,
    jobId,
    compositeRunId: compositeRunId ?? undefined,
    mediaKind: "image",
    imagePath,
    progress: queued,
  });
  savePublishState(state);

  try {
    const record = await publishImageToPostiz({
      platform,
      imagePath,
      title,
      description,
      jobId,
      compositeRunId,
      onProgress: (nextProgress) => {
        updatePublishAttempt(jobId, attemptId, (pending) => ({
          ...pending,
          progress: nextProgress,
        }));
      },
    });
    updatePublishAttempt(jobId, attemptId, () => ({
      ...record,
      mediaKind: "image",
      imagePath,
    }));
    return { ...record, mediaKind: "image", imagePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedAt = new Date().toISOString();
    updatePublishAttempt(jobId, attemptId, (pending) => ({
      ...pending,
      status: "failed",
      error: message,
      progress: {
        stage: "failed",
        percent: pending.progress?.percent ?? 0,
        message,
        updatedAt: failedAt,
      },
    }));
    throw error;
  }
}

export async function publishImagesAll(jobId: string): Promise<PublishAllResult> {
  const { job, socialPath } = assertReadyForSocialPublish(jobId);
  const social = readJson<SocialPosts>(socialPath);
  const platforms = platformsFromSocial(social).filter((platform) =>
    isPostizImagePlatform(platform),
  );

  const result: PublishAllResult = {
    published: [],
    skippedLive: [],
    skippedNoTitle: [],
    skippedUnavailable: [],
    failed: [],
  };

  if (postizPublishMode() !== "live") {
    for (const platform of platforms) {
      result.skippedUnavailable.push({
        platform,
        reason: "Postiz is in stub mode — enable live on #/platforms",
      });
    }
    return result;
  }

  for (const platform of platforms) {
    if (!canPublish(jobId, platform)) {
      result.skippedLive.push(platform);
      continue;
    }
    if (!hasPublishableTitle(social, platform, job)) {
      result.skippedNoTitle.push(platform);
      continue;
    }
    if (!postizIntegrationIdFor(platform)) {
      result.skippedUnavailable.push({
        platform,
        reason: "No Postiz integration — connect + Sync on #/platforms",
      });
      continue;
    }
    try {
      const record = await publishImageJob(jobId, platform);
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

export { listSocialCards, POSTIZ_IMAGE_PLATFORMS };

export async function publishAll(jobId: string): Promise<PublishAllResult> {
  const { socialPath, job } = assertReadyToPublish(jobId);
  const social = readJson<SocialPosts>(socialPath);
  const platforms = platformsFromSocial(social).filter((platform) =>
    SUPPORTED_PLATFORMS.includes(platform),
  );

  const result: PublishAllResult = {
    published: [],
    skippedLive: [],
    skippedNoTitle: [],
    skippedUnavailable: [],
    failed: [],
  };
  const plan = buildPublishPlan(jobId);
  const planByPlatform = new Map(
    plan.platforms.map((entry) => [entry.platform, entry]),
  );

  for (const platform of platforms) {
    if (!canPublish(jobId, platform)) {
      result.skippedLive.push(platform);
      continue;
    }
    if (!hasPublishableTitle(social, platform, job)) {
      result.skippedNoTitle.push(platform);
      continue;
    }
    const planned = planByPlatform.get(platform);
    if (!planned?.canPublish) {
      result.skippedUnavailable.push({
        platform,
        reason:
          planned?.blockers.join("; ") || "Platform is not ready to publish",
      });
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

/** Reconcile locally accepted Postiz posts with Postiz's actual queue state. */
export async function refreshPostizPublishState(
  jobId: string,
): Promise<PublishState> {
  const state = loadPublishState(jobId);
  const pendingIds = new Set(
    state.posts
      .filter(
        (entry) =>
          entry.provider === "postiz" &&
          entry.status === "pending" &&
          !entry.postId.startsWith("postiz-pending-"),
      )
      .map((entry) => entry.postId),
  );
  if (!pendingIds.size) {
    return state;
  }

  const postizPosts = await listPostizRecentPosts();
  const byId = new Map(postizPosts.map((entry) => [entry.id, entry]));
  let changed = false;
  for (let index = 0; index < state.posts.length; index += 1) {
    const local = state.posts[index];
    if (!pendingIds.has(local.postId)) {
      continue;
    }
    const remote = byId.get(local.postId);
    if (!remote) {
      continue;
    }
    const status =
      remote.state === "PUBLISHED"
        ? "live"
        : remote.state === "ERROR"
          ? "failed"
          : "pending";
    const stage =
      remote.state === "PUBLISHED"
        ? "published"
        : remote.state === "ERROR"
          ? "failed"
          : "accepted";
    state.posts[index] = {
      ...local,
      status,
      url: remote.releaseURL ?? local.url,
      postizState:
        remote.state === "UNKNOWN" ? local.postizState : remote.state,
      error:
        remote.state === "ERROR"
          ? "Postiz reported a platform publishing error"
          : local.error,
      progress: {
        stage,
        percent: 100,
        message:
          remote.state === "PUBLISHED"
            ? "Published by Postiz"
            : remote.state === "ERROR"
              ? "Postiz reported a publishing error"
              : `Postiz state: ${remote.state}`,
        updatedAt: new Date().toISOString(),
      },
    };
    changed = true;
  }
  if (changed) {
    savePublishState(state);
  }
  return state;
}

export async function hidePublishedPost(
  jobId: string,
  platform: string,
): Promise<PublishRecord> {
  const state = loadPublishState(jobId);
  const post = state.posts.find(
    (entry) => entry.platform === platform && entry.status === "live",
  );
  if (!post) {
    throw new Error(`No live ${platform} post for job ${jobId}`);
  }

  if (post.provider === "postiz" || isPostizPlatform(platform)) {
    await hidePostizPost(post.postId);
  } else if (
    post.provider === "social-auto-upload" ||
    isSauPlatform(platform)
  ) {
    await hideSauPost(platform, post.postId);
  } else if (post.provider === "mixpost" || post.provider === "zernio") {
    throw new Error(
      `Legacy ${post.provider} post — clear local publish-state or delete in that dashboard`,
    );
  } else {
    throw new Error(`Unknown provider for ${platform}`);
  }

  post.status = "hidden";
  post.hiddenAt = new Date().toISOString();
  savePublishState(state);
  return post;
}

export async function deletePublishedPost(
  jobId: string,
  platform: string,
): Promise<PublishRecord> {
  const state = loadPublishState(jobId);
  const post = state.posts.find(
    (entry) =>
      entry.platform === platform &&
      (entry.status === "live" || entry.status === "hidden"),
  );
  if (!post) {
    throw new Error(`No post to delete for ${platform}`);
  }

  if (post.provider === "postiz" || isPostizPlatform(platform)) {
    await deletePostizPost(post.postId);
  } else if (
    post.provider === "social-auto-upload" ||
    isSauPlatform(platform)
  ) {
    await deleteSauPost(platform, post.postId);
  } else if (post.provider === "mixpost" || post.provider === "zernio") {
    throw new Error(
      `Legacy ${post.provider} post — clear local publish-state or delete in that dashboard`,
    );
  } else {
    throw new Error(`Unknown provider for ${platform}`);
  }

  post.status = "deleted";
  post.deletedAt = new Date().toISOString();
  savePublishState(state);
  return post;
}
