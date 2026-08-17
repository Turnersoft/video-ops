// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/videoOpsSocialPosts.ts
import type { ParsedScript } from './parseVideoOpsMarkdown';

export const ENGLISH_SOCIAL_PLATFORMS = [
    'youtube',
    'x',
    'linkedin',
    'instagram',
    'tiktok',
    'facebook',
    'bluesky',
] as const;

export const CHINA_SOCIAL_PLATFORMS = [
    'bilibili',
    'douyin',
    'xiaohongshu',
    'weibo',
    'wechat_channels',
    'kuaishou',
] as const;

export type EnglishSocialPlatform = (typeof ENGLISH_SOCIAL_PLATFORMS)[number];
export type ChinaSocialPlatform = (typeof CHINA_SOCIAL_PLATFORMS)[number];

export type SocialPostCopy = {
    title: string;
    body: string;
};

export type VideoOpsSocialPostsDocument = {
    version: 1;
    scriptId: string;
    /** English publish title (all english platforms). */
    titleEnglish: string;
    /** China publish title (all china platforms). */
    titleChina: string;
    /** @deprecated use titleEnglish — kept for older readers. */
    title: string;
    generatedAt: string;
    source: {
        playlist?: string;
        promotionalDescription?: string;
        promotionalDescriptionChina?: string;
        audience?: string;
        socialTitleEnglish?: string;
        socialTitleChina?: string;
    };
    english: Record<EnglishSocialPlatform, SocialPostCopy>;
    china: Record<ChinaSocialPlatform, SocialPostCopy>;
};

function truncate(text: string, max: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) {
        return trimmed;
    }
    return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Strip internal authoring labels — never publish "Hook:" to an audience. */
function normalizeAudienceCopy(text: string): string {
    return text
        .trim()
        .replace(/^Hook:\s*/i, '')
        .replace(/\n（请翻译为中文后发布）\s*$/u, '')
        .trim();
}

function baseBodyFromScript(parsed: ParsedScript): string {
    if (parsed.promotionalDescription?.trim()) {
        return normalizeAudienceCopy(parsed.promotionalDescription);
    }
    if (parsed.coreIdea?.trim()) {
        return parsed.coreIdea.trim();
    }
    if (parsed.scriptSummary?.trim()) {
        return parsed.scriptSummary.trim();
    }
    const firstSay = parsed.slides[0]?.say?.trim() || parsed.blocks[0]?.text?.trim();
    if (firstSay) {
        return firstSay;
    }
    return parsed.title.trim();
}

function baseBodyChinaFromScript(parsed: ParsedScript): string {
    if (parsed.promotionalDescriptionChina?.trim()) {
        return normalizeAudienceCopy(parsed.promotionalDescriptionChina);
    }
    return baseBodyFromScript(parsed);
}

function englishHashtagsForScript(parsed: ParsedScript): string {
    const tags = [
        '#TurnLang',
        '#FormalMethods',
        '#FormalMathematics',
        '#ProofAssistant',
        '#ProofAssistants',
        '#Lean4',
        '#Lean',
        '#Mathlib',
        '#AbstractAlgebra',
        '#InteractiveTheoremProving',
        '#TypeTheory',
    ];
    if (parsed.playlist?.toLowerCase().includes('pitfall')) {
        tags.push('#FormalVerification');
    }
    return tags.join(' ');
}

export const CHINA_HASHTAG_LIMIT = 4;

function chinaHashtagsForScript(): string {
    return [
        '#TurnLang',
        '#Lean4',
        '#证明助手',
        '#抽象代数',
    ]
        .slice(0, CHINA_HASHTAG_LIMIT)
        .join(' ');
}

function resolveSocialTitles(
    parsed: ParsedScript,
    animationTitle?: string,
): { titleEnglish: string; titleChina: string } {
    const fallback = animationTitle?.trim() || parsed.title.trim() || 'Untitled';
    return {
        titleEnglish: parsed.socialTitleEnglish?.trim() || fallback,
        titleChina: parsed.socialTitleChina?.trim() || parsed.socialTitleEnglish?.trim() || fallback,
    };
}

function englishPostForPlatform(
    platform: EnglishSocialPlatform,
    title: string,
    body: string,
    hashtags: string,
): SocialPostCopy {
    switch (platform) {
        case 'youtube':
            return {
                title: truncate(title, 100),
                body: `${body}\n\n${hashtags}`,
            };
        case 'x':
            return {
                title: truncate(title, 280),
                body: truncate(`${body} ${hashtags}`, 280),
            };
        case 'linkedin':
            return {
                title: truncate(title, 220),
                body: [
                    title,
                    '',
                    body,
                    '',
                    'This episode is part of the Abstract Algebra in a Proof Assistant series on Turn-Lang — textbook-shaped formal mathematics you can film outdoors and verify in Lean 4 / Turn-Lang.',
                    '',
                    'What you will see in the video:',
                    '• A textbook beat you can say on camera',
                    '• The Lean 4 modeling choice (and what it refuses to pretend)',
                    '• The Turn-Lang compare so the obligation is visible',
                    '',
                    'Watch the short, then open the linked editor if you want to step through the proof assistant view yourself.',
                    '',
                    hashtags,
                ].join('\n'),
            };
        case 'instagram':
            return {
                title: truncate(title, 220),
                body: truncate(`${body}\n\n${hashtags}`, 2200),
            };
        case 'tiktok':
            return {
                title: truncate(title, 150),
                body: truncate(`${body}\n\n${hashtags}`, 4000),
            };
        case 'facebook':
            return {
                title: truncate(title, 255),
                body: `${body}\n\n${hashtags}`,
            };
        case 'bluesky':
            return {
                title: truncate(title, 300),
                body: truncate(`${body} ${hashtags}`, 300),
            };
        default: {
            const neverPlatform: never = platform;
            return neverPlatform;
        }
    }
}

