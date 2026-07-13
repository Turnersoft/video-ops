// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/defaultRemotionConfig.ts
import type { RemotionProjectConfig } from '../types';

export const DEFAULT_REMOTION_CONFIG: RemotionProjectConfig = {
    format: 'landscape',
    fps: 30,
    width: 1920,
    height: 1080,
    scenes: [],
};

export function mergeRemotionConfig(
    partial: RemotionProjectConfig | null | undefined,
): RemotionProjectConfig {
    if (!partial) {
        return { ...DEFAULT_REMOTION_CONFIG };
    }
    return {
        ...DEFAULT_REMOTION_CONFIG,
        ...partial,
        scenes: partial.scenes ?? [],
    };
}
