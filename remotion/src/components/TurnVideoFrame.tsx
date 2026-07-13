// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TurnVideoFrame.tsx
import type { ReactNode } from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

export const TURN_LANG_LOGO_SRC = 'assets/turn-lang-logo.png';

type TurnVideoFrameProps = {
    sceneTitle?: string;
    main: ReactNode;
    side: ReactNode;
};

function TurnLogo({ height }: { height: number }) {
    return (
        <Img
            src={staticFile(TURN_LANG_LOGO_SRC)}
            alt="Turn-Lang"
            style={{
                height,
                width: 'auto',
                objectFit: 'contain',
                flexShrink: 0,
            }}
        />
    );
}

function AppPanel({
    children,
    flex = 1,
    label,
    delayFrames,
}: {
    children: ReactNode;
    flex?: number;
    label: string;
    delayFrames: number;
}) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const entrance = spring({
        frame: Math.max(0, frame - delayFrames),
        fps,
        config: {
            damping: 18,
            stiffness: 120,
            mass: 0.7,
        },
    });
    const y = interpolate(entrance, [0, 1], [s.px(26), 0]);
    const scale = interpolate(entrance, [0, 1], [0.97, 1]);
    const opacity = interpolate(entrance, [0, 0.35, 1], [0, 1, 1]);

    return (
        <div
            style={{
                flex,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: s.px(26),
                background: 'rgba(255, 255, 255, 0.82)',
                boxShadow: '0 28px 90px rgba(60, 54, 45, 0.12), 0 8px 24px rgba(60, 54, 45, 0.07)',
                overflow: 'hidden',
                transform: `translateY(${y}px) scale(${scale})`,
                opacity,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: s.px(18),
                    padding: `${s.px(18)}px ${s.px(22)}px`,
                    background: 'linear-gradient(180deg, rgba(250,248,243,0.92), rgba(245,242,235,0.72))',
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: s.px(10),
                        minWidth: 0,
                    }}
                >
                    <span
                        style={{
                            width: s.px(10),
                            height: s.px(10),
                            borderRadius: 999,
                            background: t.accent.claude,
                            boxShadow: `0 0 0 ${s.px(5)}px ${t.accent.ring}`,
                            flexShrink: 0,
                        }}
                    />
                    <span
                        style={{
                            fontSize: s.px(18),
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: t.syntax.plain,
                        }}
                    >
                        {label}
                    </span>
                </div>
            </div>
            {children}
        </div>
    );
}

export function TurnVideoFrame({ sceneTitle: _sceneTitle, main, side }: TurnVideoFrameProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(26),
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: s.px(20),
                    flexShrink: 0,
                }}
            >
                <TurnLogo height={s.px(96)} />
                <h1
                    style={{
                        margin: 0,
                        fontSize: s.px(48),
                        fontWeight: 750,
                        lineHeight: 1.1,
                        color: t.syntax.plain,
                        letterSpacing: '-0.02em',
                    }}
                >
                    Turn-Lang
                </h1>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    gap: s.px(26),
                }}
            >
                <AppPanel flex={1} label="Source" delayFrames={2}>
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{main}</div>
                </AppPanel>

                <AppPanel flex={1} label="Render" delayFrames={10}>
                    {side}
                </AppPanel>
            </div>
        </div>
    );
}
