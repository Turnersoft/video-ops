// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/OutdoorPresenterVideo.tsx
import type { CSSProperties } from 'react';

import { OutdoorSceneVideo } from '../OutdoorSceneVideo/OutdoorSceneVideo';

type OutdoorPresenterVideoProps = {
    scriptId: string;
    src: string;
    style?: CSSProperties;
    muted?: boolean;
    objectFit?: 'cover' | 'contain';
};

export function OutdoorPresenterVideo({
    scriptId,
    src,
    style,
    muted = false,
    objectFit = 'cover',
}: OutdoorPresenterVideoProps) {
    return (
        <OutdoorSceneVideo
            scriptId={scriptId}
            src={src}
            muted={muted}
            style={style}
            objectFit={objectFit}
        />
    );
}
