import path from 'node:path';

import { REPO_ROOT } from '../paths.ts';
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
  wechat: null,
  weibo: 'weibo',
};

const SAU_VIDEO_PLATFORMS = new Set([
  'xiaohongshu',
  'bilibili',
  'douyin',
  'kuaishou',
  'wechat_channels',
]);

type PublishToSauParams = {
  platform: string;
  videoPath: string;
  title: string;
  description: string;
  jobId: string;
  compositeRunId: string;
  thumbnailPath?: string;
  coverId?: string;
  abortKey?: string;
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

export function sauBin(): string {
  return Deno.env.get('SAU_BIN') ?? 'sau';
}

export function sauRepoRoot(): string {
  const fromEnv = Deno.env.get('SAU_REPO')?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return path.join(REPO_ROOT, 'social-auto-upload');
}

export function sauCookiePath(platform: string): string | null {
  const cli = sauCliPlatform(platform);
  if (!cli) {
    return null;
  }
  return path.join(sauRepoRoot(), 'cookies', `${cli}_${sauAccount(platform)}.json`);
}

function sauAccount(platform: string): string {
  const key = `SAU_ACCOUNT_${platform.toUpperCase()}`;
  return Deno.env.get(key) ?? Deno.env.get('SAU_ACCOUNT') ?? 'default';
}

async function runSau(args: string[], abortKey?: string): Promise<string> {
  return runCommand(sauBin(), args, abortKey ? { abortKey } : undefined);
}

async function runBilibiliUpload(args: string[], abortKey?: string): Promise<string> {
  const lines = biliupLines();
  let lastError: unknown;
  for (const line of lines) {
    try {
      return await runSau([...args, '--line', line], abortKey);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/certificate is expired|Request failed after|invalid peer certificate/i.test(message)) {
        throw error;
      }
      console.warn(`[sau] bilibili line ${line} failed, trying the next CDN`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const SAU_NOTE_PLATFORMS = new Set([
  'xiaohongshu',
  'douyin',
  'kuaishou',
  'wechat_channels',
  'weibo',
]);

const SAU_BROWSER_NOTE_PLATFORMS = new Set([
  'xiaohongshu',
  'douyin',
  'kuaishou',
  'wechat_channels',
]);

type PublishNoteAlbumToSauParams = {
  platform: string;
  imagePaths: string[];
  title: string;
  note: string;
  jobId: string;
  abortKey?: string;
};

function sauBrowserArgs(): string[] {
  return Deno.env.get('SAU_HEADLESS') === '1' ? ['--headless'] : ['--headed'];
}

function biliupLines(): string[] {
  const raw = Deno.env.get('SAU_BILIBILI_LINES') ?? 'bda2,tx,alia,cnbldsa';
  return raw.split(',').map((line) => line.trim()).filter(Boolean);
}

function hashtagsFromNote(note: string): string {
  const tags = [...note.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((match) => match[1]);
  return tags.slice(0, 10).join(',');
}

export function isSauNotePlatform(platform: string): boolean {
  return SAU_NOTE_PLATFORMS.has(platform);
}

export async function publishNoteAlbumToSau({
  platform,
  imagePaths,
  title,
  note,
  jobId,
  abortKey,
}: PublishNoteAlbumToSauParams): Promise<SauPublishResult> {
  const mode = Deno.env.get('SAU_PUBLISH_MODE') ?? 'stub';
  const publishedAt = new Date().toISOString();
  const sauPlatform = SAU_PLATFORM_MAP[platform];

  if (!sauPlatform || !isSauNotePlatform(platform)) {
    throw new Error(
      `${platform} does not support SAU image-note upload (use upload-note platforms only)`,
    );
  }
  if (!imagePaths.length) {
    throw new Error('At least one image is required for SAU note publish');
  }

  if (mode === 'stub') {
    const postId = `sau-note-stub-${platform}-${Date.now().toString(36)}`;
    return {
      platform,
      provider: 'social-auto-upload',
      postId,
      url: `https://example.invalid/${platform}/${postId}`,
      status: 'live',
      publishedAt,
      jobId,
      compositeRunId: undefined,
      title,
      videoPath: imagePaths[0] ?? '',
      stub: true,
      note: `Stub note publish (${imagePaths.length} images). Set SAU_PUBLISH_MODE=live on #/platforms.`,
    };
  }

  const account = sauAccount(platform);
  const args = [
    sauPlatform,
    'upload-note',
    '--account',
    account,
    '--title',
    title,
    '--images',
    ...imagePaths.map((imagePath) => path.resolve(imagePath)),
    ...(SAU_BROWSER_NOTE_PLATFORMS.has(platform) ? sauBrowserArgs() : []),
  ];
  const trimmedNote = note.trim();
  if (trimmedNote) {
    args.push('--note', trimmedNote);
  }
  const tags = hashtagsFromNote(trimmedNote);
  if (tags) {
    args.push('--tags', tags);
  }

  const output = await runSau(args, abortKey);
  const postId = `sau-note-${platform}-${Date.now().toString(36)}`;

  return {
    platform,
    provider: 'social-auto-upload',
    postId,
    url: extractSauPublishedUrl(output) ?? `https://example.invalid/${platform}/${postId}`,
    status: 'live',
    publishedAt,
    jobId,
    compositeRunId: undefined,
    title,
    videoPath: imagePaths[0] ?? '',
    stub: false,
    sauOutput: output.slice(0, 500),
  };
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
  abortKey,
}: PublishToSauParams): Promise<SauPublishResult> {
  const mode = Deno.env.get('SAU_PUBLISH_MODE') ?? 'stub';
  const publishedAt = new Date().toISOString();
  const sauPlatform = SAU_PLATFORM_MAP[platform];

  if (!sauPlatform || !SAU_VIDEO_PLATFORMS.has(platform)) {
    throw new Error(
      `Platform ${platform} does not support SAU video upload`,
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

  const output = sauPlatform === 'bilibili'
    ? await runBilibiliUpload(args, abortKey)
    : await runSau(args, abortKey);
  const postId = `sau-${platform}-${path.basename(videoPath, path.extname(videoPath))}`;

  return {
    platform,
    provider: 'social-auto-upload',
    postId,
    url: extractSauPublishedUrl(output) ?? `https://example.invalid/${platform}/${postId}`,
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

export function extractSauPublishedUrl(output: string): string | null {
  const cleaned = output.replace(/\u001b\[[0-9;]*m/g, '');
  const match = /https?:\/\/[^\s<>"']+/i.exec(cleaned);
  if (!match) {
    return null;
  }
  return match[0].replace(/[)\].,;]+$/g, '');
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

export function isSauVideoPlatform(platform: string): boolean {
  return SAU_VIDEO_PLATFORMS.has(platform);
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
  return 'Login China platforms from #/platforms or #/mass-publish — QR appears in the page.';
}

export function sauEnvDocs(): string[] {
  return [
    'SAU_BIN — CLI binary (default sau)',
    'SAU_ACCOUNT — default account name',
    'SAU_ACCOUNT_<PLATFORM> — optional per-platform override (e.g. SAU_ACCOUNT_BILIBILI)',
    'SAU_PUBLISH_MODE — stub|live (default stub)',
    'SAU_BILIBILI_TID — Bilibili partition id (default 249)',
    'Login: use Login on #/platforms or #/mass-publish (QR in the page)',
  ];
}

export type SauLoginCheck = {
  valid: boolean;
  message: string;
  accountName: string | null;
};

export function parseSauCheckOutput(output: string): SauLoginCheck {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const match = /^(valid|invalid)\b(.*)$/i.exec(lines[index] ?? '');
    if (!match) {
      continue;
    }
    const valid = match[1].toLowerCase() === 'valid';
    const accountName = match[2].trim() || null;
    return {
      valid,
      accountName: valid ? accountName : null,
      message: valid
        ? accountName
          ? `Logged in as ${accountName}`
          : 'Logged in'
        : 'Login invalid — run login command',
    };
  }
  return {
    valid: false,
    accountName: null,
    message: output.trim() || 'Login invalid — run login command',
  };
}

export async function checkSauPlatformLogin(platform: string): Promise<SauLoginCheck> {
  const cli = sauCliPlatform(platform);
  if (!cli) {
    return { valid: false, message: `${platform} is manual-only`, accountName: null };
  }
  try {
    const output = await runSau([cli, 'check', '--account', sauAccount(platform)]);
    return parseSauCheckOutput(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/invalid/i.test(message)) {
      return {
        valid: false,
        message: 'Login invalid — run login command',
        accountName: null,
      };
    }
    return { valid: false, message, accountName: null };
  }
}

export async function testSauPlatformConnection(
  platform: string,
): Promise<{ ok: boolean; message: string }> {
  const login = await checkSauPlatformLogin(platform);
  if (!login.valid) {
    return { ok: false, message: login.message };
  }
  if (sauPublishMode() === 'stub') {
    return {
      ok: true,
      message: 'Logged in — toggle SAU live on Platforms to publish',
    };
  }
  return { ok: true, message: 'Logged in and SAU live mode enabled' };
}

export async function testSauConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const output = await runSau(['--help']);
    const snippet = output.trim().slice(0, 120) || 'sau responded';
    const mode = sauPublishMode();
    return {
      ok: true,
      message:
        mode === 'stub'
          ? `SAU CLI reachable (${sauBin()}). ${snippet}`
          : `SAU CLI reachable (${sauBin()}): ${snippet}`,
    };
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
