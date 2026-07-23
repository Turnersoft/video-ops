export declare const PROJECTS_DIR: string;
export declare const CANONICAL_SERIES: readonly string[];
export declare const LEGACY_SERIES: readonly string[];
export declare const ALL_SERIES: readonly string[];

export declare function seriesForScriptId(
  videoOpsDir: string,
  scriptId: string,
): string | null;

export declare function scriptDirFor(videoOpsDir: string, scriptId: string): string;

export declare function scriptFolderRelative(videoOpsDir: string, scriptId: string): string;

export declare function resolveSharedAssetPath(videoOpsDir: string, relativePath: string): string;
