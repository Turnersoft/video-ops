// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TalkingHeadLayer.tsx
import { OffthreadVideo, staticFile } from 'remotion';

import { staticPathForScriptAsset } from '../lib/scriptAssetPath';

type TalkingHeadLayerProps = {
    scriptId: string;
    src: string;
    trimIn?: number;
    trimOut?: number;
    position?: 'background' | 'pip';
    widthFraction?: number;
    compositionWidth: number;
    compositionHeight: number;
};

export function TalkingHeadLayer({
    scriptId,
    src,
    trimIn = 0,
    trimOut,
    position = 'pip',
    widthFraction = 0.38,
    compositionWidth,
    compositionHeight,
}: TalkingHeadLayerProps) {
    const videoSrc = staticFile(staticPathForScriptAsset(scriptId, src));
    const pipWidth = compositionWidth * widthFraction;
    const pipHeight = pipWidth * (9 / 16);

    if (position === 'background') {
        return (
            <OffthreadVideo
                src={videoSrc}
                startFrom={Math.round(trimIn * 30)}
                endAt={trimOut !== undefined ? Math.round(trimOut * 30) : undefined}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />
        );
    }

    return (
        <OffthreadVideo
            src={videoSrc}
            startFrom={Math.round(trimIn * 30)}
            endAt={trimOut !== undefined ? Math.round(trimOut * 30) : undefined}
            style={{
                position: 'absolute',
                right: 32,
                bottom: 32,
                width: pipWidth,
                height: pipHeight,
                objectFit: 'cover',
                borderRadius: 16,
                boxShadow: '0 12px 40px rgba(60, 54, 45, 0.18)',
            }}
        />
    );
}
