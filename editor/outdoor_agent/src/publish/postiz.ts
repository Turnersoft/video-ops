/**
 * Postiz Public API adapter for English / global platforms.
 * Docs: https://docs.postiz.com/public-api
 *
 * Env:
 *   POSTIZ_API_KEY — Settings → Developers → Public API
 *   POSTIZ_API_BASE — default https://api.postiz.com/public/v1
 *   POSTIZ_INTEGRATIONS_JSON — {"youtube":"<integration-id>","x":"…",…}
 *   POSTIZ_PUBLISH_MODE — stub|live (default stub)
 *   POSTIZ_DASHBOARD_URL — optional UI base (default https://platform.postiz.com)
 */

import path from "node:path";

import type { PublishProgress, PublishRecord } from "../schema.ts";

/** Outdoor platform → Postiz settings.__type / providerIdentifier */
const POSTIZ_PLATFORM_MAP: Record<string, string> = {
  youtube: "youtube",
  x: "x",
  twitter: "x",
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  bluesky: "bluesky",
  threads: "threads",
  reddit: "reddit",
};

type PublishToPostizParams = {
  platform: string;
  videoPath: string;
  title: string;
  description: string;
  jobId: string;
  compositeRunId: string;
  thumbnailPath?: string;
  coverId?: string;
  onProgress?: (progress: PublishProgress) => void;
};

type PublishImageToPostizParams = {
  platform: string;
  imagePath: string;
  title: string;
  description: string;
  jobId: string;
  compositeRunId?: string | null;
  onProgress?: (progress: PublishProgress) => void;
};

type PublishImagesAlbumToPostizParams = {
  platform: string;
  imagePaths: string[];
  title: string;
  description: string;
  jobId: string;
  compositeRunId?: string | null;
  onProgress?: (progress: PublishProgress) => void;
};

type PostizPublishResult = PublishRecord & {
  title: string;
  videoPath?: string;
  imagePath?: string;
  mediaKind?: "video" | "image";
  stub: boolean;
};

/** Postiz platforms that accept image-only posts (no composite video required). */
export const POSTIZ_IMAGE_PLATFORMS = [
  "x",
  "linkedin",
  "instagram",
  "facebook",
  "bluesky",
  "threads",
  "reddit",
  "tiktok",
] as const;

/** YouTube is video-first in our workflow. */
export const POSTIZ_VIDEO_ONLY_PLATFORMS = ["youtube"] as const;

export type PostizConnectedIntegration = {
  id: string;
  identifier: string;
  outdoorPlatform: string | null;
  name: string | null;
  picture: string | null;
};

export type PostizIntegrationSettings = {
  rules: string;
  maxLength: number | null;
  settings: unknown;
  tools: Array<{
    methodName: string;
    description: string;
  }>;
};

export type PostizRecentPost = {
  id: string;
  content: string;
  publishDate: string | null;
  releaseURL: string | null;
  state: "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT" | "UNKNOWN";
  integration: {
    id: string;
    identifier: string;
    name: string;
  } | null;
};

export type PostizNotification = {
  id: string;
  content: string;
  link: string | null;
  createdAt: string;
};

export type PostizOverview = {
  checkedAt: string;
  apiConnected: boolean;
  message: string;
  mode: "stub" | "live";
  dashboardUrl: string;
  integrations: Array<
    PostizConnectedIntegration & {
      settings: PostizIntegrationSettings | null;
      settingsError: string | null;
    }
  >;
  recentPosts: PostizRecentPost[];
  notifications: PostizNotification[];
  errors: string[];
};

function apiBase(): string {
  return (
    Deno.env.get("POSTIZ_API_BASE") ?? "http://localhost:4007/api/public/v1"
  ).replace(/\/+$/, "");
}

