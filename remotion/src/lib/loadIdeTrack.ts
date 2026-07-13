// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/loadIdeTrack.ts
import { staticFile } from 'remotion';

import { fetchVideoOpsStaticText } from '@turn-video-shared/ide/fetchVideoOpsStatic';
import {
    loadIdeTrackAssets,
    loadIdeTrackAssetsFromInline,
    type IdeTrack,
    type LoadedIdeTrack,
} from '@turn-video-shared/ide/ideTrackTypes';

export type { LoadedIdeTrack };

export type TrackLoadOptions = {
    inlineTrack?: IdeTrack;
    contentRevision?: number;
};

/** Load IDE track JSON plus full Turn-Lang excerpt for rendering. */
export async function loadIdeTrack(
    scriptId: string,
    trackPath: string,
    options?: TrackLoadOptions,
): Promise<LoadedIdeTrack | null> {
    const loadText = (relativePath: string) =>
        fetchVideoOpsStaticText(relativePath, staticFile, {
            cacheBust: options?.contentRevision,
        });
    if (options?.inlineTrack) {
        return loadIdeTrackAssetsFromInline(scriptId, options.inlineTrack, loadText);
    }
    return loadIdeTrackAssets(scriptId, trackPath, loadText);
}
