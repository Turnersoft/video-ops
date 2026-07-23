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

import path from 'node:path';

import type { PublishRecord } from '../schema.ts';

/** Outdoor platform → Postiz settings.__type / providerIdentifier */
const POSTIZ_PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  x: 'x',
  twitter: 'x',
  linkedin: 'linkedin',
  instagram: 'instagram',
  tiktok: 'tiktok',
  facebook: 'facebook',
  bluesky: 'bluesky',
  threads: 'threads',
  reddit: 'reddit',
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
};

type PostizPublishResult = PublishRecord & {
  title: string;
  videoPath: string;
  stub: boolean;
};

export type PostizConnectedIntegration = {
  id: string;
  identifier: string;
  outdoorPlatform: string | null;
  name: string | null;
};

function apiBase(): string {
  return (Deno.env.get('POSTIZ_API_BASE') ?? 'https://api.postiz.com/public/v1').replace(
    /\/+$/,
    '',
  );
}

function loadIntegrations(): Record<string, string> {
  const raw = Deno.env.get('POSTIZ_INTEGRATIONS_JSON') ?? '{}';
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function requireApiKey(): string {
  const key = Deno.env.get('POSTIZ_API_KEY')?.trim();
  if (!key) {
    throw new Error('POSTIZ_API_KEY is not set on the Mac agent');
  }
  return key;
}

function postizType(platform: string): string | null {
  return POSTIZ_PLATFORM_MAP[platform] ?? null;
}

async function postizFetch(
  pathname: string,
  init: RequestInit = {},
): Promise<Record<string, unknown> | unknown[]> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', requireApiKey());
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${apiBase()}${pathname}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  let payload: Record<string, unknown> | unknown[] = {};
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown> | unknown[]) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const errorObj = !Array.isArray(payload) ? payload : null;
    const error = errorObj?.error ?? errorObj?.message ?? errorObj?.raw;
    throw new Error(
      typeof error === 'string' ? error : `Postiz HTTP ${response.status}`,
    );
  }
  return payload;
}

function buildSettings(
  platform: string,
  title: string,
  thumbnail?: { id: string; path: string } | null,
): Record<string, unknown> {
  const type = postizType(platform);
  if (!type) {
    throw new Error(`Unsupported Postiz platform: ${platform}`);
  }
  switch (type) {
    case 'youtube':
      return {
        __type: 'youtube',
        title: title.slice(0, 100),
        type: 'public',
        selfDeclaredMadeForKids: 'no',
        thumbnail: thumbnail ?? null,
        tags: [],
      };
    case 'tiktok':
      return {
        __type: 'tiktok',
        title: title.slice(0, 90),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        duet: true,
        stitch: true,
        comment: true,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        content_posting_method: 'DIRECT_POST',
      };
    case 'instagram':
    case 'instagram-standalone':
      return {
        __type: 'instagram',
        post_type: 'post',
      };
    case 'x':
      return {
        __type: 'x',
        who_can_reply_post: 'everyone',
      };
    case 'reddit':
      return {
        __type: 'reddit',
        subreddit: [],
      };
    case 'linkedin':
    case 'facebook':
    case 'bluesky':
    case 'threads':
      return { __type: type };
    default:
      return { __type: type };
  }
}

async function uploadMedia(filePath: string): Promise<{ id: string; path: string }> {
  const bytes = await Deno.readFile(filePath);
  const form = new FormData();
  form.append(
    'file',
    new Blob([bytes]),
    path.basename(filePath),
  );
  const payload = await postizFetch('/upload', {
    method: 'POST',
    body: form,
  }) as Record<string, unknown>;
  const id = String(payload.id ?? '');
  const mediaPath = String(payload.path ?? '');
  if (!id || !mediaPath) {
    throw new Error('Postiz upload did not return id/path');
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
}: PublishToPostizParams): Promise<PostizPublishResult> {
  const publishedAt = new Date().toISOString();
  const type = postizType(platform);
  if (!type) {
    throw new Error(`Platform ${platform} is not supported by Postiz adapter`);
  }

  if (postizPublishMode() === 'stub') {
    const postId = `postiz-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: 'postiz',
      postId,
      url: `https://platform.postiz.com/posts/${postId}`,
      status: 'live',
      publishedAt,
      jobId,
      compositeRunId,
      coverId,
      title,
      videoPath,
      stub: true,
    };
  }

  const integrations = loadIntegrations();
  const integrationId = integrations[platform] ?? integrations[type];
  if (!integrationId) {
    throw new Error(
      `No Postiz integration id for ${platform} — set POSTIZ_INTEGRATIONS_JSON or Sync on #/platforms`,
    );
  }

  const video = await uploadMedia(videoPath);
  let thumbnail: { id: string; path: string } | null = null;
  if (thumbnailPath) {
    try {
      thumbnail = await uploadMedia(thumbnailPath);
    } catch (error) {
      console.warn(
        '[postiz] thumbnail upload failed:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  const content = [title, description].filter((part) => part?.trim()).join('\n\n');
  const body = {
    type: 'now',
    date: publishedAt,
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: integrationId },
        value: [
          {
            content: content || title,
            image: [video],
          },
        ],
        settings: buildSettings(platform, title, thumbnail),
      },
    ],
  };

  const payload = await postizFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Record<string, unknown>;

  const posts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.posts)
    ? payload.posts
    : [payload];
  const first = (posts[0] ?? {}) as Record<string, unknown>;
  const postId = String(first.id ?? first.postId ?? `postiz-${Date.now().toString(36)}`);
  const url = String(
    first.releaseURL ?? first.url ?? first.permalink ?? `${postizDashboardUrl()}/posts/${postId}`,
  );

  return {
    platform,
    provider: 'postiz',
    postId,
    url,
    status: 'live',
    publishedAt,
    jobId,
    compositeRunId,
    coverId,
    title,
    videoPath,
    stub: false,
  };
}