function loadIntegrations(): Record<string, string> {
  const raw = Deno.env.get("POSTIZ_INTEGRATIONS_JSON") ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function loadIntegrationTypes(): Record<string, string> {
  const raw = Deno.env.get("POSTIZ_INTEGRATION_TYPES_JSON") ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function requireApiKey(): string {
  const key = Deno.env.get("POSTIZ_API_KEY")?.trim();
  if (!key) {
    throw new Error("POSTIZ_API_KEY is not set on the Mac agent");
  }
  return key;
}

function postizType(platform: string): string | null {
  return POSTIZ_PLATFORM_MAP[platform] ?? null;
}

export function postizIntegrationTypeFor(platform: string): string | null {
  return loadIntegrationTypes()[platform] ?? postizType(platform);
}

function progress(
  stage: PublishProgress["stage"],
  percent: number,
  message: string,
): PublishProgress {
  return {
    stage,
    percent,
    message,
    updatedAt: new Date().toISOString(),
  };
}

async function postizFetch(
  pathname: string,
  init: RequestInit = {},
): Promise<Record<string, unknown> | unknown[]> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", requireApiKey());
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase()}${pathname}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  let payload: Record<string, unknown> | unknown[] = {};
  try {
    payload = text
      ? (JSON.parse(text) as Record<string, unknown> | unknown[])
      : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const errorObj = !Array.isArray(payload) ? payload : null;
    const error = errorObj?.error ?? errorObj?.message ?? errorObj?.raw;
    const detail =
      typeof error === "string"
        ? error
        : errorObj
          ? JSON.stringify(errorObj).slice(0, 800)
          : text.slice(0, 800);
    throw new Error(
      `Postiz HTTP ${response.status} on ${pathname}: ${detail || "request failed"}`,
    );
  }
  return payload;
}

/** Exact text fields Postiz receives for this outdoor platform. */
export function postizApiText(
  platform: string,
  title: string,
  description: string,
): { content: string; settingsTitle: string | null } {
  const type = postizType(platform);
  if (type === "youtube") {
    return {
      content: description || title,
      settingsTitle: title.slice(0, 100),
    };
  }
  if (type === "tiktok") {
    return {
      content:
        [title, description].filter((part) => part?.trim()).join("\n\n") ||
        title,
      settingsTitle: title.slice(0, 90),
    };
  }
  return {
    content:
      [title, description].filter((part) => part?.trim()).join("\n\n") || title,
    settingsTitle: null,
  };
}

function buildImageSettings(
  platform: string,
  title: string,
  integrationIdentifier?: string | null,
  carousel = false,
): Record<string, unknown> {
  const type = integrationIdentifier ?? postizType(platform);
  if (!type) {
    throw new Error(`Unsupported Postiz platform: ${platform}`);
  }
  const { settingsTitle } = postizApiText(platform, title, "");
  switch (type) {
    case "tiktok":
      return {
        __type: "tiktok",
        title: settingsTitle ?? title.slice(0, 90),
        privacy_level: "PUBLIC_TO_EVERYONE",
        duet: false,
        stitch: false,
        comment: true,
        autoAddMusic: "no",
        brand_content_toggle: false,
        brand_organic_toggle: false,
        content_posting_method: "DIRECT_POST",
      };
    case "instagram":
    case "instagram-standalone":
      return {
        __type: type,
        post_type: "post",
      };
    case "x":
      return {
        __type: "x",
        who_can_reply_post: "everyone",
      };
    case "reddit":
      return {
        __type: "reddit",
        subreddit: [],
      };
    case "linkedin":
      return {
        __type: "linkedin",
        post_as_images_carousel: carousel,
      };
    case "facebook":
    case "bluesky":
    case "threads":
      return { __type: type };
    default:
      throw new Error(
        `Platform ${platform} does not support image-only posts via Postiz in outdoor`,
      );
  }
}

