// /Users/johndoe/Documents/company/video_ops/remotion/src/components/ScriptAssetVideo.tsx
import type { CSSProperties } from 'react';
import { getRemotionEnvironment, OffthreadVideo, staticFile, Video } from 'remotion';

import { staticPathForScriptAsset } from '../lib/scriptAssetPath';

type ScriptAssetVideoProps = {
    scriptId: string;
    src: string;
    style?: CSSProperties;
    muted?: boolean;
    objectFit?: 'cover' | 'contain';
    trimIn?: number;
    trimOut?: number;
    fps?: number;
};

/** Bundled script video — Studio uses Html5Video; render uses OffthreadVideo. */
export function ScriptAssetVideo({
    scriptId,
    src,
    style,
    muted = false,
    objectFit = 'contain',
    trimIn,
    trimOut,
    fps = 30,
}: ScriptAssetVideoProps) {
    const resolvedSrc = staticFile(staticPathForScriptAsset(scriptId, src));
    const videoStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit,
        backgroundColor: '#020617',
        ...style,
    };
    const env = getRemotionEnvironment();
    const startFrom = trimIn !== undefined ? Math.round(trimIn * fps) : undefined;
    const endAt = trimOut !== undefined ? Math.round(trimOut * fps) : undefined;

    if (env.isRendering) {
        return (
            <OffthreadVideo
                src={resolvedSrc}
                muted={muted}
                style={videoStyle}
                startFrom={startFrom}
                endAt={endAt}
            />
        );
    }

    return (
        <Video
            src={resolvedSrc}
            muted={muted}
            style={videoStyle}
            startFrom={startFrom}
            endAt={endAt}
        />
    );
}
