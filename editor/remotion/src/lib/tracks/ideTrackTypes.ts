// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/ideTrackTypes.ts

import type { CaptionBeat } from './captionBeats';
import { turnSourceStaticPath } from './turnSourceRegistry';
import { videoOpsScriptFolder, videoOpsSeriesSharedFolder, videoOpsScriptSeries } from '../videoOpsPaths';

export type { CaptionBeat } from './captionBeats';

export type IdeSourceRange = {
    /** 1-based inclusive line in sourceFile */
    startLine: number;
    endLine: number;
};

export type BeatCodeSegment = {
    atSeconds: number;
    code: string;
    /** Plain substrings — highlight every occurrence in `code`. */
    highlights?: string[];
};

export type IdeFocusSegment = IdeSourceRange & {
    /** Seconds into the scene when this focused snippet becomes active. */
    atSeconds: number;
    /** Optional cursor/focus line for scoped knowledge render. Defaults to startLine. */
    focusLine?: number;
    /**
     * When editor glow lines are far apart, show only these 1-based file lines
     * with `-- …` gaps instead of the full startLine–endLine range.
     */
    linePick?: number[];
};

/** Minimal track shape for time-sliced source rendering (Turn + Lean compare tracks). */
export type IdeFocusTrack = {
    sourceRange?: IdeSourceRange;
    focusSegments?: IdeFocusSegment[];
    /** v4 animated-PPT mode — inline code per beat (takes precedence over focusSegments). */
    beatCodeSegments?: BeatCodeSegment[];
};

export type IdeTrack = {
    version: number;
    /**
     * Turn source for IDE render.
     * - `shared/reference/foo.turn` — canonical copy under `video_ops/script/shared/reference/`
     */
    sourceFile?: string;
    sourceRange?: IdeSourceRange;
    /** Time-sliced source ranges for video clips that need one declaration at a time. */
    focusSegments?: IdeFocusSegment[];
    /** v4 — inline code per beat (takes precedence over focusSegments). */
    beatCodeSegments?: BeatCodeSegment[];
    typing?: {
        charsPerSecond?: number;
        /** Ellipsized typing driver for pacing (may use `{ ... }`). */
        snippet?: string;
        /** @deprecated use snippet */
        fullText?: string;
    };
    proofPanel?: {
        exportPath?: string;
        /** Full LSP `VisualizationData` JSON — same payload as /app proof tab. */
        visualizationDataPath?: string;
        steps: Array<{ label: string; goal?: string }>;
    };
    knowledgePanel?: {
        heading?: string;
        exportPath?: string;
        /** Full LSP `KnowledgeData` JSON — same payload as /app knowledge tab. */
        knowledgeDataPath?: string;
        /** Analyze `sourceFile` on demand and cache by source hash instead of reading a JSON payload. */
        generateFromSource?: boolean;
        /** 1-based line to sync knowledge reader scroll (defaults to sourceRange.startLine). */
        focusLine?: number;
        /** When true (default), show only the declaration matching sourceRange, not the full document. */
        scopedToSource?: boolean;
        items?: Array<{ label: string; detail?: string }>;
    };
    interactions?: Array<{
        atSeconds: number;
        kind: string;
        stepIndex?: number;
        branchId?: string;
    }>;
    /** Substrings to glow once typed (e.g. `[..Classes]`). */
    highlights?: Array<{
        text: string;
        atSeconds?: number;
    }>;
    /** Caption-synced highlights on editor + knowledge/proof panel. */
    captionBeats?: CaptionBeat[];
};

/** Ellipsized snippet used to pace typing + side-panel mode detection. */
export function typingSnippetFromTrack(track: IdeTrack | null | undefined): string {
    if (!track?.typing) {
        return '';
    }
    return track.typing.snippet ?? track.typing.fullText ?? '';
}

export type LoadedIdeTrack = {
    track: IdeTrack;
    fullSource: string;
    renderSource: string;
    typingSnippet: string;
};

export type IdeTrackAssetLoader = (relativePath: string) => Promise<string | null>;

/** Resolve `sourceFile` to a path under `video_ops/` for staticFile / fetch. */
export function resolveIdeTrackSourceStaticPath(scriptId: string, sourceFile: string): string {
    const canonicalPath = turnSourceStaticPath(sourceFile);
    if (canonicalPath) {
        return canonicalPath;
    }
    if (sourceFile.startsWith('shared/')) {
        const series = videoOpsScriptSeries(scriptId);
        return `${videoOpsSeriesSharedFolder(series)}/${sourceFile.slice('shared/'.length)}`;
    }
    return `${videoOpsScriptFolder(scriptId)}/${sourceFile}`;
}