function buildSettings(
  platform: string,
  title: string,
  thumbnail?: { id: string; path: string } | null,
  integrationIdentifier?: string | null,
): Record<string, unknown> {
  const type = integrationIdentifier ?? postizType(platform);
  if (!type) {
    throw new Error(`Unsupported Postiz platform: ${platform}`);
  }
  const { settingsTitle } = postizApiText(platform, title, "");
  switch (type) {
    case "youtube":
      return {
        __type: "youtube",
        title: settingsTitle ?? title.slice(0, 100),
        type: "public",
        selfDeclaredMadeForKids: "no",
        thumbnail: thumbnail ?? null,
        tags: [],
      };
    case "tiktok":
      return {
        __type: "tiktok",
        title: settingsTitle ?? title.slice(0, 90),
        privacy_level: "PUBLIC_TO_EVERYONE",
        duet: true,
        stitch: true,
        comment: true,
        autoAddMusic: "no",
        brand_content_toggle: false,
        brand_organic_toggle: false,
        content_posting_method: "DIRECT_POST",
      };
    case "instagram":
    case "instagram-standalone":
      return {
        __type: type,
        post_type: "post",
      };
    case "x":
      return {
        __type: "x",
        who_can_reply_post: "everyone",
      };
    case "reddit":
      return {
        __type: "reddit",
        subreddit: [],
      };
    case "linkedin":
    case "facebook":
    case "bluesky":
    case "threads":
      return { __type: type };
    default:
      return { __type: type };
  }
}

/** Settings visible before upload; media IDs are represented as selected/not selected. */
export function postizSettingsPreview(
  platform: string,
  title: string,
  hasThumbnail: boolean,
): Record<string, unknown> {
  const settings = buildSettings(
    platform,
    title,
    null,
    postizIntegrationTypeFor(platform),
  );
  if (platform === "youtube") {
    settings.thumbnail = hasThumbnail ? "selected cover (uploaded on submit)" : null;
  }
  return settings;
}

async function uploadMedia(
  filePath: string,
): Promise<{ id: string; path: string }> {
  const bytes = await Deno.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([bytes]), path.basename(filePath));
  const payload = (await postizFetch("/upload", {
    method: "POST",
    body: form,
  })) as Record<string, unknown>;
  const id = String(payload.id ?? "");
  const mediaPath = String(payload.path ?? "");
  if (!id || !mediaPath) {
    throw new Error("Postiz upload did not return id/path");
  }
  return { id, path: mediaPath };
}

export async function publishToPostiz({
  platform,
  videoPath,
  title,
  description,
  jobId,
  compositeRunId,
  thumbnailPath,
  coverId,
  onProgress,
}: PublishToPostizParams): Promise<PostizPublishResult> {
  const publishedAt = new Date().toISOString();
  const type = postizType(platform);
  if (!type) {
    throw new Error(`Platform ${platform} is not supported by Postiz adapter`);
  }

  if (postizPublishMode() === "stub") {
    const postId = `postiz-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: "postiz",
      postId,
      url: `https://platform.postiz.com/posts/${postId}`,
      status: "live",
      publishedAt,
      jobId,
      compositeRunId,
      coverId,
      title,
      videoPath,
      stub: true,
      progress: progress(
        "published",
        100,
        "Stub publish completed (nothing sent to Postiz)",
      ),
    };
  }

  const integrations = loadIntegrations();
  const integrationId = integrations[platform] ?? integrations[type];
  if (!integrationId) {
    throw new Error(
      `No Postiz integration id for ${platform} — set POSTIZ_INTEGRATIONS_JSON or Sync on #/platforms`,
    );
  }

  const integrationIdentifier = postizIntegrationTypeFor(platform) ?? type;
  onProgress?.(progress("uploading_video", 10, "Uploading video to Postiz"));
  const video = await uploadMedia(videoPath);
  onProgress?.(progress("uploading_video", 65, "Video uploaded to Postiz"));
  let thumbnail: { id: string; path: string } | null = null;
  if (thumbnailPath && type === "youtube") {
    try {
      onProgress?.(
        progress("uploading_thumbnail", 70, "Uploading YouTube thumbnail"),
      );
      thumbnail = await uploadMedia(thumbnailPath);
      onProgress?.(
        progress("uploading_thumbnail", 82, "YouTube thumbnail uploaded"),
      );
    } catch (error) {
      console.warn(
        "[postiz] thumbnail upload failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const { content } = postizApiText(platform, title, description);
  const body = {
    type: "now",
    date: publishedAt,
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: integrationId },
        value: [
          {
            content,
            image: [video],
          },
        ],
        settings: buildSettings(
          platform,
          title,
          thumbnail,
          integrationIdentifier,
        ),
      },
    ],
  };

  onProgress?.(progress("submitting", 90, "Submitting post to Postiz"));
  const payload = (await postizFetch("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;

  const posts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.posts)
      ? payload.posts
      : [payload];
  const first = (posts[0] ?? {}) as Record<string, unknown>;
  const postId = String(
    first.id ?? first.postId ?? `postiz-${Date.now().toString(36)}`,
  );
  const url = String(
    first.releaseURL ??
      first.url ??
      first.permalink ??
      `${postizDashboardUrl()}/posts/${postId}`,
  );
  const acceptedProgress = progress(
    "accepted",
    100,
    "Postiz accepted the post; waiting for platform publication",
  );
  onProgress?.(acceptedProgress);

  return {
    platform,
    provider: "postiz",
    postId,
    url,
    status: "pending",
    publishedAt,
    jobId,
    compositeRunId,
    coverId,
    title,
    videoPath,
    stub: false,
    postizState: "QUEUE",
    progress: acceptedProgress,
  };
}

