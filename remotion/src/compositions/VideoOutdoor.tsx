// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/compositions/VideoOutdoor.tsx
import '@turn-video-shared/bridge/turnVideoPanelStyles';

import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion';
import { useEffect, useState } from 'react';

import { SceneSlide } from '../components/SceneSlide';
import { OutdoorAlignSeekBridge } from '../components/OutdoorAlignSeekBridge';
import type { OutdoorRenderFormat, VideoOutdoorInputProps } from '../lib/renderProps';
import { useAnimationHotReload } from '../lib/useAnimationHotReload';

const OUTDOOR_DIMENSIONS: Record<OutdoorRenderFormat, { width: number; height: number }> = {
    portrait: { width: 1080, height: 1920 },
    landscape: { width: 1920, height: 1080 },
};

export function VideoOutdoor({
    scriptId,
    format,
    project: projectInput,
}: VideoOutdoorInputProps) {
    const [handle] = useState(() => delayRender(`outdoor:${scriptId}:${format}`));
    const { project, error, loading } = useAnimationHotReload(scriptId, false, projectInput);
    const dimensions = OUTDOOR_DIMENSIONS[format];

    useEffect(() => {
        if (!loading) {
            continueRender(handle);
        }
    }, [handle, loading]);

    if (error) {
        return (
            <AbsoluteFill
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: 48,
                }}
            >
                {error}
            </AbsoluteFill>
        );
    }

    if (!project) {
        return <AbsoluteFill style={{ background: '#0f172a' }} />;
    }

    let frameCursor = 0;
    const sceneRevision = project.contentRevision ?? 0;

    return (
        <AbsoluteFill>
            <OutdoorAlignSeekBridge
                compositionId={
                    format === 'portrait' ? 'video-outdoor-portrait' : 'video-outdoor-landscape'
                }
            />
            {project.scenes.map((slide) => {
                const durationInFrames = Math.max(1, Math.round(slide.durationSeconds * project.fps));
                const from = frameCursor;
                frameCursor += durationInFrames;

                return (
                    <Sequence
                        key={`${slide.index}-${sceneRevision}-${format}`}
                        from={from}
                        durationInFrames={durationInFrames}
                    >
                        <SceneSlide
                            scriptId={scriptId}
                            slide={slide}
                            width={dimensions.width}
                            height={dimensions.height}
                            showDirector={false}
                            contentRevision={sceneRevision}
                            outdoorFormat={format}
                        />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
}

export function outdoorDurationInFrames(
    durationSeconds: number,
    fps: number,
): number {
    return Math.max(1, Math.round(durationSeconds * fps));
}
