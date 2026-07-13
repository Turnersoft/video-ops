// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/compositions/VideoFromScript.tsx
import '@turn-video-shared/bridge/turnVideoPanelStyles';

import { CompareFontScaleEditorProvider } from '@turn-video-shared/ide/compareFontScaleEditorContext';
import { VIDEO_OPS_COVER_SECONDS } from '@turn-video-shared/videoOpsCover';
import { VIDEO_OPS_SERIES_OUTRO_SECONDS } from '@turn-video-shared/videoOpsOutro';
import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion';
import { useEffect, useState } from 'react';

import { SceneSlide } from '../components/SceneSlide';
import { SeriesOutroCard } from '../components/universal/SeriesOutroCard';
import { VideoOpsCoverCard } from '../components/universal/VideoOpsCoverCard';
import type { VideoFromScriptInputProps } from '../lib/renderProps';
import { useAnimationHotReload } from '../lib/useAnimationHotReload';

export function VideoFromScript({
    scriptId,
    project: projectInput,
    showDirector = false,
    compareFontScales,
    onCompareFontScalesChange,
}: VideoFromScriptInputProps) {
    const [handle] = useState(() => delayRender(`animation:${scriptId}`));
    const { project, error, loading } = useAnimationHotReload(scriptId, showDirector, projectInput);

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
    const directorEnabled = showDirector || project.showDirector;
    const sceneRevision = project.contentRevision ?? 0;
    const coverFrames = Math.max(1, Math.round(VIDEO_OPS_COVER_SECONDS * project.fps));
    const outroFrames = Math.max(1, Math.round(VIDEO_OPS_SERIES_OUTRO_SECONDS * project.fps));

    const tree = (
        <AbsoluteFill>
            <Sequence from={0} durationInFrames={coverFrames}>
                <VideoOpsCoverCard scriptId={scriptId} cover={project.cover} />
            </Sequence>
            {project.scenes.map((slide) => {
                const durationInFrames = Math.max(
                    1,
                    Math.round(slide.durationSeconds * project.fps),
                );
                const from = frameCursor + coverFrames;
                frameCursor += durationInFrames;

                return (
                    <Sequence
                        key={`${slide.index}-${sceneRevision}`}
                        from={from}
                        durationInFrames={durationInFrames}
                    >
                        <SceneSlide
                            scriptId={scriptId}
                            slide={slide}
                            width={project.width}
                            height={project.height}
                            showDirector={directorEnabled}
                            contentRevision={sceneRevision}
                        />
                    </Sequence>
                );
            })}
            <Sequence from={frameCursor + coverFrames} durationInFrames={outroFrames}>
                <SeriesOutroCard />
            </Sequence>
        </AbsoluteFill>
    );

    if (compareFontScales && onCompareFontScalesChange) {
        return (
            <CompareFontScaleEditorProvider
                scales={compareFontScales}
                onChange={onCompareFontScalesChange}
            >
                {tree}
            </CompareFontScaleEditorProvider>
        );
    }

    return tree;
}
