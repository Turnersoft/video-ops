// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/videoOpsSlideComments.ts

import { normalizeScriptId, scriptMarkdownRelativePath } from './videoOpsScriptId';

export type SlideCommentsMap = Record<number, string>;

/** Section heading in script markdown; excluded from teleprompter slides. */
export const SLIDE_COMMENTS_HEADING = 'Slide comments';

const SLIDE_COMMENTS_SECTION_PATTERN = /^##\s+slide\s+comments\s*$/i;
const LEGACY_REVISION_SECTION_PATTERN = /^##\s+revision\s+comments\s*$/i;
const SLIDE_ENTRY_PATTERN = /^###\s+Slide\s+(\d+)\s*$/i;

export function isSlideCommentsSectionHeading(heading: string): boolean {
    const normalized = `## ${heading.trim()}`;
    return (
        SLIDE_COMMENTS_SECTION_PATTERN.test(normalized) ||
        LEGACY_REVISION_SECTION_PATTERN.test(normalized)
    );
}

function getSlideCommentsSectionPart(raw: string): string | null {
    const parts = raw.split(/\n(?=## )/);
    for (const part of parts.slice(1)) {
        const trimmed = part.trim();
        if (!trimmed.startsWith('## ')) {
            continue;
        }
        const newline = trimmed.indexOf('\n');
        const heading = newline >= 0 ? trimmed.slice(3, newline).trim() : trimmed.slice(3).trim();
        if (!isSlideCommentsSectionHeading(heading)) {
            continue;
        }
        return trimmed;
    }
    return null;
}

export function getSlideCommentsFromMarkdown(raw: string): SlideCommentsMap {
    const sectionPart = getSlideCommentsSectionPart(raw);
    if (!sectionPart) {
        return {};
    }

    const newline = sectionPart.indexOf('\n');
    const body = newline >= 0 ? sectionPart.slice(newline + 1) : '';
    const map: SlideCommentsMap = {};
    let currentSlide: number | null = null;
    const buffer: string[] = [];

    const flush = () => {
        if (currentSlide === null) {
            buffer.length = 0;
            return;
        }
        const text = buffer.join('\n').trim();
        if (text) {
            map[currentSlide] = text;
        }
        buffer.length = 0;
    };

    body.split('\n').forEach((line) => {
        const match = line.match(SLIDE_ENTRY_PATTERN);
        if (match) {
            flush();
            currentSlide = Number.parseInt(match[1], 10);
            return;
        }
        if (currentSlide !== null) {
            buffer.push(line);
        }
    });
    flush();

    return map;
}

function serializeSlideCommentsSection(comments: SlideCommentsMap): string {
    const entries = Object.entries(comments)
        .map(([index, text]) => [Number.parseInt(index, 10), text.trim()] as const)
        .filter(([index, text]) => Number.isFinite(index) && index > 0 && text.length > 0)
        .sort(([left], [right]) => left - right);

    if (entries.length === 0) {
        return '';
    }

    const blocks = entries.map(
        ([index, text]) => `### Slide ${index}\n\n${text}`,
    );

    return [
        `## ${SLIDE_COMMENTS_HEADING}`,
        '',
        'Per-slide director notes for Cursor. Not read on camera. Slide numbers match the teleprompter counter.',
        '',
        ...blocks,
        '',
    ].join('\n');
}

export function setSlideCommentsInMarkdown(raw: string, comments: SlideCommentsMap): string {
    const sectionBody = serializeSlideCommentsSection(comments);

    const parts = raw.split(/\n(?=## )/);
    const headerPart = parts[0] ?? '';
    const bodyParts = parts.slice(1);

    let found = false;
    const nextBodyParts: string[] = [];

    bodyParts.forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed.startsWith('## ')) {
            nextBodyParts.push(part);
            return;
        }
        const newline = trimmed.indexOf('\n');
        const heading = newline >= 0 ? trimmed.slice(3, newline).trim() : trimmed.slice(3).trim();
        if (isSlideCommentsSectionHeading(heading)) {
            found = true;
            if (sectionBody) {
                nextBodyParts.push(sectionBody.trimEnd());
            }
            return;
        }
        nextBodyParts.push(part);
    });

    if (!found && sectionBody) {
        const trimmed = raw.trimEnd();
        return `${trimmed}\n\n${sectionBody}`;
    }

    const joined = [headerPart, ...nextBodyParts].join('\n').replace(/\n{3,}/g, '\n\n');
    return joined.endsWith('\n') ? joined : `${joined}\n`;
}

export function normalizeSlideCommentsPayload(comments: unknown): SlideCommentsMap {
    if (typeof comments !== 'object' || comments === null || Array.isArray(comments)) {
        return {};
    }

    const map: SlideCommentsMap = {};
    Object.entries(comments).forEach(([key, value]) => {
        const index = Number.parseInt(key, 10);
        if (!Number.isFinite(index) || index <= 0 || typeof value !== 'string') {
            return;
        }
        const trimmed = value.trim();
        if (trimmed) {
            map[index] = trimmed;
        }
    });
    return map;
}

export function slideCommentsEqual(
    left: SlideCommentsMap,
    right: SlideCommentsMap,
): boolean {
    const leftKeys = Object.keys(left)
        .map((key) => Number.parseInt(key, 10))
        .filter((index) => left[index]?.trim())
        .sort((a, b) => a - b);
    const rightKeys = Object.keys(right)
        .map((key) => Number.parseInt(key, 10))
        .filter((index) => right[index]?.trim())
        .sort((a, b) => a - b);

    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    return leftKeys.every((index, offset) => {
        const other = rightKeys[offset];
        return index === other && (left[index] ?? '') === (right[other] ?? '');
    });
}

export function buildSlideCommentsCursorPrompt(
    scriptId: string,
    comments: SlideCommentsMap,
): string {
    const filePath = `video_ops/${scriptMarkdownRelativePath(normalizeScriptId(scriptId))}`;
    const entries = Object.entries(comments)
        .map(([index, text]) => [Number.parseInt(index, 10), text.trim()] as const)
        .filter(([index, text]) => Number.isFinite(index) && index > 0 && text.length > 0)
        .sort(([left], [right]) => left - right);

    const commentLines =
        entries.length > 0
            ? entries.map(([index, text]) => `### Slide ${index}\n${text}`).join('\n\n')
            : '(no slide comments yet — add notes in Video Ops on each slide)';

    return [
        `Edit the video script at ${filePath}.`,
        '',
        'Read the `## Slide comments` section in that same file. Each `### Slide N` note applies to teleprompter slide N (the Nth spoken sentence).',
        'Apply feedback to the matching `Say:` sentence, `Show on screen`, or scene — not to the comment section itself unless you are marking work done.',
        'Keep my filming voice. Comments are director notes only; never read them on camera.',
        'When done, update or remove the slide comments that you addressed.',
        '',
        'Current slide comments:',
        '',
        commentLines,
    ].join('\n');
}
