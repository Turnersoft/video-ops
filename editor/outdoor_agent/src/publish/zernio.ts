/**
 * Zernio adapter for english / global social platforms.
 * Docs: https://zernio.com/social-media-api
 *
 * Env:
 *   ZERNIO_API_KEY
 *   ZERNIO_API_BASE (optional, default https://zernio.com/api/v1)
 *   ZERNIO_ACCOUNTS_JSON — {"youtube":"acc_xxx","x":"acc_yyy",...}
 *   ZERNIO_PUBLISH_MODE=stub|live (default stub)
 */

import type { PublishRecord } from '../schema.ts';

const ZERNIO_PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  x: 'twitter',
  twitter: 'twitter',
  linkedin: 'linkedin',
  instagram: 'instagram',
  tiktok: 'tiktok',
  facebook: 'facebook',
  bluesky: 'bluesky',
  threads: 'threads',
  reddit: 'reddit',
};

type PublishToZernioParams = {
  platform: string;
  videoPath: string;
  title: string;
  description: string;
  jobId: string;
  compositeRunId: string;
  thumbnailPath?: string;
  coverId?: string;
};

type ZernioPublishResult = PublishRecord & {
  title: string;
  videoPath: string;
  stub: boolean;
};

type ZernioPostActionResult = {
  postId: string;
  status: 'hidden' | 'deleted';
  stub?: boolean;
};

function apiBase(): string {
  return (Deno.env.get('ZERNIO_API_BASE') ?? 'https://zernio.com/api/v1').replace(/\/+$/, '');
}

function loadAccounts(): Record<string, string> {
  const raw = Deno.env.get('ZERNIO_ACCOUNTS_JSON') ?? '{}';
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function requireApiKey(): string {
  const key = Deno.env.get('ZERNIO_API_KEY');
  if (!key) {
    throw new Error('ZERNIO_API_KEY is not set on the Mac agent');
  }
  return key;
}

function zernioPlatformId(platform: string): string | null {
  return ZERNIO_PLATFORM_MAP[platform] ?? null;
}

async function zernioFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const error = payload.error ?? payload.message;
    throw new Error(
      typeof error === 'string' ? error : `Zernio HTTP ${response.status}`,
    );
  }
  return payload;
}