/** Load IDE track JSON plus full Turn-Lang excerpt (shared between Remotion and VideoOps preview). */
export async function loadIdeTrackAssets(
    scriptId: string,
    trackPath: string,
    loadText: IdeTrackAssetLoader,
): Promise<LoadedIdeTrack | null> {
    const trackRaw = await loadText(`${videoOpsScriptFolder(scriptId)}/${trackPath}`);
    if (!trackRaw) {
        return null;
    }

    const track = JSON.parse(trackRaw) as IdeTrack;
    let typingSnippet = typingSnippetFromTrack(track);
    if (!typingSnippet && track.beatCodeSegments?.length) {
        typingSnippet = track.beatCodeSegments[0].code;
    }

    let fullSource = typingSnippet;
    let renderSource = typingSnippet;
    // `inline:…` is a synthetic marker for ad-hoc beat snippets — not a disk path.
    if (track.sourceFile && !track.sourceFile.startsWith('inline:')) {
        const fileText = await loadText(
            resolveIdeTrackSourceStaticPath(scriptId, track.sourceFile),
        );
        if (fileText) {
            fullSource = fileText;
            renderSource = extractSourceRange(fileText, track.sourceRange);
        }
    }

    return { track, fullSource, renderSource, typingSnippet };
}

/** Build loaded track from inline JSON (v3 beats compiled at load — skips track file fetch). */
export async function loadIdeTrackAssetsFromInline(
    scriptId: string,
    track: IdeTrack,
    loadText: IdeTrackAssetLoader,
): Promise<LoadedIdeTrack | null> {
    let typingSnippet = typingSnippetFromTrack(track);
    if (!typingSnippet && track.beatCodeSegments?.length) {
        typingSnippet = track.beatCodeSegments[0].code;
    }

    let fullSource = typingSnippet;
    let renderSource = typingSnippet;
    if (track.sourceFile && !track.sourceFile.startsWith('inline:')) {
        const fileText = await loadText(
            resolveIdeTrackSourceStaticPath(scriptId, track.sourceFile),
        );
        if (fileText) {
            fullSource = fileText;
            renderSource = extractSourceRange(fileText, track.sourceRange);
        }
    }

    return { track, fullSource, renderSource, typingSnippet };
}

/** Pull a 1-based inclusive line range from full file text. */
export function extractSourceRange(source: string, range: IdeSourceRange | undefined): string {
    if (!range) {
        return source;
    }
    const lines = source.split('\n');
    const start = Math.max(1, range.startLine);
    const end = Math.min(lines.length, range.endLine);
    if (start > end) {
        return '';
    }
    return lines.slice(start - 1, end).join('\n');
}

/** Lean comment ellipsis row between non-adjacent picked lines. */
export const FOCUS_LINE_PICK_ELLIPSIS = '  -- …';

export type PickedSourceLines = {
    text: string;
    gutterLineNumbers: (number | null)[];
};

/** Show only selected file lines, with comment ellipsis rows for skipped gaps. */
export function extractPickedSourceLines(
    fullSource: string,
    linePick: number[],
): PickedSourceLines {
    const lines = fullSource.split('\n');
    const rendered: string[] = [];
    const gutterLineNumbers: (number | null)[] = [];
    let lastLineNum = -1;

    for (const lineNum of linePick) {
        if (lastLineNum >= 0 && lineNum - lastLineNum > 1) {
            rendered.push(FOCUS_LINE_PICK_ELLIPSIS);
            gutterLineNumbers.push(null);
        }
        const index = lineNum - 1;
        if (index >= 0 && index < lines.length) {
            rendered.push(lines[index]);
            gutterLineNumbers.push(lineNum);
            lastLineNum = lineNum;
        }
    }

    return { text: rendered.join('\n'), gutterLineNumbers };
}

export type FocusedSourceDisplay = {
    text: string;
    gutterLineNumbers?: (number | null)[];
};

/** Active inline code segment (v4 beat mode). */
export function activeBeatCodeSegment(
    track: IdeFocusTrack | null | undefined,
    seconds: number,
): BeatCodeSegment | null {
    let current: BeatCodeSegment | null = null;
    for (const segment of track?.beatCodeSegments ?? []) {
        if (seconds >= segment.atSeconds) {
            current = segment;
            continue;
        }
        break;
    }
    return current;
}

/** Resolve visible editor text (+ optional real line numbers) for the active focus segment. */
export function resolveFocusedSourceDisplay(
    fullSource: string,
    track: IdeFocusTrack | null | undefined,
    seconds: number,
    fallback: string,
): FocusedSourceDisplay {
    const beatCode = activeBeatCodeSegment(track, seconds);
    if (beatCode) {
        return { text: beatCode.code };
    }
    if (!fullSource) {
        return { text: fallback };
    }
    const segment = activeIdeFocusSegment(track, seconds);
    if (segment?.linePick?.length) {
        const picked = extractPickedSourceLines(fullSource, segment.linePick);
        return { text: picked.text, gutterLineNumbers: picked.gutterLineNumbers };
    }
    if (segment) {
        return { text: extractSourceRange(fullSource, segment) };
    }
    if (track?.sourceRange) {
        return { text: extractSourceRange(fullSource, track.sourceRange) };
    }
    return { text: fallback };
}

