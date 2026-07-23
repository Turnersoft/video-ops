// /Users/johndoe/Documents/company/video_ops/remotion/src/components/OutdoorSceneVideo.tsx
import type { CSSProperties } from 'react';
import { getRemotionEnvironment, OffthreadVideo, staticFile, Video } from 'remotion';

import { GreenAvatarFill, hasFootageSrc } from '../FilmedPlaceholders/FilmedPlaceholders';
import { staticPathForScriptAsset } from '../../lib/assets/scriptAssetPath';
import classes from './OutdoorSceneVideo.module.scss';

type OutdoorSceneVideoProps = {
    scriptId: string;
    src: string;
    style?: CSSProperties;
    muted?: boolean;
    objectFit?: 'cover' | 'contain';
};

function videoClassName(objectFit: 'cover' | 'contain'): string {
    return `${classes.video} ${objectFit === 'cover' ? classes.cover : classes.contain}`;
}

/** Studio/Player uses Html5Video (Safari + iPhone WebView); render uses OffthreadVideo. */
export function OutdoorSceneVideo({
    scriptId,
    src,
    style,
    muted = false,
    objectFit = 'cover',
}: OutdoorSceneVideoProps) {
    const videoClass = videoClassName(objectFit);
    const videoStyle: CSSProperties = style ?? {};

    if (!hasFootageSrc(src)) {
        return (
            <div className={`${classes.placeholder} ${videoClass}`} style={videoStyle}>
                <GreenAvatarFill />
            </div>
        );
    }

    const resolvedSrc = staticFile(staticPathForScriptAsset(scriptId, src));
    const env = getRemotionEnvironment();

    if (env.isRendering) {
        return (
            <OffthreadVideo
                src={resolvedSrc}
                muted={muted}
                className={videoClass}
                style={videoStyle}
            />
        );
    }

    return (
        <Video src={resolvedSrc} muted={muted} className={videoClass} style={videoStyle} />
    );
}
