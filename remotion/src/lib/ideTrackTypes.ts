// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/ideTrackTypes.ts
export type {
    IdeSourceRange,
    IdeFocusSegment,
    IdeTrack,
    LoadedIdeTrack,
    IdeTrackAssetLoader,
    TurnSidePanelMode,
} from '@turn-video-shared/ide/ideTrackTypes';
export {
    typingSnippetFromTrack,
    extractSourceRange,
    activeIdeFocusSegment,
    activeBeatCodeSegment,
    renderSourceForActiveFocus,
    resolveFocusedSourceDisplay,
    revealFullSourceFromSnippetProgress,
    detectTurnSidePanelMode,
    loadIdeTrackAssets,
    isIdeTypingComplete,
} from '@turn-video-shared/ide/ideTrackTypes';
