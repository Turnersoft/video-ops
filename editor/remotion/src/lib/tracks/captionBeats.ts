// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/captionBeats.ts
import type { CompareHintLayout } from './compareHintLayout';
import type { IdeTrack } from './ideTrackTypes';

/** Compare-scene pane a hover hint can point at. */
export type CompareHintTarget = 'lean-code' | 'lean-goal' | 'turn-code' | 'turn-knowledge';

/** IDE-style callout synced to a caption beat. */
export type CompareHint = {
    target: CompareHintTarget;
    text: string;
    /** Highlight needle used to locate the snippet (not shown in the panel). */
    needle?: string;
    /** Optional saved position (% of compare overlay). */
    layout?: CompareHintLayout;
};

export type CompareHintInstance = CompareHint & {
    compareBeatIndex: number;
    beatAtSeconds: number;
};

/** One caption line → synchronized highlights on editor + side panel. */
export type CaptionBeat = {
    atSeconds: number;
    /** Index in compare scene beats — stable hint layout key. */
    compareBeatIndex?: number;
    /** Substrings to glow in the Turn editor (must appear in visible source). */
    editor?: string[];
    /** Text needles to pulse in the knowledge panel DOM. */
    knowledge?: string[];
    /** Substrings to glow in the Lean 4 goal panel (hypotheses + target). */
    goal?: string[];
    /** Proof panel step index when the beat mentions a proof goal. */
    proofStepIndex?: number;
    /** Hover-style callouts for compare layouts (Lean vs Turn). */
    hints?: CompareHint[];
};

export function captionBeatsFromTrack(track: IdeTrack | null | undefined): CaptionBeat[] {
    return track?.captionBeats ?? [];
}

/** Beat whose `atSeconds` is the latest still at or before `seconds`. */
export function activeCaptionBeatAt(beats: CaptionBeat[], seconds: number): CaptionBeat | null {
    let current: CaptionBeat | null = null;
    for (const beat of beats) {
        if (seconds >= beat.atSeconds) {
            current = beat;
            continue;
        }
        break;
    }
    return current;
}

/** Editor highlight needles for the active caption beat. */
export function activeEditorHighlights(
    beats: CaptionBeat[],
    seconds: number,
    visibleSource: string,
): string[] {
    const beat = activeCaptionBeatAt(beats, seconds);
    if (!beat) {
        return [];
    }
    return (beat.editor ?? []).filter((term) => visibleSource.includes(term));
}

/** Flatten caption beats + legacy `highlights` into TurnTypingCode props. */
export function editorHighlightsForTrack(
    track: IdeTrack | null | undefined,
    seconds: number,
    visibleSource: string,
): Array<{ text: string; atSeconds?: number }> {
    const beats = captionBeatsFromTrack(track);
    if (beats.length > 0) {
        return beats.flatMap((beat) =>
            (beat.editor ?? []).map((text) => ({ text, atSeconds: beat.atSeconds })),
        );
    }
    return (track?.highlights ?? []).map((item) => ({
        text: item.text,
        atSeconds: item.atSeconds,
    }));
}

/** Knowledge panel needles for the active caption beat. */
export function activeKnowledgeHighlights(beats: CaptionBeat[], seconds: number): string[] {
    const beat = activeCaptionBeatAt(beats, seconds);
    return beat?.knowledge ?? [];
}

/** Proof step index on the active caption beat. */
export function activeProofStepFromCaptionBeats(
    beats: CaptionBeat[],
    seconds: number,
): number | undefined {
    const beat = activeCaptionBeatAt(beats, seconds);
    return beat?.proofStepIndex;
}

/** Lean goal panel needles for the active caption beat. */
export function activeGoalHighlights(beats: CaptionBeat[], seconds: number): string[] {
    const beat = activeCaptionBeatAt(beats, seconds);
    return beat?.goal ?? [];
}

/** Hover hints from the active beats on both compare columns. */
export function activeCompareHints(
    leanBeats: CaptionBeat[],
    turnBeats: CaptionBeat[],
    seconds: number,
): CompareHint[] {
    return activeCompareHintInstances(leanBeats, turnBeats, seconds);
}

/** Hints with beat timing for layout keys and drag persistence. */
export function activeCompareHintInstances(
    leanBeats: CaptionBeat[],
    turnBeats: CaptionBeat[],
    seconds: number,
): CompareHintInstance[] {
    const lean = activeCaptionBeatAt(leanBeats, seconds);
    const turn = activeCaptionBeatAt(turnBeats, seconds);
    const instances: CompareHintInstance[] = [];
    for (const hint of lean?.hints ?? []) {
        instances.push({
            ...hint,
            compareBeatIndex: lean!.compareBeatIndex ?? leanBeats.indexOf(lean!),
            beatAtSeconds: lean!.atSeconds,
        });
    }
    for (const hint of turn?.hints ?? []) {
        instances.push({
            ...hint,
            compareBeatIndex: turn!.compareBeatIndex ?? turnBeats.indexOf(turn!),
            beatAtSeconds: turn!.atSeconds,
        });
    }
    return instances;
}

export function trackHasProofStepScrub(track: IdeTrack | null | undefined): boolean {
    if (track?.interactions?.some((event) => event.kind === 'click-proof-step')) {
        return true;
    }
    return captionBeatsFromTrack(track).some((beat) => beat.proofStepIndex !== undefined);
}
