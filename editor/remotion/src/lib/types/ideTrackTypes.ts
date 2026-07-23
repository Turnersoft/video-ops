// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/ideTrackTypes.ts
export type {
    IdeSourceRange,
    IdeFocusSegment,
    IdeTrack,
    LoadedIdeTrack,
    IdeTrackAssetLoader,
    TurnSidePanelMode,
} from '../tracks/ideTrackTypes';
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
} from '../tracks/ideTrackTypes';
