// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/scriptAssetPath.ts
import { videoOpsScriptFolder, videoOpsSeriesSharedFolder, videoOpsScriptSeries } from '@turn-video-shared/videoOpsPaths';

export function staticPathForScriptAsset(scriptId: string, relativePath: string): string {
    const clean = relativePath.replace(/^\/+/, '');
    if (clean.startsWith('shared/')) {
        const series = videoOpsScriptSeries(scriptId);
        return `${videoOpsSeriesSharedFolder(series)}/${clean.slice('shared/'.length)}`;
    }
    return `${videoOpsScriptFolder(scriptId)}/${clean}`;
}
