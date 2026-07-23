// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/compareTrackLoad.ts
import type { CompareHintLayout } from './compareHintLayout';
import type { IdeTrack } from './ideTrackTypes';
import type { Lean4GoalExport, Lean4Track } from './lean4TrackTypes';

/** Inline compare tracks compiled from animation.json v3 beats (skips stale track JSON). */
export type CompareCompiledTracks = {
    leanTrack: Lean4Track;
    turnTrack: IdeTrack;
    goalExport: Lean4GoalExport;
    hintLayouts: { version: number; layouts: Record<string, CompareHintLayout> };
};

export type CompareTrackLoadOptions = {
    contentRevision?: number;
    compiledTracks?: CompareCompiledTracks;
};

export function trackLoadOptions(
    options?: CompareTrackLoadOptions,
): { inlineTrack?: Lean4Track; contentRevision?: number } {
    return {
        inlineTrack: options?.compiledTracks?.leanTrack,
        contentRevision: options?.contentRevision,
    };
}

export function turnTrackLoadOptions(
    options?: CompareTrackLoadOptions,
): { inlineTrack?: IdeTrack; contentRevision?: number } {
    return {
        inlineTrack: options?.compiledTracks?.turnTrack,
        contentRevision: options?.contentRevision,
    };
}
