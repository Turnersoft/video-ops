// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/PictureInPicture.tsx
import type { CSSProperties } from 'react';
import { OffthreadVideo, staticFile } from 'remotion';

import type { PictureInPictureConfig, PipPosition } from '../types';
import { staticPathForScriptAsset } from '../lib/scriptAssetPath';

type PictureInPictureProps = {
    scriptId: string;
    config: PictureInPictureConfig;
    compositionWidth: number;
    compositionHeight: number;
};

function positionStyle(
    position: PipPosition,
    width: number,
    height: number,
): CSSProperties {
    const margin = 32;
    const base: React.CSSProperties = {
        position: 'absolute',
        width,
        height,
        objectFit: 'cover',
        boxShadow: '0 12px 40px rgba(60, 54, 45, 0.18)',
    };

    switch (position) {
        case 'top-left':
            return { ...base, top: margin, left: margin };
        case 'top-right':
            return { ...base, top: margin, right: margin };
        case 'bottom-left':
            return { ...base, bottom: margin, left: margin };
        case 'center':
            return {
                ...base,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        case 'bottom-right':
        default:
            return { ...base, bottom: margin, right: margin };
    }
}

export function PictureInPicture({
    scriptId,
    config,
    compositionWidth,
    compositionHeight,
}: PictureInPictureProps) {
    const widthFraction = config.widthFraction ?? 0.42;
    const pipWidth = compositionWidth * widthFraction;
    const pipHeight = pipWidth * (9 / 16);
    const position = config.position ?? 'bottom-right';
    const src = staticFile(staticPathForScriptAsset(scriptId, config.src));

    return (
        <OffthreadVideo
            src={src}
            startFrom={Math.round((config.startFrom ?? 0) * 30)}
            endAt={config.endAt !== undefined ? Math.round(config.endAt * 30) : undefined}
            style={{
                ...positionStyle(position, pipWidth, pipHeight),
                borderRadius: config.borderRadius ?? 16,
                opacity: config.opacity ?? 1,
            }}
        />
    );
}
