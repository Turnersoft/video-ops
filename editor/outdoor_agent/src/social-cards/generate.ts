import path from 'node:path';

import { fileExists, readJson, writeJson } from '../fs_util.ts';
import {
  ensureDir,
  resolveTakeFromJobId,
  scriptDirFor,
  socialCardsManifestPath,
  takeSocialCardsDir,
  takeStageRunDir,
} from '../paths.ts';
import { loadJob } from '../job-store.ts';
import { POSTIZ_IMAGE_PLATFORMS } from '../publish/postiz.ts';
import { nowIso } from '../schema.ts';
import { screenshotHtmlFile } from './render.ts';
import {
  buildSocialCardHtml,
  cardDimensions,
  episodeLabelFromTitle,
  extractHook,
} from './template.ts';
import type {
  SocialCardFile,
  SocialCardFormat,
  SocialCardLang,
  SocialCardPlatformInfo,
  SocialCardsManifest,
  SocialCardSpec,
} from './types.ts';

const CARD_FORMATS: SocialCardFormat[] = ['portrait', 'landscape'];

const PLATFORM_CARD_FORMAT: Record<string, SocialCardFormat> = {
  instagram: 'portrait',
  tiktok: 'portrait',
  threads: 'portrait',
  x: 'landscape',
  linkedin: 'landscape',
  facebook: 'landscape',
  bluesky: 'landscape',
  reddit: 'landscape',
};

const CHINA_PLATFORMS = new Set([
  'bilibili',
  'douyin',
  'xiaohongshu',
  'kuaishou',
  'wechat_channels',
  'weibo',
]);

type SocialPosts = {
  titleEnglish?: string;
  titleChina?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
};

function emptyManifest(): SocialCardsManifest {
  return { schemaVersion: 1, updatedAt: nowIso(), cards: [] };
}

function loadManifest(scriptId: string, takeId: string): SocialCardsManifest {
  const manifestPath = socialCardsManifestPath(scriptId, takeId);
  if (!fileExists(manifestPath)) {
    return emptyManifest();
  }
  const raw = readJson<Partial<SocialCardsManifest>>(manifestPath);
  return {
    schemaVersion: 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso(),
    cards: Array.isArray(raw.cards) ? raw.cards : [],
  };
}

function saveManifest(scriptId: string, takeId: string, manifest: SocialCardsManifest): void {
  ensureDir(takeSocialCardsDir(scriptId, takeId));
  writeJson(socialCardsManifestPath(scriptId, takeId), manifest);
}

function makeCardId(format: SocialCardFormat, lang: SocialCardLang): string {
  return `${format}-${lang}`;
}

function cardFileUrl(jobId: string, cardIdValue: string, ext: 'png' | 'html'): string {
  return `/api/jobs/${encodeURIComponent(jobId)}/social-cards/${encodeURIComponent(cardIdValue)}/${ext}`;
}

function resolveSocialPath(jobId: string): string {
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (job.selectedRuns.social) {
    const socialRunPath = path.join(
      takeStageRunDir(ref.scriptId, ref.takeId, 'social', job.selectedRuns.social),
      'social-posts.json',
    );
    if (fileExists(socialRunPath)) {
      return socialRunPath;
    }
  }
  const scriptSocialPath = path.join(scriptDirFor(ref.scriptId), 'social-posts.json');
  if (fileExists(scriptSocialPath)) {
    return scriptSocialPath;
  }
  throw new Error('social-posts.json not found — run the social stage or add script copy');
}

function copySampleForLang(
  social: SocialPosts,
  lang: SocialCardLang,
): { title: string; body: string } {
  const group = lang === 'zh' ? social.china : social.english;
  const fallbackTitle = lang === 'zh'
    ? social.titleChina ?? social.titleEnglish ?? 'Episode'
    : social.titleEnglish ?? social.titleChina ?? 'Episode';
  const first = group ? Object.values(group).find((entry) => entry?.title?.trim()) : null;
  const firstBody = group ? Object.values(group).find((entry) => entry?.body?.trim()) : null;
  return {
    title: first?.title?.trim() || fallbackTitle,
    body: firstBody?.body?.trim() || first?.body?.trim() || fallbackTitle,
  };
}

function buildSpec(
  format: SocialCardFormat,
  lang: SocialCardLang,
  social: SocialPosts,
  scriptTitle: string,
): SocialCardSpec {
  const { width, height } = cardDimensions(format);
  const sample = copySampleForLang(social, lang);
  const seriesLabel = scriptTitle.trim() || 'Turn-Lang';
  return {
    format,
    lang,
    width,
    height,
    title: sample.title,
    hook: extractHook(sample.body),
    episodeLabel: episodeLabelFromTitle(sample.title),
    seriesLabel,
    cta: lang === 'zh' ? '读图即可 · 不必先看视频' : 'Read the card · no video required',
  };
}

