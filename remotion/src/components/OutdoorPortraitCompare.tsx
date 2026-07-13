// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/OutdoorPortraitCompare.tsx
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import {
    COMPARE_PANEL_FONT_SCALE,
    compareBodyFontSize,
    compareBodyFontSizeMin,
} from '@turn-video-shared/ide/compareTypography';

import { Lean4CodeFromTrack } from './Lean4FromTrack';
import { SidePanelFromTrack } from './SidePanelFromTrack';
import { TurnCodeFromTrack } from './TurnCodeFromTrack';
import { activeSayLineIndex } from '../lib/sayTiming';
import { trackLoadOptions, turnTrackLoadOptions } from '../lib/compareTrackLoad';
import type { CompareCompiledTracks } from '../lib/compareTrackLoad';
import type { DirectorScene } from '../lib/renderProps';
import type { CompareFocusBeat, ComparePortraitBottomTarget } from '../video-kit/types';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

const COMPARE_LEAN_LOGO = 'assets/lean.svg';
const COMPARE_TURN_LOGO = 'assets/turn-lang-logo.png';
const PORTRAIT_OUTDOOR_FONT_SCALE = 3;
const PORTRAIT_TITLE_FONT_RATIO = 0.42;
const PORTRAIT_EMPHASIZED_PANE_FLEX = 1.5;
const PORTRAIT_COMPACT_PANE_FLEX = 1;

type OutdoorPortraitCompareProps = {
    scriptId: string;
    leanTrack: string;
    turnTrack: string;
    editorFontScale?: number;
    leanEditorFontScale?: number;
    renderFontScale?: number;
    director?: DirectorScene;
    durationSeconds?: number;
    contentRevision?: number;
    compiledTracks?: CompareCompiledTracks;
    focusBeats?: CompareFocusBeat[];
    portraitBottomTargets?: ComparePortraitBottomTarget[];
};

function activeFocusSide(focusBeats: CompareFocusBeat[] | undefined, seconds: number) {
    if (!focusBeats?.length) {
        return null;
    }
    let current: CompareFocusBeat['side'] | null = null;
    for (const beat of focusBeats) {
        if (seconds >= beat.atSeconds) {
            current = beat.side;
            continue;
        }
        break;
    }
    return current;
}

function portraitBottomMode(
    beatIndex: number,
    focusSide: ReturnType<typeof activeFocusSide>,
    portraitBottomTargets: ComparePortraitBottomTarget[] | undefined,
): 'lean-code' | 'turn-render' {
    const authoredTarget = portraitBottomTargets?.[beatIndex];
    if (authoredTarget) {
        return authoredTarget;
    }
    if (focusSide === 'turn') {
        return 'turn-render';
    }
    if (focusSide === 'lean' || focusSide === 'both') {
        return 'lean-code';
    }
    return portraitBottomTargets?.[beatIndex] ?? 'lean-code';
}

function PortraitPane({
    label,
    accent,
    logoSrc,
    logoHeight = 144,
    flexGrow = 1,
    children,
}: {
    label: string;
    accent: string;
    logoSrc: string;
    logoHeight?: number;
    flexGrow?: number;
    children: ReactNode;
}) {
    const s = useCompositionScale();
    const t = TURN_VIDEO_THEME;
    return (
        <div
            style={{
                flex: `${flexGrow} 1 0`,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: s.px(16),
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: 'rgba(255, 255, 255, 0.9)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: s.px(10),
                    padding: `${s.px(10)}px ${s.px(14)}px`,
                    borderBottom: '1px solid rgba(60, 54, 45, 0.08)',
                    flexShrink: 0,
                }}
            >
                <Img
                    src={staticFile(logoSrc)}
                    style={{
                        height: s.px(logoHeight),
                        width: 'auto',
                        maxWidth: s.px(280),
                        objectFit: 'contain',
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        width: s.px(8),
                        height: s.px(8),
                        borderRadius: 999,
                        background: accent,
                    }}
                />
                <span
                    style={{
                        fontSize: s.px(Math.round(logoHeight * PORTRAIT_TITLE_FONT_RATIO)),
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: t.syntax.plain,
                        lineHeight: 1.1,
                    }}
                >
                    {label}
                </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</div>
        </div>
    );
}

