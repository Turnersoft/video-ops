// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/CompareVideoFrame.tsx
import type { ReactNode } from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';
import {
    COMPARE_BODY_RELATIVE_SCALE,
    COMPARE_CHROME_FONT_SCALE,
    COMPARE_LANGUAGE_TITLE_SCALE,
} from '@turn-video-shared/ide/compareTypography';
import { COMPARE_PANE_ATTR } from '@turn-video-shared/ide/compareHintLayout';
import type { CompareFocusBeat, CompareFocusSide } from '../video-kit/types';
import { ComparePanelFontStepper } from './ComparePanelFontStepper';

const COMPARE_LEAN_LOGO = 'assets/lean.svg';
const COMPARE_TURN_LOGO = 'assets/turn-lang-logo.png';
const LANDSCAPE_EMPHASIZED_COLUMN_FLEX = 1.45;
const LANDSCAPE_COMPACT_COLUMN_FLEX = 0.85;

function columnFlexGrow(
    columnSide: 'lean' | 'turn',
    focusSide: CompareFocusSide | null,
): number {
    if (!focusSide || focusSide === 'both') {
        return 1;
    }
    if (focusSide === columnSide) {
        return LANDSCAPE_EMPHASIZED_COLUMN_FLEX;
    }
    return LANDSCAPE_COMPACT_COLUMN_FLEX;
}

function columnIsFocused(columnSide: 'lean' | 'turn', focusSide: CompareFocusSide | null): boolean {
    return focusSide === columnSide || focusSide === 'both';
}

/** Last focus side active at `seconds` (scene-relative). `null` = no focus authored. */
function activeFocusSide(
    focusBeats: CompareFocusBeat[] | undefined,
    seconds: number,
): CompareFocusSide | null {
    if (!focusBeats?.length) {
        return null;
    }
    let current: CompareFocusSide | null = null;
    for (const beat of focusBeats) {
        if (seconds >= beat.atSeconds) {
            current = beat.side;
            continue;
        }
        break;
    }
    return current;
}

type CompareVideoFrameProps = {
    leftLabel: string;
    rightLabel: string;
    leftAccent: string;
    rightAccent: string;
    leftMain: ReactNode;
    leftSide: ReactNode;
    rightMain: ReactNode;
    rightSide: ReactNode;
    leftLogoSrc?: string;
    rightLogoSrc?: string;
    focusBeats?: CompareFocusBeat[];
};

