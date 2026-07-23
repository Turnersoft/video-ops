// /Users/johndoe/Documents/company/video_ops/remotion/src/components/universal/VideoClipBeat.tsx
import { useVideoConfig } from 'remotion';

import type { BeatVideoFit } from '../../lib/outdoor/beatFitVideo';
import { resolveBeatVideoTiming } from '../../lib/outdoor/beatFitVideo';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { ScriptAssetVideo } from '../ScriptAssetVideo/ScriptAssetVideo';
import classes from './VideoClipBeat.module.scss';

type VideoClipBeatProps = {
    scriptId: string;
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
    trimIn?: number;
    trimOut?: number;
    /** Beat / scene slot length in seconds (from animation.json). */
    beatDurationSeconds?: number;
    /** Rendered clip length in seconds (ffprobe or Manim metadata). */
    sourceDurationSeconds?: number;
    /** `stretch` = parametric speed; `hold-end` = 1× then freeze on last frame. Default `hold-end`. */
    beatFit?: BeatVideoFit;
};

/** Main-layer beat that presents a bundled video clip. */
export function VideoClipBeat({
    scriptId,
    src,
    objectFit = 'contain',
    label,
    trimIn,
    trimOut,
    beatDurationSeconds,
    sourceDurationSeconds,
    beatFit = 'hold-end',
}: VideoClipBeatProps) {
    const s = useCompositionScale();
    const { fps } = useVideoConfig();

    const timing =
        beatDurationSeconds !== undefined && sourceDurationSeconds !== undefined
            ? resolveBeatVideoTiming({
                  beatDurationSeconds,
                  sourceDurationSeconds,
                  fit: beatFit,
                  fps,
                  trimInSeconds: trimIn,
              })
            : null;
    const endAtSeconds =
        timing?.endAt !== undefined ? timing.endAt / fps : trimOut;

    return (
        <div className={classes.root} style={scaleCss(s.scale)}>
            {label ? <div className={classes.label}>{label}</div> : null}
            <div className={classes.video}>
                <ScriptAssetVideo
                    scriptId={scriptId}
                    src={src}
                    objectFit={objectFit}
                    trimIn={trimIn}
                    trimOut={endAtSeconds}
                    playbackRate={timing?.playbackRate ?? 1}
                    fps={fps}
                />
            </div>
        </div>
    );
}
