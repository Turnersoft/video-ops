// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/parseVideoOpsMarkdown.ts

import {
    getSlideCommentsFromMarkdown,
    isSlideCommentsSectionHeading,
} from './videoOpsSlideComments';
import { isVoiceLessonsSectionHeading } from './videoOpsTranscript';
import {
    formatScriptStatus,
    normalizeScriptStatus,
    SCRIPT_PRODUCTION_COLUMNS,
    setScriptStatusInMarkdown,
    type ScriptProductionStatus,
} from './videoOpsStatus';

export type { ScriptProductionStatus } from './videoOpsStatus';
export {
    formatScriptStatus,
    normalizeScriptStatus,
    SCRIPT_PRODUCTION_COLUMNS,
    setScriptStatusInMarkdown,
} from './videoOpsStatus';

export type ParsedSlide = {
    index: number;
    title: string;
    durationSeconds?: number;
    say: string;
    screen: string;
    visualNotes: string;
};

export type ParsedFilmBlock = {
    id: string;
    index: number;
    title: string;
    label: string;
    text: string;
    screen?: string;
    visualNotes?: string;
    comment?: string;
};

export type ParsedScript = {
    filename: string;
    title: string;
    playlist?: string;
    series?: string;
    status?: string;
    productionStatus: ScriptProductionStatus;
    audience?: string;
    localVideo?: string;
    promotionalDescription?: string;
    /** Per-platform publish title (English group). */
    socialTitleEnglish?: string;
    /** Per-platform publish title (China group). */
    socialTitleChina?: string;
    coreIdea?: string;
    scriptSummary?: string;
    finalTakeaway?: string;
    slideComments: Record<number, string>;
    slides: ParsedSlide[];
    blocks: ParsedFilmBlock[];
    sections: Array<{ heading: string; body: string }>;
    raw: string;
};

export type ParsedPublished = {
    filename: string;
    title: string;
    publishedDate?: string;
    scriptRef?: string;
    platforms: Array<{ heading: string; account?: string; url?: string; body: string }>;
    raw: string;
};

