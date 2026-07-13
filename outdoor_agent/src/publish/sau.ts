import path from 'node:path';

import type { PublishRecord } from '../schema.ts';
import { runCommand } from '../subprocess.ts';

/**
 * social-auto-upload CLI adapter for China platforms.
 *
 * Env:
 *   SAU_BIN (default: sau)
 *   SAU_ACCOUNT (default account name for all china platforms)
 *   SAU_PUBLISH_MODE=stub|live (default stub)
 *   SAU_REPO (optional path to social-auto-upload checkout)
 */

const SAU_PLATFORM_MAP: Record<string, string | null> = {
  bilibili: 'bilibili',
  douyin: 'douyin',
  xiaohongshu: 'xiaohongshu',
  kuaishou: 'kuaishou',
  wechat_channels: 'tencent',
  weibo: null,
};

type PublishToSauParams = {
  platform: string;
  videoPath: string;
  title: string;
  description: string;
  jobId: string;
  compositeRunId: string;
  thumbnailPath?: string;
  coverId?: string;
};

type SauPublishResult = PublishRecord & {
  title: string;
  videoPath: string;
  stub: boolean;
  note?: string;
  sauOutput?: string;
};

type SauPostActionResult = {
  postId: string;
  status: 'hidden' | 'deleted';
  stub?: boolean;
};

function sauBin(): string {
  return Deno.env.get('SAU_BIN') ?? 'sau';
}

function sauAccount(platform: string): string {
  const key = `SAU_ACCOUNT_${platform.toUpperCase()}`;
  return Deno.env.get(key) ?? Deno.env.get('SAU_ACCOUNT') ?? 'default';
}

async function runSau(args: string[]): Promise<string> {
  return runCommand(sauBin(), args);
}

export async function publishToSau({
  platform,
  videoPath,
  title,
  description,
  jobId,
  compositeRunId,
  thumbnailPath,
  coverId,
}: PublishToSauParams): Promise<SauPublishResult> {
  const mode = Deno.env.get('SAU_PUBLISH_MODE') ?? 'stub';
  const publishedAt = new Date().toISOString();
  const sauPlatform = SAU_PLATFORM_MAP[platform];

  if (!sauPlatform) {
    throw new Error(
      `Platform ${platform} is not supported by social-auto-upload yet (weibo needs manual publish)`,
    );
  }

  if (mode === 'stub') {
    const postId = `sau-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: 'social-auto-upload',
      postId,
      url: `https://example.invalid/${platform}/${postId}`,
      status: 'live',
      publishedAt,
      jobId,
      compositeRunId,
      coverId,
      title,
      videoPath,
      stub: true,
      note: `Install social-auto-upload and set SAU_PUBLISH_MODE=live. Run: sau ${sauPlatform} login`,
    };
  }

  const account = sauAccount(platform);
  const args = [
    sauPlatform,
    'upload-video',
    '--account',
    account,
    '--file',
    path.resolve(videoPath),
    '--title',
    title,
    '--desc',
    description,
  ];

  if (thumbnailPath) {
    // Best-effort: many SAU platform CLIs accept --thumbnail; unsupported ones ignore/fail later.
    args.push('--thumbnail', path.resolve(thumbnailPath));
  }

  if (sauPlatform === 'bilibili') {
    args.push('--tid', Deno.env.get('SAU_BILIBILI_TID') ?? '249');
  }

  const output = await runSau(args);
  const postId = `sau-${platform}-${path.basename(videoPath, path.extname(videoPath))}`;

  return {
    platform,
    provider: 'social-auto-upload',
    postId,
    url: extractUrl(output) ?? `https://example.invalid/${platform}/${postId}`,
    status: 'live',
    publishedAt,
    jobId,
    compositeRunId,
    coverId,
    title,
    videoPath,
    stub: false,
    sauOutput: output.slice(0, 500),
  };
}

function extractUrl(output: string): string | null {
  const match = /https?:\/\/[^\s]+/i.exec(output);
  return match?.[0] ?? null;
}

export async function hideSauPost(platform: string, postId: string): Promise<SauPostActionResult> {
  if ((Deno.env.get('SAU_PUBLISH_MODE') ?? 'stub') === 'stub') {
    return { postId, status: 'hidden', stub: true };
  }
  throw new Error(`Hide not automated for ${platform} via social-auto-upload — hide in creator studio`);
}

export async function deleteSauPost(platform: string, postId: string): Promise<SauPostActionResult> {
  if ((Deno.env.get('SAU_PUBLISH_MODE') ?? 'stub') === 'stub') {
    return { postId, status: 'deleted', stub: true };
  }
  throw new Error(
    `Delete not automated for ${platform} via social-auto-upload — delete in creator studio`,
  );
}

export function isSauPlatform(platform: string): boolean {
  return Boolean(SAU_PLATFORM_MAP[platform]);
}

export function sauPublishMode(): 'stub' | 'live' {
  return (Deno.env.get('SAU_PUBLISH_MODE') ?? 'stub') === 'live' ? 'live' : 'stub';
}

export function sauAccountName(platform: string): string {
  return sauAccount(platform);
}

export function sauCliPlatform(platform: string): string | null {
  return SAU_PLATFORM_MAP[platform] ?? null;
}

export function sauDashboardHint(): string {
  return 'Use the social-auto-upload CLI: sau <platform> login --account <name>';
}

export function sauEnvDocs(): string[] {
  return [
    'SAU_BIN — CLI binary (default sau)',
    'SAU_ACCOUNT — default account name',
    'SAU_ACCOUNT_<PLATFORM> — optional per-platform override (e.g. SAU_ACCOUNT_BILIBILI)',
    'SAU_PUBLISH_MODE — stub|live (default stub)',
    'SAU_BILIBILI_TID — Bilibili partition id (default 249)',
    'Login: sau bilibili login --account default (repeat per platform)',
  ];
}

export async function testSauConnection(): Promise<{ ok: boolean; message: string }> {
  if (sauPublishMode() === 'stub') {
    return {
      ok: true,
      message: 'SAU is in stub mode — publishes will not run the CLI.',
    };
  }
  try {
    const output = await runSau(['--help']);
    const snippet = output.trim().slice(0, 120) || 'sau responded';
    return { ok: true, message: `SAU CLI reachable (${sauBin()}): ${snippet}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const SAU_PLATFORMS = Object.entries(SAU_PLATFORM_MAP)
  .filter(([, value]) => value)
  .map(([key]) => key);

/** Platforms listed in China social packs but not automatable via SAU yet. */
export const SAU_MANUAL_PLATFORMS = Object.entries(SAU_PLATFORM_MAP)
  .filter(([, value]) => !value)
  .map(([key]) => key);
