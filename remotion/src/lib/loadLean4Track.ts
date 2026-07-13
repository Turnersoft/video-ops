// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/loadLean4Track.ts
import { staticFile } from 'remotion';

import { fetchVideoOpsStaticText } from '@turn-video-shared/ide/fetchVideoOpsStatic';
import {
    loadLean4TrackAssets,
    loadLean4TrackAssetsFromInline,
    type Lean4Track,
    type LoadedLean4Track,
} from '@turn-video-shared/ide/lean4TrackTypes';

export type { LoadedLean4Track };

export type LeanTrackLoadOptions = {
    inlineTrack?: Lean4Track;
    contentRevision?: number;
};

/** Load Lean4 track JSON plus full source excerpt for rendering. */
export async function loadLean4Track(
    scriptId: string,
    trackPath: string,
    options?: LeanTrackLoadOptions,
): Promise<LoadedLean4Track | null> {
    const loadText = (relativePath: string) =>
        fetchVideoOpsStaticText(relativePath, staticFile, {
            cacheBust: options?.contentRevision,
        });
    if (options?.inlineTrack) {
        return loadLean4TrackAssetsFromInline(scriptId, options.inlineTrack, loadText);
    }
    return loadLean4TrackAssets(scriptId, trackPath, loadText);
}