export async function publishToZernio({
  platform,
  videoPath,
  title,
  description,
  jobId,
  compositeRunId,
  thumbnailPath,
  coverId,
}: PublishToZernioParams): Promise<ZernioPublishResult> {
  const mode = Deno.env.get('ZERNIO_PUBLISH_MODE') ?? 'stub';
  const publishedAt = new Date().toISOString();
  const zernioPlatform = zernioPlatformId(platform);
  if (!zernioPlatform) {
    throw new Error(`Platform ${platform} is not mapped for Zernio`);
  }

  if (mode === 'stub') {
    const postId = `zernio-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: 'zernio',
      postId,
      url: `https://zernio.com/posts/${postId}`,
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

  const accounts = loadAccounts();
  const accountId = accounts[platform] ?? accounts[zernioPlatform];
  if (!accountId) {
    throw new Error(
      `No Zernio account for ${platform}. Set ZERNIO_ACCOUNTS_JSON with "${platform}": "acc_..."`,
    );
  }

  const content = [title, description].filter(Boolean).join('\n\n');
  const media: Array<{ path: string; type: string }> = [{ path: videoPath, type: 'video' }];
  if (thumbnailPath) {
    media.push({ path: thumbnailPath, type: 'image' });
  }
  const payload = await zernioFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      content,
      platforms: [
        {
          platform: zernioPlatform,
          accountId,
          platformSpecificContent: description || title,
        },
      ],
      media,
      publishNow: true,
    }),
  });

  const post = (payload.data ?? payload.post ?? payload) as Record<string, unknown>;
  const postId = String(post.id ?? post.postId ?? `zernio-${Date.now().toString(36)}`);
  const url = String(post.url ?? post.permalink ?? `https://zernio.com/posts/${postId}`);

  return {
    platform,
    provider: 'zernio',
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

export async function hideZernioPost(postId: string): Promise<ZernioPostActionResult> {
  if ((Deno.env.get('ZERNIO_PUBLISH_MODE') ?? 'stub') === 'stub') {
    return { postId, status: 'hidden', stub: true };
  }
  await zernioFetch(`/posts/${encodeURIComponent(postId)}/unpublish`, { method: 'POST' });
  return { postId, status: 'hidden' };
}

export async function deleteZernioPost(postId: string): Promise<ZernioPostActionResult> {
  if ((Deno.env.get('ZERNIO_PUBLISH_MODE') ?? 'stub') === 'stub') {
    return { postId, status: 'deleted', stub: true };
  }
  await zernioFetch(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  return { postId, status: 'deleted' };
}

export function isZernioPlatform(platform: string): boolean {
  return Boolean(zernioPlatformId(platform));
}

export function zernioPublishMode(): 'stub' | 'live' {
  return (Deno.env.get('ZERNIO_PUBLISH_MODE') ?? 'stub') === 'live' ? 'live' : 'stub';
}

export function hasZernioApiKey(): boolean {
  return Boolean(Deno.env.get('ZERNIO_API_KEY')?.trim());
}

export function zernioAccountIdFor(platform: string): string | null {
  const accounts = loadAccounts();
  const mapped = zernioPlatformId(platform);
  return accounts[platform] ?? (mapped ? accounts[mapped] ?? null : null);
}

export function zernioDashboardUrl(): string {
  return 'https://zernio.com/dashboard';
}

export function zernioSignupUrl(): string {
  return 'https://zernio.com/signup';
}

export function zernioApiKeysUrl(): string {
  return 'https://zernio.com/dashboard/api-keys';
}

export function zernioConnectGuideUrl(): string {
  return 'https://docs.zernio.com/guides/connecting-accounts';
}

export function zernioEnvDocs(): string[] {
  return [
    'ZERNIO_API_KEY — API bearer token (required for live)',
    'ZERNIO_ACCOUNTS_JSON — {"youtube":"acc_…","x":"acc_…",…}',
    'ZERNIO_PUBLISH_MODE — stub|live (default stub)',
    'ZERNIO_API_BASE — optional, default https://zernio.com/api/v1',
  ];
}

export type ZernioConnectedAccount = {
  id: string;
  platform: string;
  outdoorPlatform: string | null;
  username: string | null;
};

/** Map Zernio API platform ids back to outdoor social keys. */
function outdoorPlatformForZernio(zernioPlatform: string): string | null {
  const normalized = zernioPlatform.toLowerCase();
  if (normalized === 'twitter') return 'x';
  for (const [outdoor, mapped] of Object.entries(ZERNIO_PLATFORM_MAP)) {
    if (mapped === normalized && outdoor !== 'twitter') {
      return outdoor;
    }
  }
  return null;
}

export async function listZernioConnectedAccounts(): Promise<ZernioConnectedAccount[]> {
  if (!hasZernioApiKey()) {
    return [];
  }
  const payload = await zernioFetch('/accounts', { method: 'GET' });
  const raw = (payload.accounts ?? payload.data ?? payload) as unknown;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { accounts?: unknown[] })?.accounts)
    ? (raw as { accounts: unknown[] }).accounts
    : [];
  const accounts: ZernioConnectedAccount[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const id = String(row._id ?? row.id ?? row.accountId ?? '');
    const platform = String(row.platform ?? '');
    if (!id || !platform) continue;
    accounts.push({
      id,
      platform,
      outdoorPlatform: outdoorPlatformForZernio(platform),
      username: typeof row.username === 'string'
        ? row.username
        : typeof row.displayName === 'string'
        ? row.displayName
        : null,
    });
  }
  return accounts;
}

export function suggestedZernioAccountsJson(accounts: ZernioConnectedAccount[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const account of accounts) {
    if (!account.outdoorPlatform) continue;
    // Prefer first account per outdoor platform.
    if (!out[account.outdoorPlatform]) {
      out[account.outdoorPlatform] = account.id;
    }
  }
  return out;
}

export async function testZernioConnection(): Promise<{ ok: boolean; message: string }> {
  if (zernioPublishMode() === 'stub') {
    return {
      ok: true,
      message: 'Zernio is in stub mode — publishes will not hit the network.',
    };
  }
  if (!hasZernioApiKey()) {
    return { ok: false, message: 'ZERNIO_API_KEY is not set' };
  }
  try {
    await zernioFetch('/accounts', { method: 'GET' });
    return { ok: true, message: 'Zernio API key accepted (accounts reachable).' };
  } catch (error) {
    // Some plans may not expose /accounts; treat auth-ish failures clearly.
    const message = error instanceof Error ? error.message : String(error);
    if (/401|403|unauthorized|forbidden/i.test(message)) {
      return { ok: false, message: `Zernio auth failed: ${message}` };
    }
    try {
      await zernioFetch('/posts?limit=1', { method: 'GET' });
      return { ok: true, message: 'Zernio API key accepted.' };
    } catch (second) {
      return {
        ok: false,
        message: second instanceof Error ? second.message : String(second),
      };
    }
  }
}

export const ZERNIO_PLATFORMS = Object.keys(ZERNIO_PLATFORM_MAP);
