// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/lean4TrackTypes.ts
import type { CaptionBeat } from './captionBeats';
import { videoOpsScriptFolder } from '../videoOpsPaths';
import {
    activeBeatCodeSegment,
    extractSourceRange,
    renderSourceForActiveFocus,
    revealFullSourceFromSnippetProgress,
    resolveIdeTrackSourceStaticPath,
    type IdeFocusSegment,
    type IdeSourceRange,
    type IdeTrackAssetLoader,
} from './ideTrackTypes';

export type Lean4GoalHypothesis = {
    name?: string;
    type: string;
};

export type Lean4GoalState = {
    hypotheses: Lean4GoalHypothesis[];
    target: string;
    /** Optional step label shown under the target. */
    label?: string;
};

/** Static goal export — hand-authored fallback JSON under `tracks/`. */
export type Lean4GoalExport = {
    version: number;
    title?: string;
    /** `infoview` = hover/type signatures; `goals` = tactic goal state. */
    panelKind?: 'infoview' | 'goals';
    /** Breadcrumb path shown after em dash (e.g. `Mathlib/Data/Set/Defs.lean`). */
    sourceLabel?: string;
    /** Initial state when no step matches. */
    hypotheses: Lean4GoalHypothesis[];
    target: string;
    /** Scrub goal state over time (like proof panel steps). */
    steps?: Array<
        Lean4GoalState & {
            atSeconds: number;
            /** LSP capture kind when exported via tooling. */
            label?: string;
        }
    >;
    generatedBy?: string;
    generatedAt?: string;
};

export type Lean4Track = {
    version: number;
    /** `shared/reference/foo.lean` under `video_ops/script/shared/reference/`. */
    sourceFile?: string;
    sourceRange?: IdeSourceRange;
    /** Time-sliced source ranges (same model as Turn IDE tracks). */
    focusSegments?: IdeFocusSegment[];
    /** v4 — inline code per beat. */
    beatCodeSegments?: import('./ideTrackTypes').BeatCodeSegment[];
    typing?: {
        charsPerSecond?: number;
        snippet?: string;
        /** @deprecated use snippet */
        fullText?: string;
    };
    goalPanel?: {
        exportPath?: string;
    };
    highlights?: Array<{
        text: string;
        atSeconds?: number;
    }>;
    /** Caption-synced highlights on editor + goal panel. */
    captionBeats?: CaptionBeat[];
};

export type LoadedLean4Track = {
    track: Lean4Track;
    fullSource: string;
    renderSource: string;
    typingSnippet: string;
};

export function leanTypingSnippetFromTrack(track: Lean4Track | null | undefined): string {
    if (!track?.typing) {
        return '';
    }
    return track.typing.snippet ?? track.typing.fullText ?? '';
}

/** Pick the latest goal step at or before `proofSeconds`. */
export function goalStateAtSeconds(
    exportData: Lean4GoalExport,
    proofSeconds: number,
): Lean4GoalState {
    const base: Lean4GoalState = {
        hypotheses: exportData.hypotheses ?? [],
        target: exportData.target ?? '',
    };

    const steps = exportData.steps ?? [];
    if (steps.length === 0) {
        return base;
    }

    let active: Lean4GoalState = base;
    for (const step of steps) {
        if (proofSeconds >= step.atSeconds) {
            active = {
                hypotheses: step.hypotheses ?? [],
                target: step.target ?? '',
                label: step.label,
            };
        }
    }
    return active;
}

/** Lean code that can show a tactic goal / proof render (not defs, namespaces, or type-only examples). */
export function leanCodeIsProofBlock(code: string): boolean {
    const text = code.trim();
    if (!text) {
        return false;
    }
    if (/\b(theorem|lemma)\b/.test(text)) {
        return true;
    }
    if (/\bexample\b/.test(text) && (/\bby\b/.test(text) || /\bsorry\b/.test(text))) {
        return true;
    }
    return false;
}

/** Whether the Lean render pane has meaningful content at `proofSeconds`. */
export function leanGoalRenderAvailableAtSeconds(
    track: Lean4Track | null | undefined,
    exportData: Lean4GoalExport | null | undefined,
    proofSeconds: number,
): boolean {
    if (!exportData) {
        return false;
    }

    const beatSegments = track?.beatCodeSegments;
    if (beatSegments && beatSegments.length > 0) {
        const segment = activeBeatCodeSegment(track, proofSeconds);
        if (!segment) {
            return false;
        }
        const stepAtBeat = exportData.steps?.find(
            (step) => step.atSeconds === segment.atSeconds && step.target?.trim(),
        );
        if (stepAtBeat) {
            return true;
        }
        return leanCodeIsProofBlock(segment.code);
    }

    if (exportData.generatedBy?.trim()) {
        const state = goalStateAtSeconds(exportData, proofSeconds);
        return Boolean(state.target?.trim()) || state.hypotheses.length > 0;
    }

    const steps = exportData.steps ?? [];
    if (steps.length > 0) {
        const activeSteps = steps.filter((step) => proofSeconds >= step.atSeconds);
        const latest = activeSteps[activeSteps.length - 1];
        return Boolean(latest?.target?.trim()) || (latest?.hypotheses?.length ?? 0) > 0;
    }

    const state = goalStateAtSeconds(exportData, proofSeconds);
    return Boolean(state.target?.trim()) || state.hypotheses.length > 0;
}

/** Load Lean4 track JSON plus full source excerpt. */
export async function loadLean4TrackAssets(
    scriptId: string,
    trackPath: string,
    loadText: IdeTrackAssetLoader,
): Promise<LoadedLean4Track | null> {
    const trackRaw = await loadText(`${videoOpsScriptFolder(scriptId)}/${trackPath}`);
    if (!trackRaw) {
        return null;
    }

    const track = JSON.parse(trackRaw) as Lean4Track;
    const typingSnippet = leanTypingSnippetFromTrack(track) || firstBeatCodeSnippet(track);

    let fullSource = typingSnippet;
    let renderSource = typingSnippet;
    if (track.sourceFile) {
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

function firstBeatCodeSnippet(track: Lean4Track): string {
    return track.beatCodeSegments?.[0]?.code ?? '';
}

/** Build loaded track from inline JSON (v3 beats compiled at load — skips track file fetch). */
export async function loadLean4TrackAssetsFromInline(
    scriptId: string,
    track: Lean4Track,
    loadText: IdeTrackAssetLoader,
): Promise<LoadedLean4Track | null> {
    const typingSnippet = leanTypingSnippetFromTrack(track) || firstBeatCodeSnippet(track);

    let fullSource = typingSnippet;
    let renderSource = typingSnippet;
    if (track.sourceFile) {
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

export {
    revealFullSourceFromSnippetProgress,
    extractSourceRange,
    renderSourceForActiveFocus,
    resolveFocusedSourceDisplay,
    extractPickedSourceLines,
    FOCUS_LINE_PICK_ELLIPSIS,
    activeBeatCodeSegment,
} from './ideTrackTypes';
export type { BeatCodeSegment } from './ideTrackTypes';