export async function generateSocialCard(
  jobId: string,
  format: SocialCardFormat,
  lang: SocialCardLang,
): Promise<SocialCardFile> {
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const social = readJson<SocialPosts>(resolveSocialPath(jobId));
  const spec = buildSpec(format, lang, social, job.scriptTitle);
  const id = makeCardId(format, lang);
  const dir = takeSocialCardsDir(ref.scriptId, ref.takeId);
  ensureDir(dir);
  const htmlPath = path.join(dir, `${id}.html`);
  const pngPath = path.join(dir, `${id}.png`);
  Deno.writeTextFileSync(htmlPath, buildSocialCardHtml(spec));
  await screenshotHtmlFile(htmlPath, pngPath, spec.width, spec.height);
  const createdAt = nowIso();
  const entry: SocialCardFile = {
    id,
    format,
    lang,
    width: spec.width,
    height: spec.height,
    htmlPath,
    pngPath,
    createdAt,
  };
  const manifest = loadManifest(ref.scriptId, ref.takeId);
  manifest.cards = manifest.cards.filter((card) => card.id !== id);
  manifest.cards.push(entry);
  manifest.updatedAt = createdAt;
  saveManifest(ref.scriptId, ref.takeId, manifest);
  return entry;
}

export async function generateSocialCardsForJob(
  jobId: string,
  langs: SocialCardLang[] = ['en', 'zh'],
): Promise<SocialCardsManifest> {
  for (const lang of langs) {
    for (const format of CARD_FORMATS) {
      await generateSocialCard(jobId, format, lang);
    }
  }
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    throw new Error(`Job not found: ${jobId}`);
  }
  return loadManifest(ref.scriptId, ref.takeId);
}

export function resolveSocialCardFile(
  scriptId: string,
  takeId: string,
  format: SocialCardFormat,
  lang: SocialCardLang,
): SocialCardFile | null {
  const manifest = loadManifest(scriptId, takeId);
  const id = makeCardId(format, lang);
  const entry = manifest.cards.find((card) => card.id === id);
  if (!entry || !fileExists(entry.pngPath)) {
    return null;
  }
  return entry;
}

export function cardFormatForPlatform(platform: string): SocialCardFormat {
  return PLATFORM_CARD_FORMAT[platform] ?? 'landscape';
}

export function cardLangForPlatform(platform: string): SocialCardLang {
  return CHINA_PLATFORMS.has(platform) ? 'zh' : 'en';
}

export function resolveSocialCardForPlatform(
  jobId: string,
  platform: string,
): SocialCardFile | null {
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    return null;
  }
  const format = cardFormatForPlatform(platform);
  const lang = cardLangForPlatform(platform);
  return resolveSocialCardFile(ref.scriptId, ref.takeId, format, lang);
}

export function resolveSocialCardPathForPlatform(
  jobId: string,
  platform: string,
): string | null {
  return resolveSocialCardForPlatform(jobId, platform)?.pngPath ?? null;
}

export function listSocialCards(jobId: string): {
  manifest: SocialCardsManifest;
  cards: Array<SocialCardFile & { pngUrl: string; htmlUrl: string }>;
  platforms: SocialCardPlatformInfo[];
} {
  const ref = resolveTakeFromJobId(jobId);
  if (!ref) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const manifest = loadManifest(ref.scriptId, ref.takeId);
  const cards = manifest.cards.map((card) => ({
    ...card,
    pngUrl: cardFileUrl(jobId, card.id, 'png'),
    htmlUrl: cardFileUrl(jobId, card.id, 'html'),
  }));

  const platforms: SocialCardPlatformInfo[] = POSTIZ_IMAGE_PLATFORMS.map((platform) => {
    const format = cardFormatForPlatform(platform);
    const lang = cardLangForPlatform(platform);
    const id = makeCardId(format, lang);
    const card = manifest.cards.find((entry) => entry.id === id && fileExists(entry.pngPath));
    return {
      platform,
      format,
      lang,
      cardId: card?.id ?? null,
      imageUrl: card ? cardFileUrl(jobId, card.id, 'png') : null,
      postizImageSupported: true,
    };
  });

  return { manifest, cards, platforms };
}

export function readSocialCardAsset(
  scriptId: string,
  takeId: string,
  cardId: string,
  ext: 'png' | 'html',
): { filePath: string; contentType: string } | null {
  const manifest = loadManifest(scriptId, takeId);
  const card = manifest.cards.find((entry) => entry.id === cardId);
  if (!card) {
    return null;
  }
  const filePath = ext === 'png' ? card.pngPath : card.htmlPath;
  if (!fileExists(filePath)) {
    return null;
  }
  return {
    filePath,
    contentType: ext === 'png' ? 'image/png' : 'text/html; charset=utf-8',
  };
}
