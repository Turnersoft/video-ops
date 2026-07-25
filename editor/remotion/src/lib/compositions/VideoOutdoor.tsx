import '../panels/turnVideoPanelStyles';

import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion';
import { useEffect, useState } from 'react';

import { OutdoorAlignSeekBridge } from '../../components/OutdoorAlignSeekBridge/OutdoorAlignSeekBridge';
import { SceneSlide } from '../../components/SceneSlide/SceneSlide';
import { fetchLiveRenderPropsJson } from '../animation/fetchLiveRenderProps';
import { useAnimationHotReload } from '../animation/useAnimationHotReload';
import { canonicalVideoOpsScriptId } from '../videoOpsPaths';
import type { OutdoorRenderFormat, VideoOutdoorInputProps } from '../types/renderProps';

const OUTDOOR_DIMENSIONS: Record<OutdoorRenderFormat, { width: number; height: number }> = {
    portrait: { width: 1080, height: 1920 },
    landscape: { width: 1920, height: 1080 },
};

function readOutdoorPreviewQuery(): { takeId?: string; scriptId?: string } {
    if (typeof window === 'undefined') {
        return {};
    }
    const params = new URLSearchParams(window.location.search);
    return {
        takeId: params.get('takeId')?.trim() || undefined,
        scriptId: params.get('scriptId')?.trim() || undefined,
    };
}

export function VideoOutdoor({
    scriptId: scriptIdProp,
    format,
    project: projectInput,
}: VideoOutdoorInputProps) {
    const previewQuery = readOutdoorPreviewQuery();
    const scriptId = canonicalVideoOpsScriptId(previewQuery.scriptId ?? scriptIdProp);
    const [handle] = useState(() => delayRender(`outdoor:${scriptId}:${format}:${previewQuery.takeId ?? 'script'}`));
    const { project, error, loading } = useAnimationHotReload(scriptId, false, projectInput, {
        includeOutdoorEdit: true,
        takeId: previewQuery.takeId,
    });
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
    const takeRevisionKey = previewQuery.takeId ?? 'script';

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
                        key={`${slide.index}-${format}-${takeRevisionKey}`}
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

/** Studio timeline length from live take render-props (pads to cut MP4 when needed). */
export async function calculateOutdoorMetadata({
    props,
}: {
    props: VideoOutdoorInputProps;
}): Promise<{
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
}> {
    const format = props.format ?? 'landscape';
    const dimensions = OUTDOOR_DIMENSIONS[format];
    const fps = 30;
    const fallback = {
        ...dimensions,
        fps,
        durationInFrames: outdoorDurationInFrames(OUTDOOR_MAX_SECONDS_FALLBACK, fps),
    };
    // CLI / props file: project is already compiled + outdoor-overlaid.
    if (props.project && props.project.totalFrames > 0) {
        return {
            ...dimensions,
            fps: props.project.fps > 0 ? props.project.fps : fps,
            durationInFrames: Math.max(1, Math.round(props.project.totalFrames)),
        };
    }
    if (typeof window === 'undefined') {
        return fallback;
    }
    const params = new URLSearchParams(window.location.search);
    const scriptId = canonicalVideoOpsScriptId(params.get('scriptId')?.trim() || props.scriptId);
    const takeId = params.get('takeId')?.trim() || undefined;
    try {
        const raw = await fetchLiveRenderPropsJson(scriptId, Date.now(), {
            includeOutdoorEdit: true,
            takeId,
        });
        if (!raw) {
            return fallback;
        }
        const parsed = JSON.parse(raw) as { totalFrames?: number; fps?: number };
        const totalFrames = Number(parsed.totalFrames);
        if (!Number.isFinite(totalFrames) || totalFrames < 1) {
            return fallback;
        }
        return {
            ...dimensions,
            fps: Number(parsed.fps) > 0 ? Number(parsed.fps) : fps,
            durationInFrames: Math.max(1, Math.round(totalFrames)),
        };
    } catch {
        return fallback;
    }
}

const OUTDOOR_MAX_SECONDS_FALLBACK = 900;
