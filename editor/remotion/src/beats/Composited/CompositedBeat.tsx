import type { ReactNode } from 'react';
import { AbsoluteFill, getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMemo } from 'react';

import { BeatPlacementsLayer } from '../../components/BeatPlacementsLayer/BeatPlacementsLayer';
import { GreenAvatarFill } from '../../components/FilmedPlaceholders/FilmedPlaceholders';
import { VideoClipBeat } from '../../components/VideoClipBeat/VideoClipBeat';
import type { VideoOpsBeatBaseFootage, VideoOpsBeatPlacement } from '../../lib/placements/beatPlacements';
import { placementsFromUnknown } from '../../lib/placements/beatPlacements';
import { activeSayLineIndex } from '../../lib/outdoor/sayTiming';
import { compareLayerFromScene } from '../compareLayerFromScene';
import { BeatTemplateStage } from '../BeatTemplateStage';
import { beatTemplateStageMeta } from '../beatTemplateStageMeta';
import { cfgString } from '../configHelpers';
import { parseCompositedConfig } from './api';
import type { BeatTemplateComponentProps } from '../types';
import classes from './CompositedBeat.module.scss';

function configPlacements(config: Record<string, unknown>): VideoOpsBeatPlacement[] {
    return parseCompositedConfig(config).placements;
}

function configBaseFootage(config: Record<string, unknown>): VideoOpsBeatBaseFootage | undefined {
    return parseCompositedConfig(config).baseFootage;
}

/** Footage at the back; draggable timed placements on top (video editor beat). */
export function CompositedBeat({
    scriptId,
    scene,
    config,
}: BeatTemplateComponentProps): ReactNode {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const remotionEnv = getRemotionEnvironment();
    const compareLayer = compareLayerFromScene(scene);
    const director = scene.director;
    const durationSeconds = scene.durationSeconds;
    const activeBeatIndex = useMemo(() => {
        if (!director) {
            return 0;
        }
        return activeSayLineIndex(director, durationSeconds, frame, fps);
    }, [director, durationSeconds, frame, fps]);
    const beatRelativeSeconds = useMemo(() => {
        const sceneSeconds = frame / fps;
        const beatStart =
            director?.sayTimings?.[activeBeatIndex] ??
            activeBeatIndex * (durationSeconds / Math.max(director?.say.length ?? 1, 1));
        return sceneSeconds - beatStart;
    }, [activeBeatIndex, director, durationSeconds, frame, fps]);
    const beatDurationSeconds =
        director?.sayTimings && director.sayTimings[activeBeatIndex + 1] !== undefined
            ? (director.sayTimings[activeBeatIndex + 1] ?? durationSeconds) -
              (director.sayTimings[activeBeatIndex] ?? 0)
            : durationSeconds / Math.max(director?.say.length ?? 1, 1);

    const baseFootage =
        compareLayer?.beatBaseFootage?.[activeBeatIndex] ??
        configBaseFootage(config) ??
        (cfgString(config, 'assetPath')?.trim()
            ? {
                  src: cfgString(config, 'assetPath')!.trim(),
                  objectFit: 'cover' as const,
                  label: cfgString(config, 'animationId') ?? 'Footage',
              }
            : undefined);

    const placements =
        compareLayer?.beatPlacements?.[activeBeatIndex] ??
        configPlacements(config) ??
        placementsFromUnknown(config.stickers);

    const meta = beatTemplateStageMeta('composited');
    const showPlaceholder =
        !baseFootage?.src?.trim() &&
        !remotionEnv.isRendering &&
        (remotionEnv.isStudio || remotionEnv.isPlayer);

    return (
        <BeatTemplateStage tone={meta.tone}>
            <AbsoluteFill className={classes.root}>
                {baseFootage?.src?.trim() ? (
                    <VideoClipBeat
                        scriptId={scriptId}
                        src={baseFootage.src}
                        objectFit={baseFootage.objectFit ?? 'cover'}
                        label={baseFootage.label}
                        beatDurationSeconds={beatDurationSeconds}
                        beatFit="hold-end"
                    />
                ) : showPlaceholder ? (
                    <GreenAvatarFill label="Base footage · drag placements on top" />
                ) : null}
                <BeatPlacementsLayer
                    scriptId={scriptId}
                    sceneIndex={scene.index}
                    beatIndex={activeBeatIndex}
                    placements={placements}
                    beatRelativeSeconds={beatRelativeSeconds}
                    beatDurationSeconds={beatDurationSeconds}
                />
            </AbsoluteFill>
        </BeatTemplateStage>
    );
}