export async function publishImageToPostiz({
  platform,
  imagePath,
  title,
  description,
  jobId,
  compositeRunId,
  onProgress,
}: PublishImageToPostizParams): Promise<PostizPublishResult> {
  const publishedAt = new Date().toISOString();
  const type = postizType(platform);
  if (!type) {
    throw new Error(`Platform ${platform} is not supported by Postiz adapter`);
  }
  if (!isPostizImagePlatform(platform)) {
    throw new Error(
      `${platform} does not support image-only posts via Postiz — use video publish or another platform`,
    );
  }

  if (postizPublishMode() === "stub") {
    const postId = `postiz-image-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: "postiz",
      postId,
      url: `https://platform.postiz.com/posts/${postId}`,
      status: "live",
      publishedAt,
      jobId,
      compositeRunId: compositeRunId ?? undefined,
      title,
      imagePath,
      mediaKind: "image",
      stub: true,
      progress: progress(
        "published",
        100,
        "Stub image publish completed (nothing sent to Postiz)",
      ),
    };
  }

  const integrations = loadIntegrations();
  const integrationId = integrations[platform] ?? integrations[type];
  if (!integrationId) {
    throw new Error(
      `No Postiz integration id for ${platform} — set POSTIZ_INTEGRATIONS_JSON or Sync on #/platforms`,
    );
  }

  const integrationIdentifier = postizIntegrationTypeFor(platform) ?? type;
  onProgress?.(progress("uploading_image", 15, "Uploading social card image to Postiz"));
  const image = await uploadMedia(imagePath);
  onProgress?.(progress("uploading_image", 70, "Image uploaded to Postiz"));

  const { content } = postizApiText(platform, title, description);
  const body = {
    type: "now",
    date: publishedAt,
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: integrationId },
        value: [
          {
            content,
            image: [image],
          },
        ],
        settings: buildImageSettings(platform, title, integrationIdentifier),
      },
    ],
  };

  onProgress?.(progress("submitting", 90, "Submitting image post to Postiz"));
  const payload = (await postizFetch("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;

  const posts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.posts)
      ? payload.posts
      : [payload];
  const first = (posts[0] ?? {}) as Record<string, unknown>;
  const postId = String(
    first.id ?? first.postId ?? `postiz-image-${Date.now().toString(36)}`,
  );
  const url = String(
    first.releaseURL ??
      first.url ??
      first.permalink ??
      `${postizDashboardUrl()}/posts/${postId}`,
  );
  const acceptedProgress = progress(
    "accepted",
    100,
    "Postiz accepted the image post; waiting for platform publication",
  );
  onProgress?.(acceptedProgress);

  return {
    platform,
    provider: "postiz",
    postId,
    url,
    status: "pending",
    publishedAt,
    jobId,
    compositeRunId: compositeRunId ?? undefined,
    title,
    imagePath,
    mediaKind: "image",
    stub: false,
    postizState: "QUEUE",
    progress: acceptedProgress,
  };
}

