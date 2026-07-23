// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/videoOpsTranscript.ts

import { normalizeScriptId, scriptMarkdownRelativePath } from './videoOpsScriptId';

/** Section in script markdown; excluded from teleprompter slides. */
export const VOICE_LESSONS_HEADING = 'Voice lessons';

const VOICE_LESSONS_SECTION_PATTERN = /^##\s+voice\s+lessons\s*$/i;

export function isVoiceLessonsSectionHeading(heading: string): boolean {
    return VOICE_LESSONS_SECTION_PATTERN.test(`## ${heading.trim()}`);
}

function getVoiceLessonsSectionBody(raw: string): string | null {
    const parts = raw.split(/\n(?=## )/);
    for (const part of parts.slice(1)) {
        const trimmed = part.trim();
        if (!trimmed.startsWith('## ')) {
            continue;
        }
        const newline = trimmed.indexOf('\n');
        const heading = newline >= 0 ? trimmed.slice(3, newline).trim() : trimmed.slice(3).trim();
        if (!isVoiceLessonsSectionHeading(heading)) {
            continue;
        }
        return newline >= 0 ? trimmed.slice(newline + 1).trim() : '';
    }
    return null;
}

/** Read `Published:` or `Filmed transcript:` from the script header block. */
export function getPublishedTranscriptRefFromScript(raw: string): string | undefined {
    const header = raw.split(/\n(?=## )/)[0] ?? '';
    for (const line of header.split('\n')) {
        const published = line.match(/^Published:\s*(.+)$/i);
        if (published) {
            return published[1].trim();
        }
        const filmed = line.match(/^Filmed transcript:\s*(.+)$/i);
        if (filmed) {
            return filmed[1].trim();
        }
    }
    return undefined;
}

export function getVoiceLessonsFromMarkdown(raw: string): string {
    return getVoiceLessonsSectionBody(raw) ?? '';
}

export function buildVoiceCursorPrompt(
    scriptId: string,
    scriptRaw: string,
): string {
    const scriptPath = `video_ops/${scriptMarkdownRelativePath(normalizeScriptId(scriptId))}`;
    const voiceLessons = getVoiceLessonsFromMarkdown(scriptRaw);
    const transcriptRef = getPublishedTranscriptRefFromScript(scriptRaw);
    const transcriptPath = transcriptRef
        ? transcriptRef.startsWith('video_ops/')
            ? transcriptRef
            : `video_ops/published/${transcriptRef}`
        : null;

    const lines = [
        `Rewrite future video scripts in my filmed voice. Use three sources:`,
        '',
        `1. Planned script (teleprompter draft): ${scriptPath}`,
    ];

    if (transcriptPath) {
        lines.push(`2. What I actually said (published transcript): ${transcriptPath}`);
    } else {
        lines.push(
            '2. Published transcript: (add `Published: <filename>.md` to the script header after filming)',
        );
    }

    lines.push(
        '3. Voice profile (patterns across videos): video_ops/voice_profile.md',
        '',
        'Task:',
        '- Read the planned `Say:` lines and the published transcript side by side.',
        '- Prefer the transcript’s pacing, digressions, and phrasing over the draft when they disagree.',
        '- Keep technical accuracy and on-screen cues from the script.',
        '- Do not copy auto-caption typos; keep my spoken rhythm (“So”, “Okay”, “internally”, workspace-first).',
        '- Update `## Voice lessons` only when you learn a new durable pattern.',
        '',
    );

    if (voiceLessons.trim()) {
        lines.push('Voice lessons already captured for this script:', '', voiceLessons.trim(), '');
    } else {
        lines.push(
            'No `## Voice lessons` section yet. After comparing, add one with: filmed transcript link, what I added, what I cut, and phrasing to reuse.',
            '',
        );
    }

    lines.push(
        'Also read `video_ops/README.md` § Filmed transcripts and `video_ops/audience_analysis.md` § Tone guide.',
    );

    return lines.join('\n');
}
