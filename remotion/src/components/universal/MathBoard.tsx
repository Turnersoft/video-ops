// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/MathBoard.tsx
import { useMemo } from 'react';

import { useCompositionScale } from '../../lib/useCompositionScale';
import { activeEventIndex, useSceneClock } from '../../video-kit/useSceneClock';
import type { MathBoardLayer } from '../../video-kit/types';
import { MathBoardBeatSlide } from './MathBoardBeatSlide';

type MathBoardProps = {
    scriptId: string;
    layer: MathBoardLayer;
    durationSeconds: number;
};

/** Black math slide: animated diagram + formula per beat. */
export function MathBoard({ layer, durationSeconds }: MathBoardProps) {
    const s = useCompositionScale();
    const { seconds, fps } = useSceneClock();
    const beats = layer.beats ?? [];

    const beatEvents = useMemo(
        () =>
            beats.map((beat, index) => ({
                atSeconds: beat.atSeconds ?? (index * durationSeconds) / Math.max(beats.length, 1),
            })),
        [beats, durationSeconds],
    );

    const activeIndex = useMemo(() => {
        if (layer.reveal === 'all') {
            return Math.max(0, beats.length - 1);
        }
        if (beats.length) {
            return activeEventIndex(beatEvents, seconds);
        }
        return 0;
    }, [beatEvents, beats.length, layer.reveal, seconds]);

    const visibleBeats =
        layer.reveal === 'all'
            ? beats.map((beat, index) => ({ beat, index }))
            : beats[activeIndex]
              ? [{ beat: beats[activeIndex], index: activeIndex }]
              : [];

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${s.px(32)}px ${s.px(48)}px`,
            }}
        >
            {visibleBeats.map(({ beat, index }) => {
                const text = beat.detail?.trim() || beat.label?.trim() || '';
                if (!text) {
                    return null;
                }
                const atSeconds =
                    beat.atSeconds ?? (index * durationSeconds) / Math.max(beats.length, 1);
                return (
                    <MathBoardBeatSlide
                        key="coherent-math-board-beat"
                        text={text}
                        label={beat.label}
                        revealAtFrame={Math.round(atSeconds * fps)}
                        emphasis={beat.emphasis}
                        diagram={beat.diagram}
                    />
                );
            })}
        </div>
    );
}