export async function publishImagesAlbumToPostiz({
  platform,
  imagePaths,
  title,
  description,
  jobId,
  compositeRunId,
  onProgress,
}: PublishImagesAlbumToPostizParams): Promise<PostizPublishResult> {
  if (!imagePaths.length) {
    throw new Error("At least one image is required for album publish");
  }
  if (imagePaths.length === 1) {
    return publishImageToPostiz({
      platform,
      imagePath: imagePaths[0],
      title,
      description,
      jobId,
      compositeRunId,
      onProgress,
    });
  }

  const publishedAt = new Date().toISOString();
  const type = postizType(platform);
  if (!type) {
    throw new Error(`Platform ${platform} is not supported by Postiz adapter`);
  }
  if (!isPostizImagePlatform(platform)) {
    throw new Error(
      `${platform} does not support image-only posts via Postiz — use video publish or another platform`,
    );
  }

  if (postizPublishMode() === "stub") {
    const postId = `postiz-album-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: "postiz",
      postId,
      url: `https://platform.postiz.com/posts/${postId}`,
      status: "live",
      publishedAt,
      jobId,
      compositeRunId: compositeRunId ?? undefined,
      title,
      imagePath: imagePaths[0],
      mediaKind: "image",
      stub: true,
      progress: progress(
        "published",
        100,
        `Stub album publish completed (${imagePaths.length} images; nothing sent to Postiz)`,
      ),
    };
  }

  const integrations = loadIntegrations();
  const integrationId = integrations[platform] ?? integrations[type];
  if (!integrationId) {
    throw new Error(
      `No Postiz integration id for ${platform} — set POSTIZ_INTEGRATIONS_JSON or Sync on #/platforms`,
    );
  }

  const integrationIdentifier = postizIntegrationTypeFor(platform) ?? type;
  const uploaded = [];
  for (let index = 0; index < imagePaths.length; index += 1) {
    const pct = 10 + Math.round((index / imagePaths.length) * 60);
    onProgress?.(progress(
      "uploading_image",
      pct,
      `Uploading infographic ${index + 1}/${imagePaths.length} to Postiz`,
    ));
    uploaded.push(await uploadMedia(imagePaths[index]));
  }

  const { content } = postizApiText(platform, title, description);
  const body = {
    type: "now",
    date: publishedAt,
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: integrationId },
        value: [
          {
            content,
            image: uploaded,
          },
        ],
        settings: buildImageSettings(
          platform,
          title,
          integrationIdentifier,
          uploaded.length > 1,
        ),
      },
    ],
  };

  onProgress?.(progress("submitting", 90, "Submitting infographic album to Postiz"));
  const payload = (await postizFetch("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;

  const posts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.posts)
      ? payload.posts
      : [payload];
  const first = (posts[0] ?? {}) as Record<string, unknown>;
  const postId = String(
    first.id ?? first.postId ?? `postiz-album-${Date.now().toString(36)}`,
  );
  const url = String(
    first.releaseURL ??
      first.url ??
      first.permalink ??
      `${postizDashboardUrl()}/posts/${postId}`,
  );
  const acceptedProgress = progress(
    "accepted",
    100,
    "Postiz accepted the infographic album; waiting for platform publication",
  );
  onProgress?.(acceptedProgress);

  return {
    platform,
    provider: "postiz",
    postId,
    url,
    status: "pending",
    publishedAt,
    jobId,
    compositeRunId: compositeRunId ?? undefined,
    title,
    imagePath: imagePaths[0],
    mediaKind: "image",
    stub: false,
    postizState: "QUEUE",
    progress: acceptedProgress,
  };
}