function chinaPostForPlatform(
    platform: ChinaSocialPlatform,
    title: string,
    body: string,
    zhTags: string,
): SocialPostCopy {
    switch (platform) {
        case 'bilibili':
            return {
                title: truncate(title, 80),
                body: `${body}\n\n${zhTags}`,
            };
        case 'douyin':
            return {
                title: truncate(title, 55),
                body: truncate(`${body}\n\n${zhTags}`, 1000),
            };
        case 'xiaohongshu':
            return {
                title: truncate(title, 20),
                body: truncate(`${body}\n\n${zhTags}`, 1000),
            };
        case 'weibo':
            return {
                title: truncate(title, 140),
                body: truncate(`${body}\n\n${zhTags}`, 2000),
            };
        case 'wechat_channels':
            return {
                title: truncate(title, 60),
                body: `${body}\n\n${zhTags}`,
            };
        case 'kuaishou':
            return {
                title: truncate(title, 55),
                body: truncate(`${body}\n\n${zhTags}`, 1000),
            };
        default: {
            const neverPlatform: never = platform;
            return neverPlatform;
        }
    }
}

export function buildSocialPostsDocument(
    scriptId: string,
    parsed: ParsedScript,
    animationTitle?: string,
): VideoOpsSocialPostsDocument {
    const { titleEnglish, titleChina } = resolveSocialTitles(parsed, animationTitle);
    const body = baseBodyFromScript(parsed);
    const bodyChina = baseBodyChinaFromScript(parsed);
    const hashtags = englishHashtagsForScript(parsed);
    const zhTags = chinaHashtagsForScript();

    const english = {} as Record<EnglishSocialPlatform, SocialPostCopy>;
    for (const platform of ENGLISH_SOCIAL_PLATFORMS) {
        english[platform] = englishPostForPlatform(platform, titleEnglish, body, hashtags);
    }

    const china = {} as Record<ChinaSocialPlatform, SocialPostCopy>;
    for (const platform of CHINA_SOCIAL_PLATFORMS) {
        china[platform] = chinaPostForPlatform(platform, titleChina, bodyChina, zhTags);
    }

    return {
        version: 1,
        scriptId,
        titleEnglish,
        titleChina,
        title: titleEnglish,
        generatedAt: new Date().toISOString(),
        source: {
            playlist: parsed.playlist,
            promotionalDescription: parsed.promotionalDescription,
            promotionalDescriptionChina: parsed.promotionalDescriptionChina,
            audience: parsed.audience,
            socialTitleEnglish: parsed.socialTitleEnglish,
            socialTitleChina: parsed.socialTitleChina,
        },
        english,
        china,
    };
}

function countHashtags(text: string): number {
    return (text.match(/#[\p{L}\p{N}_-]+/gu) ?? []).length;
}

function isStaleAutoPost(body: string | undefined): boolean {
    if (!body?.trim()) {
        return true;
    }
    const text = body.trim();
    return (
        /^Hook:\s*/i.test(text) ||
        text.includes('Hook:') ||
        text.includes('equals glyph') ||
        text.includes('请翻译为中文后发布') ||
        text.includes('A beginner-friendly tour') ||
        text.includes('面向初学者的证明助手相等之旅')
    );
}

function isStaleAutoPostCopy(post: SocialPostCopy | undefined): boolean {
    return isStaleAutoPost(post?.body);
}

function isStaleChinaPostCopy(post: SocialPostCopy | undefined): boolean {
    if (isStaleAutoPostCopy(post)) {
        return true;
    }
    return countHashtags(post?.body ?? '') > CHINA_HASHTAG_LIMIT;
}

/** Keep author-edited platform copy when regenerating from script.md. */
export function mergeSocialPostsDocuments(
    existing: VideoOpsSocialPostsDocument | null,
    fresh: VideoOpsSocialPostsDocument,
): VideoOpsSocialPostsDocument {
    if (!existing || existing.scriptId !== fresh.scriptId) {
        return fresh;
    }

    const merged: VideoOpsSocialPostsDocument = {
        ...fresh,
        english: { ...fresh.english },
        china: { ...fresh.china },
    };

    for (const platform of ENGLISH_SOCIAL_PLATFORMS) {
        const prev = existing.english[platform];
        if (prev && !isStaleAutoPostCopy(prev)) {
            merged.english[platform] = prev;
        }
    }

    for (const platform of CHINA_SOCIAL_PLATFORMS) {
        const prev = existing.china[platform];
        if (prev && !isStaleChinaPostCopy(prev)) {
            merged.china[platform] = prev;
        }
    }

    return merged;
}

export function parseSocialPostsDocument(raw: string): VideoOpsSocialPostsDocument | null {
    try {
        const parsed = JSON.parse(raw) as VideoOpsSocialPostsDocument;
        if (parsed?.version !== 1 || !parsed.scriptId) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}
