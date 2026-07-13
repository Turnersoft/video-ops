// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/ChapterBeat.tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { TURN_VIDEO_THEME } from '../../lib/turnVideoTheme';
import { useCompositionScale } from '../../lib/useCompositionScale';

type ChapterBeatProps = {
    heading: string;
    body: string;
    emphasis?: string;
};

export function ChapterBeat({ heading, body, emphasis }: ChapterBeatProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
    const y = interpolate(entrance, [0, 1], [s.px(24), 0]);

    const bodyParts = emphasis ? body.split(emphasis) : [body];

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: s.px(72),
                background: t.mathBoard.bgGradient,
                color: t.mathBoard.text,
                transform: `translateY(${y}px)`,
                opacity: entrance,
            }}
        >
            <div
                style={{
                    fontSize: s.px(20),
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: t.mathBoard.accentBlue,
                    marginBottom: s.px(16),
                }}
            >
                {heading}
            </div>
            <div
                style={{
                    fontSize: s.px(42),
                    fontWeight: 650,
                    lineHeight: 1.35,
                    maxWidth: s.px(1100),
                    letterSpacing: '-0.02em',
                }}
            >
                {emphasis && bodyParts.length === 2 ? (
                    <>
                        {bodyParts[0]}
                        <span style={{ color: t.mathBoard.accentGold }}>{emphasis}</span>
                        {bodyParts[1]}
                    </>
                ) : (
                    body
                )}
            </div>
        </div>
    );
}

/** Parse legacy screen-text authoring lines into chapter beat props. */
export function chapterBeatFromScreenText(source: string): ChapterBeatProps {
    const backtick = source.match(/`([^`]+)`/);
    const emphasis = backtick?.[1];
    const cleaned = source.replace(/`/g, '').trim();
    const colon = cleaned.indexOf(':');
    if (colon > 0 && colon < 40) {
        return {
            heading: cleaned.slice(0, colon).trim(),
            body: cleaned.slice(colon + 1).trim(),
            emphasis,
        };
    }
    return {
        heading: 'Idea',
        body: cleaned,
        emphasis,
    };
}
