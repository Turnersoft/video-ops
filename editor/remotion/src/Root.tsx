// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/Root.tsx
import { Composition } from 'remotion';

import { VideoFromScript } from './lib/compositions/VideoFromScript';
import { VideoOutdoor, outdoorDurationInFrames } from './lib/compositions/VideoOutdoor';
import {
    BeatPreview,
    type BeatPreviewInputProps,
} from './lib/compositions/BeatPreview';
import {
    BEAT_PREVIEW_DURATION_FRAMES,
    BEAT_PREVIEW_FPS,
    BEAT_PREVIEW_KINDS,
    beatPreviewDimensions,
} from './lib/compositions/beatPreviewFixtures';
import type { OutdoorRenderFormat } from './lib/types/renderProps';
import compositionMeta from './lib/generated/composition-meta.json';
import manifest from '../../../manifest.json';

type CompositionMeta = Record<
    string,
    {
        fps: number;
        width: number;
        height: number;
        totalFrames: number;
    }
>;

const meta = compositionMeta as CompositionMeta;
const OUTDOOR_MAX_SECONDS = 900;

const BEAT_PREVIEW_FORMATS: OutdoorRenderFormat[] = ['landscape', 'portrait'];

function beatPreviewCompositionId(kind: string, format: OutdoorRenderFormat): string {
    if (kind === 'default') {
        return format === 'portrait' ? '0-beat-preview-portrait' : '0-beat-preview';
    }
    return format === 'portrait' ? `beat-preview-${kind}-portrait` : `beat-preview-${kind}`;
}

const beatPreviewDefaultProps: BeatPreviewInputProps = {
    kind: 'compare-dual',
    format: 'landscape',
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="0-beat-preview"
                component={BeatPreview}
                durationInFrames={BEAT_PREVIEW_DURATION_FRAMES}
                fps={BEAT_PREVIEW_FPS}
                width={1920}
                height={1080}
                defaultProps={beatPreviewDefaultProps}
                calculateMetadata={({ props }) => {
                    const format = props.format ?? 'landscape';
                    const dimensions = beatPreviewDimensions(format);
                    return {
                        ...dimensions,
                        durationInFrames: BEAT_PREVIEW_DURATION_FRAMES,
                        fps: BEAT_PREVIEW_FPS,
                    };
                }}
            />
            <Composition
                id="0-beat-preview-portrait"
                component={BeatPreview}
                durationInFrames={BEAT_PREVIEW_DURATION_FRAMES}
                fps={BEAT_PREVIEW_FPS}
                width={1080}
                height={1920}
                defaultProps={{ kind: 'compare-dual', format: 'portrait' }}
            />
            {BEAT_PREVIEW_KINDS.flatMap((kind) =>
                BEAT_PREVIEW_FORMATS.map((format) => {
                    const { width, height } = beatPreviewDimensions(format);
                    return (
                        <Composition
                            key={beatPreviewCompositionId(kind, format)}
                            id={beatPreviewCompositionId(kind, format)}
                            component={BeatPreview}
                            durationInFrames={BEAT_PREVIEW_DURATION_FRAMES}
                            fps={BEAT_PREVIEW_FPS}
                            width={width}
                            height={height}
                            defaultProps={{ kind, format }}
                        />
                    );
                }),
            )}
            {manifest.scripts.map((scriptId) => {
                const project = meta[scriptId] ?? {
                    fps: 30,
                    width: 1920,
                    height: 1080,
                    totalFrames: 1,
                };

                return (
                    <Composition
                        key={scriptId}
                        id={scriptId}
                        component={VideoFromScript}
                        durationInFrames={project.totalFrames}
                        fps={project.fps}
                        width={project.width}
                        height={project.height}
                        defaultProps={{ scriptId, showDirector: false }}
                    />
                );
            })}
            <Composition
                id="video-outdoor-portrait"
                component={VideoOutdoor}
                durationInFrames={outdoorDurationInFrames(OUTDOOR_MAX_SECONDS, 30)}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ scriptId: '04-set-equality', format: 'portrait' }}
            />
            <Composition
                id="video-outdoor-landscape"
                component={VideoOutdoor}
                durationInFrames={outdoorDurationInFrames(OUTDOOR_MAX_SECONDS, 30)}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ scriptId: '04-set-equality', format: 'landscape' }}
            />
        </>
    );
};
