// /Users/johndoe/Documents/company/video_ops/remotion/src/components/OutdoorSceneVideo.tsx
import type { CSSProperties } from 'react';
import { getRemotionEnvironment, OffthreadVideo, staticFile, Video } from 'remotion';

import { staticPathForScriptAsset } from '../lib/scriptAssetPath';

type OutdoorSceneVideoProps = {
    scriptId: string;
    src: string;
    style?: CSSProperties;
    muted?: boolean;
    objectFit?: 'cover' | 'contain';
};

/** Studio/Player uses Html5Video (Safari + iPhone WebView); render uses OffthreadVideo. */
export function OutdoorSceneVideo({
    scriptId,
    src,
    style,
    muted = false,
    objectFit = 'cover',
}: OutdoorSceneVideoProps) {
    const resolvedSrc = staticFile(staticPathForScriptAsset(scriptId, src));
    const videoStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit,
        backgroundColor: '#020617',
        ...style,
    };
    const env = getRemotionEnvironment();

    if (env.isRendering) {
        return <OffthreadVideo src={resolvedSrc} muted={muted} style={videoStyle} />;
    }

    return <Video src={resolvedSrc} muted={muted} style={videoStyle} />;
}
