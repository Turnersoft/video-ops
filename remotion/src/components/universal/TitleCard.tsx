// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/TitleCard.tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { TURN_VIDEO_THEME } from '../../lib/turnVideoTheme';
import { useCompositionScale } from '../../lib/useCompositionScale';

type TitleCardProps = {
    title: string;
    subtitle?: string;
    variant?: 'hook' | 'chapter' | 'close';
};

export function TitleCard({ title, subtitle, variant = 'hook' }: TitleCardProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        config: { damping: 20, stiffness: 90, mass: 0.8 },
    });
    const titleY = interpolate(entrance, [0, 1], [s.px(40), 0]);
    const subtitleOpacity = interpolate(entrance, [0, 0.45, 1], [0, 0, 1]);

    const accent = variant === 'close' ? t.accent.claude : t.mathBoard.accentBlue;

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: s.px(64),
                background: t.mathBoard.bgGradient,
                color: t.mathBoard.text,
                textAlign: 'center',
                gap: s.px(20),
            }}
        >
            <div
                style={{
                    transform: `translateY(${titleY}px)`,
                    opacity: entrance,
                    fontSize: s.px(variant === 'hook' ? 72 : 56),
                    fontWeight: 750,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.08,
                    maxWidth: s.px(1200),
                }}
            >
                {title}
            </div>
            {subtitle ? (
                <div
                    style={{
                        opacity: subtitleOpacity,
                        fontSize: s.px(30),
                        lineHeight: 1.45,
                        color: t.mathBoard.muted,
                        maxWidth: s.px(900),
                    }}
                >
                    {subtitle}
                </div>
            ) : null}
            <div
                style={{
                    marginTop: s.px(12),
                    width: s.px(120),
                    height: s.px(4),
                    borderRadius: 999,
                    background: accent,
                    opacity: subtitleOpacity,
                }}
            />
        </div>
    );
}