export async function hidePostizPost(postId: string): Promise<{ postId: string; status: 'hidden'; stub?: boolean }> {
  if (postizPublishMode() === 'stub') {
    return { postId, status: 'hidden', stub: true };
  }
  // Postiz public API has no dedicated "hide"; best-effort delete from queue.
  await postizFetch(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  return { postId, status: 'hidden' };
}

export async function deletePostizPost(postId: string): Promise<{ postId: string; status: 'deleted'; stub?: boolean }> {
  if (postizPublishMode() === 'stub') {
    return { postId, status: 'deleted', stub: true };
  }
  await postizFetch(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  return { postId, status: 'deleted' };
}

export function isPostizPlatform(platform: string): boolean {
  return Boolean(postizType(platform));
}

export function postizPublishMode(): 'stub' | 'live' {
  return (Deno.env.get('POSTIZ_PUBLISH_MODE') ?? 'stub') === 'live' ? 'live' : 'stub';
}

export function hasPostizApiKey(): boolean {
  return Boolean(Deno.env.get('POSTIZ_API_KEY')?.trim());
}

export function postizIntegrationIdFor(platform: string): string | null {
  const integrations = loadIntegrations();
  const mapped = postizType(platform);
  return integrations[platform] ?? (mapped ? integrations[mapped] ?? null : null);
}

export function postizDashboardUrl(): string {
  return (Deno.env.get('POSTIZ_DASHBOARD_URL') ?? 'https://platform.postiz.com').replace(/\/+$/, '');
}

export function postizSignupUrl(): string {
  return 'https://platform.postiz.com';
}

export function postizApiKeysUrl(): string {
  return `${postizDashboardUrl()}/settings`;
}

export function postizDocsUrl(): string {
  return 'https://docs.postiz.com/public-api';
}

export function postizEnvDocs(): string[] {
  return [
    'POSTIZ_API_KEY — platform.postiz.com → Settings → Developers → Public API',
    'POSTIZ_API_BASE — default https://api.postiz.com/public/v1',
    'POSTIZ_DASHBOARD_URL — default https://platform.postiz.com',
    'POSTIZ_INTEGRATIONS_JSON — Sync on #/platforms after connecting channels',
    'POSTIZ_PUBLISH_MODE — stub|live (default stub)',
  ];
}

function outdoorPlatformForPostiz(identifier: string): string | null {
  const normalized = identifier.toLowerCase();
  if (normalized === 'twitter') return 'x';
  if (normalized === 'instagram-standalone') return 'instagram';
  if (normalized === 'linkedin-page') return 'linkedin';
  for (const [outdoor, mapped] of Object.entries(POSTIZ_PLATFORM_MAP)) {
    if (mapped === normalized && outdoor !== 'twitter') {
      return outdoor;
    }
  }
  return null;
}

export async function listPostizIntegrations(): Promise<PostizConnectedIntegration[]> {
  if (!hasPostizApiKey()) {
    return [];
  }
  const payload = await postizFetch('/integrations', { method: 'GET' });
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { integrations?: unknown[] }).integrations)
    ? (payload as { integrations: unknown[] }).integrations
    : Array.isArray((payload as { channels?: unknown[] }).channels)
    ? (payload as { channels: unknown[] }).channels
    : [];

  const out: PostizConnectedIntegration[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? '');
    const identifier = String(
      row.identifier ?? row.providerIdentifier ?? row.platform ?? row.__type ?? '',
    );
    if (!id || !identifier) continue;
    out.push({
      id,
      identifier,
      outdoorPlatform: outdoorPlatformForPostiz(identifier),
      name: typeof row.name === 'string'
        ? row.name
        : typeof row.display === 'string'
        ? row.display
        : null,
    });
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

export async function testPostizConnection(): Promise<{ ok: boolean; message: string }> {
  if (postizPublishMode() === 'stub') {
    return {
      ok: true,
      message: 'Postiz is in stub mode — publishes will not hit the network.',
    };
  }
  if (!hasPostizApiKey()) {
    return { ok: false, message: 'POSTIZ_API_KEY is not set' };
  }
  try {
    const integrations = await listPostizIntegrations();
    return {
      ok: true,
      message: `Postiz API key accepted (${integrations.length} channel(s)).`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const POSTIZ_PLATFORMS = Object.keys(POSTIZ_PLATFORM_MAP).filter((key) => key !== 'twitter');
