// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/SeriesOutroCard.tsx
import {
    TURN_LANG_HOME_LABEL,
    TURN_LANG_HOME_URL,
    TURN_LANG_WAITLIST_LABEL,
    TURN_LANG_WAITLIST_URL,
} from '@turn-video-shared/videoOpsOutro';
import { interpolate, spring, useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';

import { TURN_VIDEO_THEME } from '../../lib/turnVideoTheme';
import { useCompositionScale } from '../../lib/useCompositionScale';

type OutroLinkProps = {
    label: string;
    url: string;
    caption: string;
    enter: number;
    accent: string;
};

function OutroLinkRow({ label, url, caption, enter, accent }: OutroLinkProps) {
    const s = useCompositionScale();
    const t = TURN_VIDEO_THEME;
    const y = interpolate(enter, [0, 1], [s.px(28), 0]);
    const glow = interpolate(enter, [0, 1], [0, 1]);

    return (
        <div
            style={{
                transform: `translateY(${y}px)`,
                opacity: enter,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: s.px(8),
                padding: `${s.px(18)}px ${s.px(24)}px`,
                borderRadius: s.px(16),
                background: `linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(250,249,245,0.92) 100%)`,
                border: `1px solid ${t.ide.windowBorder}`,
                boxShadow: `0 ${s.px(12)}px ${s.px(32)}px rgba(60, 54, 45, ${0.08 + glow * 0.06})`,
                minWidth: s.px(420),
            }}
        >
            <span
                style={{
                    fontSize: s.px(18),
                    fontWeight: 650,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: t.mathBoard.muted,
                }}
            >
                {caption}
            </span>
            <span
                style={{
                    fontSize: s.px(34),
                    fontWeight: 750,
                    letterSpacing: '-0.02em',
                    color: accent,
                    fontFamily: '"SF Mono", Menlo, ui-monospace, monospace',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontSize: s.px(15),
                    color: t.mathBoard.muted,
                    opacity: 0.85,
                }}
            >
                {url}
            </span>
        </div>
    );
}

/** End card — series reminder + homepage / waitlist links (burned into export). */
export function SeriesOutroCard() {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const backdrop = spring({
        frame,
        fps,
        config: { damping: 24, stiffness: 70 },
    });
    const headline = spring({
        frame: frame - 6,
        fps,
        config: { damping: 20, stiffness: 88, mass: 0.85 },
    });
    const seriesLine = spring({
        frame: frame - 16,
        fps,
        config: { damping: 22, stiffness: 82 },
    });
    const homeEnter = spring({
        frame: frame - 28,
        fps,
        config: { damping: 18, stiffness: 95 },
    });
    const waitlistEnter = spring({
        frame: frame - 40,
        fps,
        config: { damping: 18, stiffness: 95 },
    });
    const accentPulse = interpolate(
        Math.sin((frame / fps) * Math.PI * 1.4),
        [-1, 1],
        [0.92, 1],
    );

    const headlineY = interpolate(headline, [0, 1], [s.px(36), 0]);
    const seriesY = interpolate(seriesLine, [0, 1], [s.px(24), 0]);

    return (
        <AbsoluteFill
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: s.px(72),
                background: t.mathBoard.bgGradient,
                color: t.mathBoard.text,
                textAlign: 'center',
                gap: s.px(28),
                opacity: backdrop,
            }}
        >
            <div
                style={{
                    transform: `translateY(${headlineY}px)`,
                    opacity: headline,
                    fontSize: s.px(52),
                    fontWeight: 780,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.12,
                    maxWidth: s.px(980),
                }}
            >
                One chapter in a longer journey
            </div>
            <div
                style={{
                    transform: `translateY(${seriesY}px)`,
                    opacity: seriesLine,
                    fontSize: s.px(28),
                    lineHeight: 1.5,
                    color: t.mathBoard.muted,
                    maxWidth: s.px(860),
                }}
            >
                We are formalizing abstract algebra from the textbook — definition by definition,
                proof by proof. Stay for the full series.
            </div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: s.px(20),
                    marginTop: s.px(8),
                }}
            >
                <OutroLinkRow
                    caption="Homepage"
                    label={TURN_LANG_HOME_LABEL}
                    url={TURN_LANG_HOME_URL}
                    enter={homeEnter}
                    accent={`rgba(5, 80, 174, ${accentPulse})`}
                />
                <OutroLinkRow
                    caption="Join the waitlist"
                    label={TURN_LANG_WAITLIST_LABEL}
                    url={TURN_LANG_WAITLIST_URL}
                    enter={waitlistEnter}
                    accent={`rgba(217, 119, 87, ${accentPulse})`}
                />
            </div>
        </AbsoluteFill>
    );
}