export function OutdoorPortraitCompare({
    scriptId,
    leanTrack,
    turnTrack,
    editorFontScale = 1,
    leanEditorFontScale,
    renderFontScale = 1,
    director,
    durationSeconds = 0,
    contentRevision,
    compiledTracks,
    focusBeats,
    portraitBottomTargets,
}: OutdoorPortraitCompareProps) {
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const compareFont = compareBodyFontSize(s.codeFontSize);
    const fontBoost = PORTRAIT_OUTDOOR_FONT_SCALE;
    const leanFontMax = Math.round(
        compareFont * (leanEditorFontScale ?? editorFontScale) * fontBoost,
    );
    const turnFontMax = Math.round(compareFont * editorFontScale * fontBoost);
    const editorFontMin = Math.max(6, compareBodyFontSizeMin(s.codeFontSizeMin));
    const paneHeight = Math.round(s.height * 0.26);
    const leanLoad = trackLoadOptions({ contentRevision, compiledTracks });
    const turnLoad = turnTrackLoadOptions({ contentRevision, compiledTracks });

    const activeBeatIndex = useMemo(() => {
        if (!director) {
            return 0;
        }
        return activeSayLineIndex(director, durationSeconds, frame, fps);
    }, [director, durationSeconds, frame, fps]);

    const sceneSeconds = frame / fps;
    const focusSide = activeFocusSide(focusBeats, sceneSeconds);
    const bottomMode = portraitBottomMode(
        activeBeatIndex,
        focusSide,
        portraitBottomTargets,
    );
    const emphasizeTopPane = bottomMode === 'turn-render';
    const topPaneFlex = emphasizeTopPane
        ? PORTRAIT_EMPHASIZED_PANE_FLEX
        : PORTRAIT_COMPACT_PANE_FLEX;
    const bottomPaneFlex = emphasizeTopPane
        ? PORTRAIT_COMPACT_PANE_FLEX
        : PORTRAIT_EMPHASIZED_PANE_FLEX;

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(10),
            }}
        >
            <PortraitPane
                label="Turn-Lang Editor"
                accent="#c4a882"
                logoSrc={COMPARE_TURN_LOGO}
                logoHeight={169}
                flexGrow={topPaneFlex}
            >
                <TurnCodeFromTrack
                    scriptId={scriptId}
                    trackPath={turnTrack}
                    fontSize={turnFontMax}
                    minFontSize={editorFontMin}
                    viewportHeight={paneHeight}
                    trackLoad={turnLoad}
                />
            </PortraitPane>
            <PortraitPane
                label={bottomMode === 'turn-render' ? 'Turn-Lang Render' : 'Lean 4 Editor'}
                accent={bottomMode === 'turn-render' ? '#c4a882' : '#569cd6'}
                logoSrc={bottomMode === 'turn-render' ? COMPARE_TURN_LOGO : COMPARE_LEAN_LOGO}
                logoHeight={bottomMode === 'turn-render' ? 169 : 144}
                flexGrow={bottomPaneFlex}
            >
                {bottomMode === 'turn-render' ? (
                    <SidePanelFromTrack
                        scriptId={scriptId}
                        trackPath={turnTrack}
                        fontScale={COMPARE_PANEL_FONT_SCALE * renderFontScale * fontBoost}
                        compact
                        trackLoad={turnLoad}
                    />
                ) : (
                    <Lean4CodeFromTrack
                        scriptId={scriptId}
                        trackPath={leanTrack}
                        fontSize={leanFontMax}
                        minFontSize={editorFontMin}
                        viewportHeight={paneHeight}
                        trackLoad={leanLoad}
                    />
                )}
            </PortraitPane>
        </div>
    );
}