export async function hidePostizPost(
  postId: string,
): Promise<{ postId: string; status: "hidden"; stub?: boolean }> {
  if (postizPublishMode() === "stub") {
    return { postId, status: "hidden", stub: true };
  }
  // Postiz public API has no dedicated "hide"; best-effort delete from queue.
  await postizFetch(`/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
  return { postId, status: "hidden" };
}

export async function deletePostizPost(
  postId: string,
): Promise<{ postId: string; status: "deleted"; stub?: boolean }> {
  if (postizPublishMode() === "stub") {
    return { postId, status: "deleted", stub: true };
  }
  await postizFetch(`/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
  return { postId, status: "deleted" };
}

export function isPostizPlatform(platform: string): boolean {
  return Boolean(postizType(platform));
}

export function isPostizImagePlatform(platform: string): boolean {
  return (POSTIZ_IMAGE_PLATFORMS as readonly string[]).includes(platform);
}

export function postizPublishMode(): "stub" | "live" {
  return (Deno.env.get("POSTIZ_PUBLISH_MODE") ?? "stub") === "live"
    ? "live"
    : "stub";
}

export function hasPostizApiKey(): boolean {
  return Boolean(Deno.env.get("POSTIZ_API_KEY")?.trim());
}

export function postizIntegrationIdFor(platform: string): string | null {
  const integrations = loadIntegrations();
  const mapped = postizType(platform);
  return (
    integrations[platform] ?? (mapped ? (integrations[mapped] ?? null) : null)
  );
}

export function postizDashboardUrl(): string {
  return (
    Deno.env.get("POSTIZ_DASHBOARD_URL") ?? "http://localhost:4007"
  ).replace(/\/+$/, "");
}

export function postizSignupUrl(): string {
  return postizDashboardUrl();
}

export function postizApiKeysUrl(): string {
  return `${postizDashboardUrl()}/settings`;
}

export function postizDocsUrl(): string {
  return "https://docs.postiz.com/public-api/introduction";
}

export function postizEnvDocs(): string[] {
  return [
    "POSTIZ_API_KEY — local Postiz → Settings → Developers → Public API",
    "POSTIZ_API_BASE — default http://localhost:4007/api/public/v1",
    "POSTIZ_DASHBOARD_URL — default http://localhost:4007",
    "POSTIZ_INTEGRATIONS_JSON — Sync on #/platforms after connecting channels",
    "POSTIZ_INTEGRATION_TYPES_JSON — saved by Sync so provider settings match the connected channel",
    "POSTIZ_PUBLISH_MODE — stub|live (default stub)",
  ];
}

function outdoorPlatformForPostiz(identifier: string): string | null {
  const normalized = identifier.toLowerCase();
  if (normalized === "twitter") return "x";
  if (normalized === "instagram-standalone") return "instagram";
  if (normalized === "linkedin-page") return "linkedin";
  for (const [outdoor, mapped] of Object.entries(POSTIZ_PLATFORM_MAP)) {
    if (mapped === normalized && outdoor !== "twitter") {
      return outdoor;
    }
  }
  return null;
}

export async function listPostizIntegrations(): Promise<
  PostizConnectedIntegration[]
> {
  if (!hasPostizApiKey()) {
    return [];
  }
  const payload = await postizFetch("/integrations", { method: "GET" });
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { integrations?: unknown[] }).integrations)
      ? (payload as { integrations: unknown[] }).integrations
      : Array.isArray((payload as { channels?: unknown[] }).channels)
        ? (payload as { channels: unknown[] }).channels
        : [];

  const out: PostizConnectedIntegration[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "");
    const identifier = String(
      row.identifier ??
        row.providerIdentifier ??
        row.platform ??
        row.__type ??
        "",
    );
    if (!id || !identifier) continue;
    out.push({
      id,
      identifier,
      outdoorPlatform: outdoorPlatformForPostiz(identifier),
      name:
        typeof row.name === "string"
          ? row.name
          : typeof row.display === "string"
            ? row.display
            : null,
      picture: typeof row.picture === "string" ? row.picture : null,
    });
  }
  return out;
}