function stripQuotes(value: string): string {
    return value.replace(/^["']|["']$/g, '').trim();
}

function plainText(value: string): string {
    return value
        .replace(/```[\s\S]*?```/g, ' ')
        .split('\n')
        .map((line) => line.replace(/^>\s?/, '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isSentenceTerminator(char: string): boolean {
    return /[.!?。！？]/.test(char);
}

function isDecimalPoint(text: string, index: number): boolean {
    if (text[index] !== '.') {
        return false;
    }
    const prev = text[index - 1] ?? '';
    const next = text[index + 1] ?? '';
    return /\d/.test(prev) && /\d/.test(next);
}

/** Split a `Say:` block into one spoken sentence per line (matches teleprompter slides). */
export function sayLinesFromScriptBlock(value: string): string[] {
    return splitIntoSentences(value);
}

/**
 * Rows shown inside one beat teleprompter block.
 * Author `\n` in animation.json wins; otherwise split on sentence boundaries.
 */
export function sayParagraphsForDisplay(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }
    if (trimmed.includes('\n')) {
        return trimmed
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }
    return splitIntoSentences(trimmed);
}

/** Join teleprompter rows back into one beat `say` string for animation.json. */
export function joinSayParagraphs(paragraphs: string[]): string {
    return paragraphs.map((line) => line.trim()).filter(Boolean).join('\n');
}

/** True when script.md points at script-clean.md as the teleprompter source. */
export function scriptMarkdownUsesScriptClean(markdown: string): boolean {
    return /script-clean\.md/i.test(markdown);
}

/**
 * Teleprompter lines from script-clean.md: content after ---, one line per blank-line paragraph.
 * Skips markdown headings and standalone bold metadata lines.
 */
export function sayLinesFromScriptCleanMarkdown(markdown: string): string[] {
    const dashed = markdown.split(/^---\s*$/m);
    if (dashed.length < 2) {
        return [];
    }

    const body = dashed.slice(1).join('\n');
    return body
        .split(/\n\n+/)
        .map((block) =>
            block
                .split('\n')
                .map((line) => line.trim())
                .filter(
                    (line) =>
                        line.length > 0 &&
                        !/^#+\s/.test(line) &&
                        !/^\*\*[^*]+\*\*:?\s*$/.test(line),
                )
                .join(' ')
                .trim(),
        )
        .filter(Boolean);
}

function splitIntoSentences(value: string): string[] {
    const cleaned = plainText(value);
    if (!cleaned) {
        return [];
    }

    const sentences: string[] = [];
    let current = '';

    for (let index = 0; index < cleaned.length; index += 1) {
        const char = cleaned[index];
        current += char;

        if (!isSentenceTerminator(char) || isDecimalPoint(cleaned, index)) {
            continue;
        }

        const next = cleaned[index + 1] ?? '';
        if (next !== '' && !/\s/.test(next)) {
            continue;
        }

        const sentence = current.trim();
        if (sentence) {
            sentences.push(sentence);
        }
        current = '';

        while (index + 1 < cleaned.length && /\s/.test(cleaned[index + 1])) {
            index += 1;
        }
    }

    const trailing = current.trim();
    if (trailing) {
        sentences.push(trailing);
    }

    return sentences;
}

function pushTextBlocks(
    blocks: ParsedFilmBlock[],
    title: string,
    label: string,
    text: string,
    extras: Pick<ParsedFilmBlock, 'screen' | 'visualNotes'> = {},
) {
    splitIntoSentences(text).forEach((sentence) => {
        const index = blocks.length + 1;
        blocks.push({
            id: `block-${index}`,
            index,
            title,
            label: `${label} ${index}`,
            text: sentence,
            ...extras,
        });
    });
}

function normalizeHeaderKey(raw: string): string {
    return raw.trim().toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}

function parseHeaderBlock(block: string): Partial<ParsedScript> {
    const lines = block.split('\n');
    const titleMatch = lines.find((line) => line.startsWith('# '));
    const meta: Partial<ParsedScript> = {
        title: titleMatch ? titleMatch.slice(2).trim() : 'Untitled',
    };

    for (const line of lines) {
        const match = line.match(/^([A-Za-z0-9][A-Za-z0-9 ()]*):\s*(.+)$/);
        if (!match) {
            continue;
        }
        const key = normalizeHeaderKey(match[1]);
        const value = stripQuotes(match[2]);
        switch (key) {
            case 'title':
                meta.title = value;
                break;
            case 'playlist':
                meta.playlist = value;
                break;
            case 'series':
                meta.series = value;
                break;
            case 'status':
                meta.status = value;
                break;
            case 'audience':
                meta.audience = value;
                break;
            case 'local video':
                meta.localVideo = value;
                break;
            case 'promotional description':
                meta.promotionalDescription = value;
                break;
            case 'social title english':
            case 'social title en':
                meta.socialTitleEnglish = value;
                break;
            case 'social title china':
            case 'social title zh':
            case 'social title chinese':
                meta.socialTitleChina = value;
                break;
            case 'published':
                break;
            case 'script':
                break;
            default:
                break;
        }
    }

    return meta;
}

function parseSlideSection(heading: string, body: string): ParsedSlide | null {
    const slideMatch = heading.match(/^(?:Scene|Slide)\s+(\d+):\s*(.+)$/i);
    if (!slideMatch) {
        return null;
    }

    const durationMatch = body.match(/Duration:\s*(\d+)\s*s/i);
    const sayMatch = body.match(/Say:\s*\n+([\s\S]*?)(?=\n(?:Show on screen:|Visual notes:)|$)/i);
    const screenMatch = body.match(/Show on screen:\s*\n+([\s\S]*?)(?=\n(?:Visual notes:)|$)/i);
    const notesMatch = body.match(/Visual notes:\s*\n+([\s\S]*)$/i);

    return {
        index: Number.parseInt(slideMatch[1], 10),
        title: slideMatch[2].trim(),
        durationSeconds: durationMatch ? Number.parseInt(durationMatch[1], 10) : undefined,
        say: sayMatch?.[1]?.trim() ?? '',
        screen: screenMatch?.[1]?.trim() ?? '',
        visualNotes: notesMatch?.[1]?.trim() ?? '',
    };
}

function buildFilmBlocks(script: {
    finalTakeaway?: string;
    slides: ParsedSlide[];
}): ParsedFilmBlock[] {
    const blocks: ParsedFilmBlock[] = [];

    script.slides.forEach((slide) => {
        pushTextBlocks(blocks, slide.title, 'Slide', slide.say, {
            screen: slide.screen,
            visualNotes: slide.visualNotes,
        });
    });

    pushTextBlocks(blocks, 'Final takeaway', 'Slide', script.finalTakeaway ?? '');

    return blocks;
}

export function parseScriptMarkdown(filename: string, raw: string): ParsedScript {
    const parts = raw.split(/\n(?=## )/);
    const headerPart = parts[0] ?? '';
    const header = parseHeaderBlock(headerPart);
    const slides: ParsedSlide[] = [];
    const sections: Array<{ heading: string; body: string }> = [];

    for (const part of parts.slice(1)) {
        const trimmed = part.trim();
        if (!trimmed.startsWith('## ')) {
            continue;
        }
        const newline = trimmed.indexOf('\n');
        const heading = newline >= 0 ? trimmed.slice(3, newline).trim() : trimmed.slice(3).trim();
        const body = newline >= 0 ? trimmed.slice(newline + 1).trim() : '';

        if (isSlideCommentsSectionHeading(heading) || isVoiceLessonsSectionHeading(heading)) {
            continue;
        }

        const slide = parseSlideSection(heading, body);
        if (slide) {
            slides.push(slide);
            continue;
        }

        sections.push({ heading, body });
        const normalized = heading.toLowerCase();
        if (normalized === 'core idea') {
            header.coreIdea = body;
        } else if (normalized === 'script summary') {
            header.scriptSummary = body;
        } else if (normalized === 'final takeaway') {
            header.finalTakeaway = body;
        }
    }

    slides.sort((left, right) => left.index - right.index);
    const slideComments = getSlideCommentsFromMarkdown(raw);
    const blocks = buildFilmBlocks({
        finalTakeaway: header.finalTakeaway,
        slides,
    });
    blocks.forEach((block) => {
        const comment = slideComments[block.index];
        if (comment) {
            block.comment = comment;
        }
    });

    return {
        filename,
        title: header.title ?? 'Untitled',
        playlist: header.playlist ?? header.series,
        series: header.series,
        status: header.status,
        productionStatus: normalizeScriptStatus(header.status),
        audience: header.audience,
        localVideo: header.localVideo,
        promotionalDescription: header.promotionalDescription,
        socialTitleEnglish: header.socialTitleEnglish,
        socialTitleChina: header.socialTitleChina,
        coreIdea: header.coreIdea,
        scriptSummary: header.scriptSummary,
        finalTakeaway: header.finalTakeaway,
        slideComments,
        slides,
        blocks,
        sections,
        raw,
    };
}

function parsePublishedHeader(block: string): Partial<ParsedPublished> {
    const lines = block.split('\n');
    const titleMatch = lines.find((line) => line.startsWith('# '));
    const meta: Partial<ParsedPublished> = {
        title: titleMatch ? titleMatch.slice(2).trim() : 'Untitled',
    };

    for (const line of lines) {
        const match = line.match(/^([A-Za-z ][A-Za-z ]*):\s*(.+)$/);
        if (!match) {
            continue;
        }
        const key = match[1].trim().toLowerCase();
        const value = stripQuotes(match[2]);
        if (key === 'published') {
            meta.publishedDate = value;
        } else if (key === 'script') {
            meta.scriptRef = value;
        }
    }

    return meta;
}

function extractUrl(text: string): string | undefined {
    const match = text.match(/https?:\/\/[^\s)>\]]+/);
    return match?.[0];
}

function parsePlatformHeading(heading: string): { heading: string; account?: string } {
    const match = heading.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!match) {
        return { heading };
    }
    return { heading: match[1].trim(), account: match[2].trim() };
}

export function parsePublishedMarkdown(filename: string, raw: string): ParsedPublished {
    const parts = raw.split(/\n(?=## )/);
    const header = parsePublishedHeader(parts[0] ?? '');
    const platforms: ParsedPublished['platforms'] = [];

    for (const part of parts.slice(1)) {
        const trimmed = part.trim();
        if (!trimmed.startsWith('## ')) {
            continue;
        }
        const newline = trimmed.indexOf('\n');
        const headingRaw =
            newline >= 0 ? trimmed.slice(3, newline).trim() : trimmed.slice(3).trim();
        const body = newline >= 0 ? trimmed.slice(newline + 1).trim() : '';
        const platform = parsePlatformHeading(headingRaw);
        platforms.push({
            ...platform,
            url: extractUrl(body),
            body,
        });
    }

    return {
        filename,
        title: header.title ?? 'Untitled',
        publishedDate: header.publishedDate,
        scriptRef: header.scriptRef,
        platforms,
        raw,
    };
}

export function labelFromFilename(filename: string): string {
    return filename
        .replace(/\.md$/i, '')
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/-/g, ' ');
}

export function dateFromFilename(filename: string): string | undefined {
    const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1];
}
