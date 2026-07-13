// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/video-kit/PresenterColumn.tsx
import type { PipLayer, RenderLayer } from '../lib/renderProps';
import type { PictureInPictureConfig, PipPosition } from '../types';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';
import { PictureInPicture } from '../components/PictureInPicture';
import { TalkingHeadLayer } from '../components/TalkingHeadLayer';

type PresenterColumnProps = {
    scriptId: string;
    layers: RenderLayer[];
    compositionWidth: number;
    compositionHeight: number;
};

function pipConfigFromLayer(pip: PipLayer): PictureInPictureConfig {
    return {
        src: pip.src,
        position: (pip.position as PipPosition | undefined) ?? 'bottom-right',
        widthFraction: pip.widthFraction,
        startFrom: pip.startFrom,
        endAt: pip.endAt,
        borderRadius: pip.borderRadius,
        opacity: pip.opacity,
    };
}

export function PresenterColumn({
    scriptId,
    layers,
    compositionWidth,
    compositionHeight,
}: PresenterColumnProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const pip = layers.find((layer) => layer.type === 'pip');
    const talkingHead = layers.find((layer) => layer.type === 'talking-head');
    const columnWidth = s.px(380);
    const columnHeight = compositionHeight - s.px(80);

    return (
        <div
            style={{
                width: columnWidth,
                flexShrink: 0,
                borderRadius: s.px(20),
                overflow: 'hidden',
                border: `1px solid ${t.ide.windowBorder}`,
                boxShadow: t.ide.windowShadow,
                background: t.ide.windowBg,
                position: 'relative',
                alignSelf: 'stretch',
            }}
        >
            {talkingHead?.type === 'talking-head' ? (
                <TalkingHeadLayer
                    scriptId={scriptId}
                    src={String(talkingHead.src)}
                    trimIn={talkingHead.trimIn as number | undefined}
                    trimOut={talkingHead.trimOut as number | undefined}
                    position="background"
                    widthFraction={1}
                    compositionWidth={columnWidth}
                    compositionHeight={columnHeight}
                />
            ) : null}
            {pip?.type === 'pip' && typeof pip.src === 'string' ? (
                <PictureInPicture
                    scriptId={scriptId}
                    config={{
                        ...pipConfigFromLayer(pip as PipLayer),
                        position: 'bottom-right',
                        widthFraction: 0.92,
                    }}
                    compositionWidth={columnWidth}
                    compositionHeight={columnHeight}
                />
            ) : null}
        </div>
    );
}