/** Active per-declaration range for videos that teach one Turn snippet at a time. */
export function activeIdeFocusSegment(
    track: IdeFocusTrack | null | undefined,
    seconds: number,
): IdeFocusSegment | null {
    let current: IdeFocusSegment | null = null;
    for (const segment of track?.focusSegments ?? []) {
        if (seconds >= segment.atSeconds) {
            current = segment;
            continue;
        }
        break;
    }
    return current;
}

export function renderSourceForActiveFocus(
    fullSource: string,
    track: IdeFocusTrack | null | undefined,
    seconds: number,
    fallback: string,
): string {
    return resolveFocusedSourceDisplay(fullSource, track, seconds, fallback).text;
}

/**
 * Reveal full Turn-Lang source progressively while typing follows an ellipsized snippet.
 * Snippet length sets pacing; displayed text always comes from renderSource.
 *
 * Important: `sourceRange` in the IDE track must match the snippet scope — do not include
 * trailing declarations that are not part of the scene (otherwise partial frames show cut-off code).
 */
export function revealFullSourceFromSnippetProgress(
    renderSource: string,
    snippet: string,
    visibleSnippetChars: number,
): { text: string; activeLineIndex: number } {
    const fullLines = renderSource.split('\n');
    if (fullLines.length === 0) {
        return { text: '', activeLineIndex: 0 };
    }

    if (!snippet || visibleSnippetChars >= snippet.length) {
        return { text: renderSource, activeLineIndex: fullLines.length - 1 };
    }

    const progress = visibleSnippetChars / snippet.length;
    const lineProgress = progress * fullLines.length;
    const completeLines = Math.min(fullLines.length - 1, Math.floor(lineProgress));
    const partial = lineProgress - completeLines;
    const partialChars = Math.floor((fullLines[completeLines]?.length ?? 0) * partial);

    const shown: string[] = [...fullLines.slice(0, completeLines)];
    if (completeLines < fullLines.length && partialChars > 0) {
        shown.push(fullLines[completeLines].slice(0, partialChars));
    }

    return {
        text: shown.join('\n'),
        activeLineIndex: Math.min(completeLines, fullLines.length - 1),
    };
}

export type TurnSidePanelMode = 'proof' | 'knowledge';

type KeywordHit = { index: number; mode: TurnSidePanelMode };

function lastKeywordHit(
    visibleCode: string,
    keyword: string,
    mode: TurnSidePanelMode,
): KeywordHit | null {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'g');
    let match: RegExpExecArray | null = null;
    let last: KeywordHit | null = null;
    while ((match = pattern.exec(visibleCode)) !== null) {
        last = { index: match.index, mode };
    }
    return last;
}

function partialKeywordMode(visibleCode: string): TurnSidePanelMode | null {
    const head = visibleCode.trimStart().toLowerCase();
    if (!head) {
        return null;
    }
    if ('theorem'.startsWith(head) || head.startsWith('theorem')) {
        return 'knowledge';
    }
    if ('structure'.startsWith(head) || head.startsWith('structure')) {
        return 'knowledge';
    }
    if ('relation'.startsWith(head) || head.startsWith('relation')) {
        return 'knowledge';
    }
    return null;
}

/** Knowledge panel for `theorem` / `structure` / `relation` (Remotion video compare). */
export function detectTurnSidePanelMode(visibleCode: string): TurnSidePanelMode {
    const hits: KeywordHit[] = [];
    const theorem = lastKeywordHit(visibleCode, 'theorem', 'knowledge');
    const structure = lastKeywordHit(visibleCode, 'structure', 'knowledge');
    const relation = lastKeywordHit(visibleCode, 'relation', 'knowledge');

    if (theorem) {
        hits.push(theorem);
    }
    if (structure) {
        hits.push(structure);
    }
    if (relation) {
        hits.push(relation);
    }

    if (hits.length === 0) {
        return partialKeywordMode(visibleCode) ?? 'knowledge';
    }

    hits.sort((a, b) => b.index - a.index);
    return hits[0].mode;
}

/** True once the IDE typing driver has finished (knowledge panel waits for this). */
export function isIdeTypingComplete(snippet: string, visibleSnippetChars: number): boolean {
    if (!snippet.trim()) {
        return true;
    }
    return visibleSnippetChars >= snippet.length;
}

export { fetchVideoOpsStaticText, fetchVideoOpsStaticJson } from '../studio/fetchVideoOpsStatic';
