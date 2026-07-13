// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/ConceptCoverDiagram.tsx
import { coverConceptSvgPath } from '@turn-video-shared/coverAssetPaths';
import type { CoverConceptId } from '@turn-video-shared/videoOpsCover';
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { useCompositionScale } from '../../lib/useCompositionScale';

type ConceptCoverDiagramProps = {
    conceptId: CoverConceptId;
    enterFrame?: number;
};

export function ConceptCoverDiagram({ conceptId, enterFrame = 18 }: ConceptCoverDiagramProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();
    const local = Math.max(0, frame - enterFrame);

    const opacity = interpolate(local, [0, fps * 0.45], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    const scale = interpolate(local, [0, fps * 0.55], [0.82, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });

    const floatY = Math.sin((frame / fps) * Math.PI * 1.4) * 4;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                opacity,
                scale,
                translate: `0px ${floatY}px`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.98) 100%)',
                borderRadius: s.px(14),
                border: `${Math.max(2, s.px(2))}px solid rgba(26, 79, 216, 0.35)`,
                boxShadow: `0 ${s.px(8)}px ${s.px(24)}px rgba(15, 23, 42, 0.16)`,
                padding: `${s.px(8)}px ${s.px(12)}px`,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Img
                src={staticFile(coverConceptSvgPath(conceptId))}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
        </div>
    );
}
