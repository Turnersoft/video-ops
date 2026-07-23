// /Users/johndoe/Documents/company/video_ops/remotion/src/components/ScriptAssetVideo.tsx
import type { CSSProperties } from 'react';
import { getRemotionEnvironment, OffthreadVideo, staticFile, Video } from 'remotion';

import { staticPathForScriptAsset } from '../../lib/assets/scriptAssetPath';
import classes from './ScriptAssetVideo.module.scss';

type ScriptAssetVideoProps = {
    scriptId: string;
    src: string;
    style?: CSSProperties;
    muted?: boolean;
    objectFit?: 'cover' | 'contain';
    trimIn?: number;
    trimOut?: number;
    fps?: number;
    /** Remotion playback rate — use with beat-fit (`source / beat`) to stretch timing. */
    playbackRate?: number;
};

function videoClassName(objectFit: 'cover' | 'contain'): string {
    return `${classes.video} ${objectFit === 'cover' ? classes.cover : classes.contain}`;
}

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
    playbackRate = 1,
}: ScriptAssetVideoProps) {
    const resolvedSrc = staticFile(staticPathForScriptAsset(scriptId, src));
    const videoClass = videoClassName(objectFit);
    const videoStyle: CSSProperties = style ?? {};
    const env = getRemotionEnvironment();
    const startFrom = trimIn !== undefined ? Math.round(trimIn * fps) : undefined;
    const endAt = trimOut !== undefined ? Math.round(trimOut * fps) : undefined;

    if (env.isRendering) {
        return (
            <OffthreadVideo
                src={resolvedSrc}
                muted={muted}
                className={videoClass}
                style={videoStyle}
                startFrom={startFrom}
                endAt={endAt}
                playbackRate={playbackRate}
            />
        );
    }

    return (
        <Video
            src={resolvedSrc}
            muted={muted}
            className={videoClass}
            style={videoStyle}
            startFrom={startFrom}
            endAt={endAt}
            playbackRate={playbackRate}
        />
    );
}