function VsDivider() {
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const pulse = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
    const scale = interpolate(pulse, [0, 1], [0.6, 1]);
    const cf = (size: number) => s.px(size * COMPARE_CHROME_FONT_SCALE);

    return (
        <div
            style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${scale})`,
                zIndex: 4,
                width: s.px(52),
                height: s.px(52),
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: cf(16),
                fontWeight: 900,
                letterSpacing: '0.06em',
                color: '#5C574F',
                background: 'linear-gradient(145deg, #FAF8F3, #EDE8DF)',
                border: '2px solid rgba(60, 54, 45, 0.12)',
                boxShadow: '0 8px 28px rgba(60, 54, 45, 0.18)',
            }}
        >
            vs
        </div>
    );
}

/** One language: label, then code (full width), then render (full width). */
function CompareLanguageRow({
    label,
    accent,
    logoSrc,
    code,
    render,
    delayFrames,
    darkEditor,
    columnSide,
    flexGrow = 1,
    focused = false,
}: {
    label: string;
    accent: string;
    logoSrc?: string;
    code: ReactNode;
    render: ReactNode;
    delayFrames: number;
    darkEditor?: boolean;
    columnSide: 'lean' | 'turn';
    flexGrow?: number;
    focused?: boolean;
}) {
    const codePane = columnSide === 'lean' ? 'lean-code' : 'turn-code';
    const renderPane = columnSide === 'lean' ? 'lean-goal' : 'turn-knowledge';
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const bodyCf = (size: number) =>
        s.px(size * COMPARE_CHROME_FONT_SCALE * COMPARE_BODY_RELATIVE_SCALE);
    const titleCf = (size: number) =>
        s.px(size * COMPARE_CHROME_FONT_SCALE * COMPARE_LANGUAGE_TITLE_SCALE);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const entrance = spring({
        frame: Math.max(0, frame - delayFrames),
        fps,
        config: { damping: 18, stiffness: 120, mass: 0.7 },
    });
    const y = interpolate(entrance, [0, 1], [s.px(20), 0]);
    const opacity = interpolate(entrance, [0, 0.35, 1], [0, 1, 1]);

    return (
        <div
            style={{
                flex: `${flexGrow} 1 0`,
                minHeight: 0,
                minWidth: 0,
                width: '100%',
                height: '100%',
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(10),
                transform: `translateY(${y}px)`,
                opacity,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: titleCf(8),
                    flexShrink: 0,
                    padding: focused ? `${s.px(4)}px ${s.px(8)}px` : undefined,
                    borderRadius: focused ? s.px(12) : undefined,
                    background: focused ? 'rgba(255, 255, 255, 0.72)' : undefined,
                    boxShadow: focused ? `0 0 ${titleCf(18)}px ${accent}66` : undefined,
                }}
            >
                {logoSrc ? (
                    <Img
                        src={staticFile(logoSrc)}
                        style={{
                            height: titleCf(34),
                            width: 'auto',
                            maxWidth: titleCf(120),
                            objectFit: 'contain',
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <span
                        style={{
                            width: titleCf(10),
                            height: titleCf(10),
                            borderRadius: 999,
                            background: accent,
                            boxShadow: `0 0 ${titleCf(10)}px ${accent}88`,
                        }}
                    />
                )}
                <span
                    style={{
                        fontSize: titleCf(20),
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        color: t.syntax.plain,
                    }}
                >
                    {label}
                </span>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: s.compareCodePaneHeight * 2 + s.px(48),
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: s.px(8),
                    borderRadius: s.px(18),
                    background: 'rgba(255, 255, 255, 0.88)',
                    overflow: 'hidden',
                    border: '1px solid rgba(60, 54, 45, 0.12)',
                    boxShadow: `0 ${s.px(12)}px ${s.px(36)}px rgba(60, 54, 45, 0.06)`,
                }}
            >
                <div
                    style={{
                        flex: '1 1 0',
                        minHeight: 0,
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: darkEditor ? '#1e1e1e' : '#faf9f5',
                        borderBottom: '1px solid rgba(60, 54, 45, 0.08)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: s.px(8),
                            padding: `${s.px(6)}px ${s.px(12)}px`,
                            flexShrink: 0,
                            width: '100%',
                            boxSizing: 'border-box',
                        }}
                    >
                        <span
                            style={{
                                fontSize: bodyCf(11),
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: darkEditor ? '#858585' : '#6B6860',
                                flexShrink: 0,
                            }}
                        >
                            Code
                        </span>
                    </div>
                    <div
                        style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}
                        {...{ [COMPARE_PANE_ATTR]: codePane }}
                    >
                        {code}
                    </div>
                </div>

                <div
                    style={{
                        flex: '1 1 0',
                        minHeight: 0,
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#faf9f5',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: s.px(8),
                            padding: `${s.px(6)}px ${s.px(12)}px`,
                            flexShrink: 0,
                            width: '100%',
                            boxSizing: 'border-box',
                        }}
                    >
                        <span
                            style={{
                                fontSize: bodyCf(11),
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#6B6860',
                                flexShrink: 0,
                            }}
                        >
                            Render
                        </span>
                        <ComparePanelFontStepper field="renderFontScale" variant="light" />
                    </div>
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            width: '100%',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        {...{ [COMPARE_PANE_ATTR]: renderPane }}
                    >
                        {render}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Lean left, Turn right — each column stacks code over render. */
export function CompareVideoFrame({
    leftLabel,
    rightLabel,
    leftAccent,
    rightAccent,
    leftMain,
    leftSide,
    rightMain,
    rightSide,
    leftLogoSrc = COMPARE_LEAN_LOGO,
    rightLogoSrc = COMPARE_TURN_LOGO,
    focusBeats,
}: CompareVideoFrameProps) {
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const focusSide = activeFocusSide(focusBeats, frame / fps);
    const compareColumnMinHeight = s.compareCodePaneHeight * 2 + s.px(96);

    return (
        <div
            style={{
                flex: 1,
                minHeight: compareColumnMinHeight,
                height: '100%',
                width: '100%',
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'row',
                gap: s.px(20),
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            <CompareLanguageRow
                label={leftLabel}
                accent={leftAccent}
                logoSrc={leftLogoSrc}
                code={leftMain}
                render={leftSide}
                delayFrames={2}
                darkEditor
                columnSide="lean"
                flexGrow={columnFlexGrow('lean', focusSide)}
                focused={columnIsFocused('lean', focusSide)}
            />
            <VsDivider />
            <CompareLanguageRow
                label={rightLabel}
                accent={rightAccent}
                logoSrc={rightLogoSrc}
                code={rightMain}
                render={rightSide}
                delayFrames={10}
                columnSide="turn"
                flexGrow={columnFlexGrow('turn', focusSide)}
                focused={columnIsFocused('turn', focusSide)}
            />
        </div>
    );
}
