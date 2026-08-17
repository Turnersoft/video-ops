import type { SocialPosts } from '../types';

function hasPlatformCopy(social: SocialPosts): boolean {
  return (
    Object.keys(social.english ?? {}).length > 0 || Object.keys(social.china ?? {}).length > 0
  );
}

function hasChineseText(text: string | undefined): boolean {
  return Boolean(text && /[\u4e00-\u9fff]/.test(text));
}

const CHINA_HASHTAG_LIMIT = 4;

function countHashtags(text: string): number {
  return (text.match(/#[\p{L}\p{N}_-]+/gu) ?? []).length;
}

function isStaleEnglishChinaBody(body: string | undefined): boolean {
  if (!body?.trim()) {
    return true;
  }
  const text = body.trim();
  if (countHashtags(text) > CHINA_HASHTAG_LIMIT) {
    return true;
  }
  if (hasChineseText(text)) {
    return false;
  }
  return (
    /^Hook:\s*/i.test(text) ||
    text.includes('Hook:') ||
    text.includes('equals glyph') ||
    text.includes('A beginner-friendly tour') ||
    text.includes('Think = is obvious') ||
    text.includes('请翻译为中文后发布')
  );
}

/** Prefer take edits, but keep script Chinese when take china copy is still English/stale. */
export function pickSocialCopyForPreview(
  takeSocial: SocialPosts | null,
  scriptSocial: SocialPosts | null,
): SocialPosts | null {
  if (!takeSocial && !scriptSocial) {
    return null;
  }
  if (!takeSocial || !hasPlatformCopy(takeSocial)) {
    return scriptSocial ?? takeSocial;
  }
  if (!scriptSocial || !hasPlatformCopy(scriptSocial)) {
    return takeSocial;
  }

  const merged: SocialPosts = {
    ...scriptSocial,
    ...takeSocial,
    titleEnglish: takeSocial.titleEnglish ?? scriptSocial.titleEnglish ?? takeSocial.title,
    titleChina: takeSocial.titleChina ?? scriptSocial.titleChina,
    title: takeSocial.titleEnglish ?? takeSocial.title ?? scriptSocial.titleEnglish ?? scriptSocial.title,
    english: {
      ...(scriptSocial.english ?? {}),
      ...(takeSocial.english ?? {}),
    },
    china: { ...(scriptSocial.china ?? {}) },
  };

  for (const [platform, takeFields] of Object.entries(takeSocial.china ?? {})) {
    const scriptFields = scriptSocial.china?.[platform];
    const takeBody = takeFields?.body ?? '';
    const useScriptBody = isStaleEnglishChinaBody(takeBody) && Boolean(scriptFields?.body?.trim());
    merged.china![platform] = {
      title: takeFields?.title?.trim() || scriptFields?.title || '',
      body: useScriptBody ? (scriptFields?.body ?? '') : takeBody,
    };
  }

  return merged;
}

export type SocialCopySource = 'take' | 'script' | 'merged' | null;

export function socialCopySourceLabel(
  takeSocial: SocialPosts | null,
  scriptSocial: SocialPosts | null,
  merged: SocialPosts | null,
): SocialCopySource {
  if (!merged) {
    return null;
  }
  if (!takeSocial || !hasPlatformCopy(takeSocial)) {
    return scriptSocial ? 'script' : null;
  }
  if (!scriptSocial || !hasPlatformCopy(scriptSocial)) {
    return 'take';
  }
  return 'merged';
}
