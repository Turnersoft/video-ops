import '../panels/turnVideoPanelStyles';

import { CompareFontScaleEditorProvider } from '../../components/CompareFontScaleEditor/compareFontScaleEditorContext';
import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion';
import { useEffect, useState } from 'react';

import { OutdoorAlignSeekBridge } from '../../components/OutdoorAlignSeekBridge/OutdoorAlignSeekBridge';
import { SceneSlide } from '../../components/SceneSlide/SceneSlide';
import { useAnimationHotReload } from '../animation/useAnimationHotReload';
import type { VideoFromScriptInputProps } from '../types/renderProps';

export function VideoFromScript({
    scriptId,
    project: projectInput,
    showDirector = false,
    compareFontScales,
    onCompareFontScalesChange,
}: VideoFromScriptInputProps) {
    const [handle] = useState(() => delayRender(`animation:${scriptId}`));
    const { project, error, loading } = useAnimationHotReload(scriptId, showDirector, projectInput, {
        stripOutdoorEdit: true,
    });

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

    const outdoorFormat = project.height > project.width ? 'portrait' : 'landscape';
    const directorEnabled = showDirector || project.showDirector;
    const sceneRevision = project.contentRevision ?? 0;

    const tree = (
        <AbsoluteFill>
            <OutdoorAlignSeekBridge compositionId={scriptId} />
            {project.scenes.map((slide, index) => {
                const durationInFrames = Math.max(
                    1,
                    Math.round(slide.durationSeconds * project.fps),
                );
                const from = project.scenes
                    .slice(0, index)
                    .reduce(
                        (total, scene) =>
                            total + Math.max(1, Math.round(scene.durationSeconds * project.fps)),
                        0,
                    );

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
                            outdoorFormat={outdoorFormat}
                            forceStudioFootagePlaceholder
                        />
                    </Sequence>
                );
            })}
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