export function suggestedPostizIntegrationTypesJson(
  integrations: PostizConnectedIntegration[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of integrations) {
    if (!entry.outdoorPlatform || out[entry.outdoorPlatform]) {
      continue;
    }
    out[entry.outdoorPlatform] = entry.identifier;
  }
  return out;
}

export function suggestedPostizIntegrationsJson(
  integrations: PostizConnectedIntegration[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of integrations) {
    if (!entry.outdoorPlatform) continue;
    if (!out[entry.outdoorPlatform]) {
      out[entry.outdoorPlatform] = entry.id;
    }
  }
  return out;
}

function postizConnectIdentifier(platform: string): string | null {
  if (platform === "instagram") {
    return "instagram-standalone";
  }
  return postizType(platform);
}

export async function getPostizConnectUrl(
  platform: string,
  refreshIntegrationId?: string | null,
): Promise<{ platform: string; identifier: string; url: string }> {
  let identifier = postizConnectIdentifier(platform);
  if (refreshIntegrationId) {
    const connected = await listPostizIntegrations();
    const existing = connected.find(
      (integration) => integration.id === refreshIntegrationId,
    );
    if (existing?.identifier) {
      identifier = existing.identifier;
    }
  }
  if (!identifier) {
    throw new Error(`Postiz does not support OAuth connect for ${platform}`);
  }
  const refresh = refreshIntegrationId
    ? `?refresh=${encodeURIComponent(refreshIntegrationId)}`
    : "";
  const payload = (await postizFetch(
    `/social/${encodeURIComponent(identifier)}${refresh}`,
    { method: "GET" },
  )) as Record<string, unknown>;
  const url = typeof payload.url === "string" ? payload.url : "";
  if (!url) {
    throw new Error(`Postiz did not return an OAuth URL for ${platform}`);
  }
  return { platform, identifier, url };
}

// Public API is limited to 30 requests/hour; provider schemas rarely change.
const SETTINGS_CACHE_MS = 60 * 60 * 1000;
const settingsCache = new Map<
  string,
  { expiresAt: number; value: PostizIntegrationSettings }
>();

export async function getPostizIntegrationSettings(
  integrationId: string,
): Promise<PostizIntegrationSettings> {
  const cached = settingsCache.get(integrationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const payload = (await postizFetch(
    `/integration-settings/${encodeURIComponent(integrationId)}`,
    { method: "GET" },
  )) as Record<string, unknown>;
  const raw =
    payload.output && typeof payload.output === "object"
      ? (payload.output as Record<string, unknown>)
      : payload;
  const tools = Array.isArray(raw.tools)
    ? raw.tools
        .filter((tool): tool is Record<string, unknown> =>
          Boolean(tool && typeof tool === "object")
        )
        .map((tool) => ({
          methodName:
            typeof tool.methodName === "string" ? tool.methodName : "",
          description:
            typeof tool.description === "string" ? tool.description : "",
        }))
        .filter((tool) => Boolean(tool.methodName))
    : [];
  const value: PostizIntegrationSettings = {
    rules: typeof raw.rules === "string" ? raw.rules : "",
    maxLength: typeof raw.maxLength === "number" ? raw.maxLength : null,
    settings: raw.settings ?? null,
    tools,
  };
  settingsCache.set(integrationId, {
    expiresAt: Date.now() + SETTINGS_CACHE_MS,
    value,
  });
  return value;
}

export async function listPostizRecentPosts(
  lookbackDays = 30,
): Promise<PostizRecentPost[]> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - lookbackDays);
  const payload = (await postizFetch(
    `/posts?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`,
    { method: "GET" },
  )) as Record<string, unknown>;
  const rows = Array.isArray(payload.posts) ? payload.posts : [];
  return rows
    .filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object")
    )
    .map((row) => {
      const integration =
        row.integration && typeof row.integration === "object"
          ? (row.integration as Record<string, unknown>)
          : null;
      const rawState = typeof row.state === "string" ? row.state : "UNKNOWN";
      const state: PostizRecentPost["state"] =
        rawState === "QUEUE" ||
        rawState === "PUBLISHED" ||
        rawState === "ERROR" ||
        rawState === "DRAFT"
          ? rawState
          : "UNKNOWN";
      return {
        id: String(row.id ?? row.postId ?? ""),
        content: typeof row.content === "string" ? row.content : "",
        publishDate:
          typeof row.publishDate === "string" ? row.publishDate : null,
        releaseURL:
          typeof row.releaseURL === "string" ? row.releaseURL : null,
        state,
        integration: integration
          ? {
              id: String(integration.id ?? ""),
              identifier: String(
                integration.providerIdentifier ??
                  integration.identifier ??
                  "",
              ),
              name: String(integration.name ?? ""),
            }
          : null,
      };
    })
    .filter((row) => Boolean(row.id))
    .sort((left, right) =>
      String(right.publishDate ?? "").localeCompare(
        String(left.publishDate ?? ""),
      )
    );
}

