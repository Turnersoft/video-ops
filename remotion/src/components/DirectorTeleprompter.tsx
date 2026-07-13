// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/DirectorTeleprompter.tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { activeSayLineIndex } from '../lib/sayTiming';
import type { DirectorScene } from '../lib/renderProps';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { SayDisplayParagraphs } from '../../../../basic_ui/src/pages/VideoOpsPage/SayDisplayParagraphs';

type DirectorTeleprompterProps = {
    director: DirectorScene;
    durationSeconds: number;
};

export function DirectorTeleprompter({ director, durationSeconds }: DirectorTeleprompterProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = TURN_VIDEO_THEME;
    const lineIndex = activeSayLineIndex(director, durationSeconds, frame, fps);
    const activeLine = director.say[lineIndex] ?? '';
    const previousLine = director.say[lineIndex - 1] ?? '';
    const nextLine = director.say[lineIndex + 1] ?? '';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '28px 80px 40px',
                background: t.director.scrim,
                pointerEvents: 'none',
                zIndex: 100,
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: t.director.label,
                    fontWeight: 600,
                }}
            >
                Director · not in export
            </div>
            {previousLine ? (
                <div style={{ fontSize: 18, opacity: 0.5, marginTop: 10, color: t.director.line }}>
                    <SayDisplayParagraphs text={previousLine} />
                </div>
            ) : null}
            <div
                style={{
                    fontSize: 30,
                    fontWeight: 650,
                    lineHeight: 1.28,
                    marginTop: 8,
                    color: t.director.line,
                    maxWidth: 1100,
                }}
            >
                <SayDisplayParagraphs text={activeLine} />
            </div>
            {nextLine ? (
                <div style={{ fontSize: 18, opacity: 0.55, marginTop: 8, color: t.director.line }}>
                    <SayDisplayParagraphs text={nextLine} />
                </div>
            ) : null}
        </div>
    );
}
