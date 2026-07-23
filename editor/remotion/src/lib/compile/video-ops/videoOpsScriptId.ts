import {
    videoOpsScriptCollection,
    videoOpsScriptFolder,
    videoOpsSharedReferencePath,
    videoOpsScriptExportMp4RelativePath,
    videoOpsSocialPostsRelativePath,
    VIDEO_OPS_SCRIPT_EXPORT_DIR,
    VIDEO_OPS_SOCIAL_POSTS_FILENAME,
} from '../../videoOpsPaths';

export type { VideoOpsScriptSeries as VideoOpsScriptCollection } from '../../videoOpsPaths';
export { videoOpsScriptCollection, videoOpsScriptFolder, videoOpsSharedReferencePath };
export {
    VIDEO_OPS_SCRIPT_EXPORT_DIR,
    VIDEO_OPS_SOCIAL_POSTS_FILENAME,
    videoOpsScriptExportMp4RelativePath,
    videoOpsSocialPostsRelativePath,
};

/** Script folder slug (no path, no .md). */
export type VideoOpsScriptId = string;

export function normalizeScriptId(value: string): VideoOpsScriptId {
    return value.replace(/\.md$/i, '').trim();
}

export function scriptMarkdownRelativePath(scriptId: VideoOpsScriptId): string {
    return `${videoOpsScriptFolder(scriptId)}/script.md`;
}

export function scriptFolderRelativePath(scriptId: VideoOpsScriptId): string {
    return videoOpsScriptFolder(scriptId);
}

export function animationMarkdownRelativePath(scriptId: VideoOpsScriptId): string {
    return `${videoOpsScriptFolder(scriptId)}/animation.md`;
}

export function remotionJsonRelativePath(scriptId: VideoOpsScriptId): string {
    return `${videoOpsScriptFolder(scriptId)}/remotion.json`;
}

export function animationJsonRelativePath(scriptId: VideoOpsScriptId): string {
    return `${videoOpsScriptFolder(scriptId)}/animation.json`;
}