export async function listPostizNotifications(): Promise<
  PostizNotification[]
> {
  const payload = (await postizFetch("/notifications?page=0", {
    method: "GET",
  })) as Record<string, unknown>;
  const rows = Array.isArray(payload.notifications)
    ? payload.notifications
    : [];
  return rows
    .filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object")
    )
    .map((row) => ({
      id: String(row.id ?? ""),
      content: typeof row.content === "string" ? row.content : "",
      link: typeof row.link === "string" ? row.link : null,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    }))
    .filter((row) => Boolean(row.id));
}

export async function buildPostizOverview(): Promise<PostizOverview> {
  if (!hasPostizApiKey()) {
    return {
      checkedAt: new Date().toISOString(),
      apiConnected: false,
      message: "Paste a Postiz API key and save it first.",
      mode: postizPublishMode(),
      dashboardUrl: postizDashboardUrl(),
      integrations: [],
      recentPosts: [],
      notifications: [],
      errors: [],
    };
  }

  const errors: string[] = [];
  let integrations: PostizConnectedIntegration[] = [];
  try {
    integrations = await listPostizIntegrations();
  } catch (error) {
    return {
      checkedAt: new Date().toISOString(),
      apiConnected: false,
      message: error instanceof Error ? error.message : String(error),
      mode: postizPublishMode(),
      dashboardUrl: postizDashboardUrl(),
      integrations: [],
      recentPosts: [],
      notifications: [],
      errors: [],
    };
  }

  const detailed = await Promise.all(
    integrations.map(async (integration) => {
      try {
        const settings = await getPostizIntegrationSettings(integration.id);
        return { ...integration, settings, settingsError: null };
      } catch (error) {
        return {
          ...integration,
          settings: null,
          settingsError: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  let recentPosts: PostizRecentPost[] = [];
  let notifications: PostizNotification[] = [];
  try {
    recentPosts = await listPostizRecentPosts();
  } catch (error) {
    errors.push(
      `Recent posts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    notifications = await listPostizNotifications();
  } catch (error) {
    errors.push(
      `Notifications: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    checkedAt: new Date().toISOString(),
    apiConnected: true,
    message: `Postiz API connected · ${integrations.length} channel(s)`,
    mode: postizPublishMode(),
    dashboardUrl: postizDashboardUrl(),
    integrations: detailed,
    recentPosts: recentPosts.slice(0, 30),
    notifications: notifications.slice(0, 30),
    errors,
  };
}

export async function testPostizConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!hasPostizApiKey()) {
    return { ok: false, message: "POSTIZ_API_KEY is not set" };
  }
  try {
    const integrations = await listPostizIntegrations();
    return {
      ok: true,
      message: `Postiz API key accepted (${integrations.length} channel(s)) · publish mode ${postizPublishMode()}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const POSTIZ_PLATFORMS = Object.keys(POSTIZ_PLATFORM_MAP).filter(
  (key) => key !== "twitter",
);
