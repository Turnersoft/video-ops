import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    getRemotionEnvironment,
    Img,
    interpolate,
    spring,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';

import {
    CompareFontScaleEditorProvider,
    useCompareFontScaleEditor,
} from '../../components/CompareFontScaleEditor/compareFontScaleEditorContext';
import {
    type CompareFontScales,
    readCompareBeatFontScalesFromStorage,
    writeAllCompareBeatFontScalesToStorage,
} from '../../lib/tracks/compareFontScale';
import { COMPARE_PANE_ATTR } from '../../lib/tracks/compareHintLayout';
import {
    COMPARE_PANEL_FONT_SCALE,
    compareBodyFontSize,
    compareBodyFontSizeMin,
} from '../../lib/tracks/compareTypography';

import type { VideoOpsBeatPlacement } from '../../lib/placements/beatPlacements';
import { legacyStickersToPlacements } from '../../lib/placements/beatPlacements';
import type { VideoOpsBeatSticker } from '../../lib/compile/video-ops/videoOpsAnimationBeats.ts';
import { BeatPlacementsLayer } from '../../components/BeatPlacementsLayer/BeatPlacementsLayer';
import { CompareBeatVideoPanel } from '../../components/CompareBeatVideoPanel/CompareBeatVideoPanel';
import { CompareFontScalesSaveBar } from '../../components/CompareFontScalesSaveBar/CompareFontScalesSaveBar';
import { CompareHintCallouts } from '../../components/CompareHintCallouts/CompareHintCallouts';
import { ComparePanelFontStepper } from '../../components/ComparePanelFontStepper/ComparePanelFontStepper';
import { Lean4CodeFromTrack, Lean4GoalFromTrack } from '../../components/Lean4FromTrack/Lean4FromTrack';
import { SidePanelFromTrack } from '../../components/SidePanelFromTrack/SidePanelFromTrack';
import { TurnCodeFromTrack } from '../../components/TurnCodeFromTrack/TurnCodeFromTrack';
import type { CompareFocusBeat, ComparePortraitBottomTarget } from '../../lib/layers/types';
import { scaleCss } from '../../lib/layout/scaleCss';
import { TURN_VIDEO_THEME } from '../../lib/layout/turnVideoTheme';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { useOutdoorLayout } from '../../lib/outdoor/outdoorLayoutContext';
import { activeSayLineIndex } from '../../lib/outdoor/sayTiming';
import type { CompareCompiledTracks } from '../../lib/tracks/compareTrackLoad';
import { trackLoadOptions, turnTrackLoadOptions } from '../../lib/tracks/compareTrackLoad';
import type { CompareBeatVideo, DirectorScene, RenderScene } from '../../lib/types/renderProps';
import { BeatTemplateStage } from '../BeatTemplateStage';
import { beatTemplateStageMeta } from '../beatTemplateStageMeta';
import { cfgString } from '../configHelpers';
import { compareLayerFromScene } from '../compareLayerFromScene';
import type { BeatTemplateSceneProps } from '../types';
import { BeatFootageOverlays, BeatPortraitPresenterBand, showStudioFootagePlaceholders } from '../../components/BeatFootage/BeatFootage';
import { TextbookPanel } from '../../components/TextbookPanel/TextbookPanel';
import type { TextbookOverlayConfig } from '../../components/TextbookPanel/textbookOverlayTypes';
import { LEAN_LOGO_SRC, TURN_LANG_LOGO_SRC } from '../../lib/layout/brandAssets';
import { screenRecordingLabel as compareScreenRecordingLabel } from './api';
import { activeFocusSide, columnFlexGrow, columnIsFocused } from './focus';
import classes from './CompareDualBeat.module.scss';

export const COMPARE_LEAN_LOGO = LEAN_LOGO_SRC;
export const COMPARE_TURN_LOGO = TURN_LANG_LOGO_SRC;

export type LandscapeProps = {
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

    return (
        <div
            className={classes.landscapeVsDivider}
            style={{
                ...scaleCss(s.scale),
                transform: `translate(-50%, -50%) scale(${scale})`,
            }}
        >
            vs
        </div>
    );
}

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
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const entrance = spring({
        frame: Math.max(0, frame - delayFrames),
        fps,
        config: { damping: 18, stiffness: 120, mass: 0.7 },
    });
    const y = interpolate(entrance, [0, 1], [s.px(20), 0]);
    const opacity = interpolate(entrance, [0, 0.35, 1], [0, 1, 1]);

    const themeStyle = {
        '--syntax-plain': t.syntax.plain,
    } as CSSProperties;

    return (
        <div
            className={classes.landscapeLanguageRow}
            style={{
                ...scaleCss(s.scale),
                ...themeStyle,
                flex: `${flexGrow} 1 0`,
                transform: `translateY(${y}px)`,
                opacity,
            }}
        >
            <div
                className={`${classes.landscapeTitleRow} ${focused ? classes.landscapeTitleRowFocused : ''}`}
                style={focused ? { boxShadow: `0 0 ${s.px(54)}px ${accent}66` } : undefined}
            >
                {logoSrc ? (
                    <Img src={staticFile(logoSrc)} className={classes.landscapeLogo} />
                ) : (
                    <span
                        className={classes.landscapeAccentDot}
                        style={{
                            background: accent,
                            boxShadow: `0 0 ${s.px(30)}px ${accent}88`,
                        }}
                    />
                )}
                <span className={classes.landscapeTitleLabel}>{label}</span>
            </div>

            <div
                className={classes.landscapeCard}
                style={{ minHeight: s.compareCodePaneHeight * 2 + s.px(48) }}
            >
                <div
                    className={`${classes.landscapeCodeSection} ${darkEditor ? classes.landscapeCodeSectionDark : classes.landscapeCodeSectionLight}`}
                >
                    <div className={classes.landscapePaneHeader}>
                        <span
                            className={`${classes.landscapePaneHeaderLabel} ${darkEditor ? classes.landscapePaneHeaderLabelDark : classes.landscapePaneHeaderLabelLight}`}
                        >
                            Code
                        </span>
                    </div>
                    <div className={classes.landscapePaneBody} {...{ [COMPARE_PANE_ATTR]: codePane }}>
                        {code}
                    </div>
                </div>

                <div className={classes.landscapeRenderSection}>
                    <div className={classes.landscapePaneHeader}>
                        <span
                            className={`${classes.landscapePaneHeaderLabel} ${classes.landscapePaneHeaderLabelLight}`}
                        >
                            Render
                        </span>
                        <ComparePanelFontStepper field="renderFontScale" variant="light" />
                    </div>
                    <div
                        className={classes.landscapeRenderPaneBody}
                        {...{ [COMPARE_PANE_ATTR]: renderPane }}
                    >
                        {render}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Lean left, Turn right — logos, titles, code/render columns. */
function CompareLandscape({
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
}: LandscapeProps) {
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const focusSide = activeFocusSide(focusBeats, frame / fps);
    const compareColumnMinHeight = s.compareCodePaneHeight * 2 + s.px(96);

    return (
        <div
            className={classes.landscapeFrame}
            style={{
                ...scaleCss(s.scale),
                minHeight: compareColumnMinHeight,
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

const PORTRAIT_OUTDOOR_FONT_SCALE = 3;
const PORTRAIT_TITLE_FONT_RATIO = 0.42;
const PORTRAIT_EMPHASIZED_PANE_FLEX = 1.5;
const PORTRAIT_COMPACT_PANE_FLEX = 1;

export type PortraitProps = {
    scriptId: string;
    scene: RenderScene;
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
            className={classes.portraitPane}
            style={{
                flex: `${flexGrow} 1 0`,
                ...scaleCss(s.scale),
            }}
        >
            <div className={classes.portraitPaneHeader}>
                <Img
                    src={staticFile(logoSrc)}
                    className={classes.portraitLogo}
                    style={{ height: s.px(logoHeight) }}
                />
                <span className={classes.portraitAccentDot} style={{ background: accent }} />
                <span
                    className={classes.portraitPaneTitle}
                    style={{
                        fontSize: s.px(Math.round(logoHeight * PORTRAIT_TITLE_FONT_RATIO)),
                        color: t.syntax.plain,
                    }}
                >
                    {label}
                </span>
            </div>
            <div className={classes.portraitPaneBody}>{children}</div>
        </div>
    );
}

/** Portrait compare — presenter band placeholder, Turn editor, Lean/Turn bottom pane. */
function ComparePortrait({
    scriptId,
    scene,
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
}: PortraitProps) {
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
    const showPresenterBand = showStudioFootagePlaceholders(scene);

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
        <div className={classes.portraitCompareRoot} style={scaleCss(s.scale)}>
            {showPresenterBand ? <BeatPortraitPresenterBand /> : null}
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

export type CompareBeatSessionProps = {
    scriptId: string;
    scene: RenderScene;
    leanTrack: string;
    turnTrack: string;
    leftLabel?: string;
    rightLabel?: string;
    editorFontScale?: number;
    leanEditorFontScale?: number;
    renderFontScale?: number;
    beatFontScales?: CompareFontScales[];
    director?: DirectorScene;
    durationSeconds?: number;
    hintLayoutsPath?: string;
    contentRevision?: number;
    compiledTracks?: CompareCompiledTracks;
    focusBeats?: CompareFocusBeat[];
    portraitBottomTargets?: ComparePortraitBottomTarget[];
    beatVideos?: Array<CompareBeatVideo | undefined>;
    beatPlacements?: Array<VideoOpsBeatPlacement[] | undefined>;
    /** @deprecated Use beatPlacements */
    beatStickers?: Array<VideoOpsBeatSticker[] | undefined>;
    textbookOverlay?: TextbookOverlayConfig;
    beatRelativeSeconds?: number;
    screenRecordingLabel?: string | null;
};

function layerFontScales(
    editorFontScale: number,
    leanEditorFontScale: number | undefined,
    renderFontScale: number,
): CompareFontScales {
    return {
        editorFontScale,
        leanEditorFontScale: leanEditorFontScale ?? editorFontScale,
        renderFontScale,
    };
}

function mergeBeatFontScales(
    scriptId: string,
    beatIndex: number,
    fromLayer: CompareFontScales,
): CompareFontScales {
    const stored = readCompareBeatFontScalesFromStorage(scriptId, beatIndex);
    if (!stored) {
        return fromLayer;
    }
    return { ...fromLayer, ...stored };
}

function resolveAllBeatFontScales(
    scriptId: string,
    beatCount: number,
    beatFontScales: CompareFontScales[] | undefined,
    sceneDefaults: CompareFontScales,
    localBeatOverrides: Record<number, CompareFontScales>,
): CompareFontScales[] {
    return Array.from({ length: beatCount }, (_, index) => {
        const override = localBeatOverrides[index];
        if (override) {
            return override;
        }
        const fromLayer = beatFontScales?.[index] ?? sceneDefaults;
        return mergeBeatFontScales(scriptId, index, fromLayer);
    });
}

type CompareBeatBodyProps = CompareBeatSessionProps & {
    activeBeatIndex: number;
    fallbackScales: CompareFontScales;
};

function CompareBeatBody({
    scriptId,
    scene,
    leanTrack,
    turnTrack,
    leftLabel = 'Lean 4',
    rightLabel = 'Turn-Lang',
    fallbackScales,
    hintLayoutsPath,
    contentRevision,
    compiledTracks,
    focusBeats,
    portraitBottomTargets,
    activeBeatIndex,
    beatVideos,
    beatPlacements,
    beatStickers,
    textbookOverlay,
    beatRelativeSeconds = 0,
    director,
    durationSeconds = 0,
    editorFontScale = 1,
    leanEditorFontScale,
    renderFontScale = 1,
    screenRecordingLabel = null,
}: CompareBeatBodyProps): ReactNode {
    const scales = fallbackScales;
    const activeBeatVideo = beatVideos?.[activeBeatIndex];
    const outdoorFormat = useOutdoorLayout() ?? 'landscape';
    const s = useCompositionScale();
    const t = TURN_VIDEO_THEME;
    const compareFont = compareBodyFontSize(s.codeFontSize);
    const editorFontMin = compareBodyFontSizeMin(s.codeFontSizeMin);
    const leanFont = Math.round(compareFont * scales.leanEditorFontScale);
    const turnFont = Math.round(compareFont * scales.editorFontScale);
    const comparePaneHeight = s.compareCodePaneHeight;
    const leanLoad = trackLoadOptions({ contentRevision, compiledTracks });
    const turnLoad = turnTrackLoadOptions({ contentRevision, compiledTracks });
    const activePlacements = useMemo(() => {
        const fromLayer = beatPlacements?.[activeBeatIndex];
        if (fromLayer?.length) {
            return fromLayer;
        }
        return legacyStickersToPlacements(beatStickers?.[activeBeatIndex]);
    }, [activeBeatIndex, beatPlacements, beatStickers]);
    const activeBeatDurationSeconds = useMemo(() => {
        if (
            director?.sayTimings &&
            director.sayTimings[activeBeatIndex + 1] !== undefined
        ) {
            return (
                (director.sayTimings[activeBeatIndex + 1] ?? durationSeconds) -
                (director.sayTimings[activeBeatIndex] ?? 0)
            );
        }
        return durationSeconds / Math.max(director?.say.length ?? 1, 1);
    }, [activeBeatIndex, director, durationSeconds]);

    const compareLayout =
        outdoorFormat === 'portrait' ? (
            <ComparePortrait
                scriptId={scriptId}
                scene={scene}
                leanTrack={leanTrack}
                turnTrack={turnTrack}
                editorFontScale={editorFontScale}
                leanEditorFontScale={leanEditorFontScale}
                renderFontScale={renderFontScale}
                director={director}
                durationSeconds={durationSeconds}
                contentRevision={contentRevision}
                compiledTracks={compiledTracks}
                focusBeats={focusBeats}
                portraitBottomTargets={portraitBottomTargets}
            />
        ) : (
            <CompareLandscape
                leftLabel={leftLabel}
                rightLabel={rightLabel}
                leftAccent="#569cd6"
                rightAccent={t.accent.claude}
                focusBeats={focusBeats}
                leftMain={
                    <Lean4CodeFromTrack
                        scriptId={scriptId}
                        trackPath={leanTrack}
                        fontSize={leanFont}
                        minFontSize={editorFontMin}
                        viewportHeight={comparePaneHeight}
                        wrapLines
                        trackLoad={leanLoad}
                    />
                }
                leftSide={
                    <Lean4GoalFromTrack
                        scriptId={scriptId}
                        trackPath={leanTrack}
                        fontScale={COMPARE_PANEL_FONT_SCALE * scales.renderFontScale}
                        compact
                        trackLoad={leanLoad}
                        inlineGoalExport={compiledTracks?.goalExport}
                    />
                }
                rightMain={
                    <TurnCodeFromTrack
                        scriptId={scriptId}
                        trackPath={turnTrack}
                        fontSize={turnFont}
                        minFontSize={editorFontMin}
                        viewportHeight={comparePaneHeight}
                        wrapLines
                        trackLoad={turnLoad}
                    />
                }
                rightSide={
                    <SidePanelFromTrack
                        scriptId={scriptId}
                        trackPath={turnTrack}
                        fontScale={COMPARE_PANEL_FONT_SCALE * scales.renderFontScale}
                        compact
                        trackLoad={turnLoad}
                    />
                }
            />
        );

    return (
        <div className={classes.root}>
            {activeBeatVideo ? (
                <CompareBeatVideoPanel scriptId={scriptId} video={activeBeatVideo} />
            ) : (
                compareLayout
            )}
            {activePlacements.length > 0 ? (
                <BeatPlacementsLayer
                    scriptId={scriptId}
                    sceneIndex={scene.index}
                    beatIndex={activeBeatIndex}
                    placements={activePlacements}
                    beatRelativeSeconds={beatRelativeSeconds}
                    beatDurationSeconds={activeBeatDurationSeconds}
                />
            ) : null}
            <BeatFootageOverlays
                scriptId={scriptId}
                scene={scene}
                activeBeatIndex={activeBeatIndex}
                format={outdoorFormat}
                screenRecordingLabel={screenRecordingLabel}
            />
            {!activeBeatVideo ? (
                <CompareHintCallouts
                    scriptId={scriptId}
                    leanTrackPath={leanTrack}
                    turnTrackPath={turnTrack}
                    hintLayoutsPath={hintLayoutsPath}
                    contentRevision={contentRevision}
                    compiledTracks={compiledTracks}
                />
            ) : null}
            {textbookOverlay ? (
                <TextbookPanel
                    scriptId={scriptId}
                    sceneIndex={scene.index}
                    overlay={textbookOverlay}
                />
            ) : null}
        </div>
    );
}

/** Landscape or portrait compare session — font scales, active beat, footage placeholders. */
export function CompareBeatSession({
    scriptId,
    scene,
    editorFontScale = 1,
    leanEditorFontScale,
    renderFontScale = 1,
    beatFontScales,
    director,
    durationSeconds = 0,
    screenRecordingLabel = null,
    ...rest
}: CompareBeatSessionProps): ReactNode {
    const parentEditor = useCompareFontScaleEditor();
    const remotionEnv = getRemotionEnvironment();
    const canEditFontScales =
        !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const sceneDefaults = useMemo(
        () => layerFontScales(editorFontScale, leanEditorFontScale, renderFontScale),
        [editorFontScale, leanEditorFontScale, renderFontScale],
    );

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

    const layerBeatScales = useMemo(() => {
        const fromBeat = beatFontScales?.[activeBeatIndex];
        return fromBeat ?? sceneDefaults;
    }, [activeBeatIndex, beatFontScales, sceneDefaults]);

    const [localBeatOverrides, setLocalBeatOverrides] = useState<
        Record<number, CompareFontScales>
    >({});

    useEffect(() => {
        if (parentEditor) {
            return;
        }
        setLocalBeatOverrides({});
    }, [scriptId, parentEditor]);

    const activeScales = useMemo(() => {
        const override = localBeatOverrides[activeBeatIndex];
        if (override) {
            return override;
        }
        return mergeBeatFontScales(scriptId, activeBeatIndex, layerBeatScales);
    }, [activeBeatIndex, layerBeatScales, localBeatOverrides, scriptId]);

    const beatCount = director?.say.length ?? beatFontScales?.length ?? 0;

    const handleLocalFontChange = useCallback(
        (scales: CompareFontScales) => {
            setLocalBeatOverrides((current) => {
                const nextOverrides = {
                    ...current,
                    [activeBeatIndex]: scales,
                };
                const allBeatScales = resolveAllBeatFontScales(
                    scriptId,
                    beatCount,
                    beatFontScales,
                    sceneDefaults,
                    nextOverrides,
                );
                writeAllCompareBeatFontScalesToStorage(scriptId, allBeatScales);
                return nextOverrides;
            });
        },
        [activeBeatIndex, beatCount, beatFontScales, sceneDefaults, scriptId],
    );

    const resolveScopeForSave = useCallback(
        () =>
            resolveAllBeatFontScales(
                scriptId,
                beatCount,
                beatFontScales,
                sceneDefaults,
                localBeatOverrides,
            ),
        [beatCount, beatFontScales, localBeatOverrides, sceneDefaults, scriptId],
    );

    const saveBar =
        canEditFontScales && beatCount > 0 ? (
            <CompareFontScalesSaveBar
                scriptId={scriptId}
                beatCount={beatCount}
                resolveScope={resolveScopeForSave}
            />
        ) : null;

    const body = (
        <CompareBeatBody
            {...rest}
            scriptId={scriptId}
            scene={scene}
            activeBeatIndex={activeBeatIndex}
            fallbackScales={activeScales}
            director={director}
            durationSeconds={durationSeconds}
            beatFontScales={beatFontScales}
            editorFontScale={editorFontScale}
            leanEditorFontScale={leanEditorFontScale}
            renderFontScale={renderFontScale}
            beatRelativeSeconds={beatRelativeSeconds}
            screenRecordingLabel={screenRecordingLabel}
        />
    );

    const shell = (
        <div className={classes.shell}>
            {saveBar}
            {body}
        </div>
    );

    if (parentEditor || !canEditFontScales) {
        return shell;
    }

    return (
        <CompareFontScaleEditorProvider
            key={`beat-font-${activeBeatIndex}`}
            scales={activeScales}
            onChange={handleLocalFontChange}
        >
            {shell}
        </CompareFontScaleEditorProvider>
    );
}

function screenRecordingFromBeatLayers(
    scene: RenderScene,
    beatIndex: number,
): string | undefined {
    const layer = scene.beatMainLayers?.[beatIndex];
    if (layer?.type === 'beat-template' && layer.kind === 'compare-dual') {
        return cfgString(layer.config as Record<string, unknown>, 'screenRecording');
    }
    return scene.beatScreenRecordings?.[beatIndex];
}

/** Lean ↔ Turn content from scene compare layer — shared by compare-derived beat shells. */
export function CompareBeatContent({
    scriptId,
    scene,
    contentRevision,
}: BeatTemplateSceneProps): ReactNode {
    const compare = compareLayerFromScene(scene);
    if (!compare) {
        return <div style={{ padding: 24, opacity: 0.6 }}>No compare layer for compare-dual beat</div>;
    }

    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const activeBeatIndex = activeSayLineIndex(
        scene.director,
        scene.durationSeconds,
        frame,
        fps,
    );
    const screenRecordingLabel = screenRecordingFromBeatLayers(scene, activeBeatIndex);

    return (
        <CompareBeatSession
            scriptId={scriptId}
            scene={scene}
            leanTrack={compare.leanTrack}
            turnTrack={compare.turnTrack}
            leftLabel={compare.leftLabel}
            rightLabel={compare.rightLabel}
            editorFontScale={compare.editorFontScale}
            leanEditorFontScale={compare.leanEditorFontScale}
            renderFontScale={compare.renderFontScale}
            beatFontScales={compare.beatFontScales}
            director={scene.director}
            durationSeconds={scene.durationSeconds}
            hintLayoutsPath={compare.hintLayoutsPath}
            contentRevision={contentRevision}
            compiledTracks={compare.compiledTracks}
            focusBeats={compare.focusBeats}
            portraitBottomTargets={compare.portraitBottomTargets}
            beatVideos={compare.beatVideos}
            beatPlacements={compare.beatPlacements}
            beatStickers={compare.beatStickers}
            textbookOverlay={compare.textbookOverlay}
            screenRecordingLabel={screenRecordingLabel ?? null}
        />
    );
}

/** Lean ↔ Turn dual panel — default compare scene layout. */
export function CompareDualBeat(props: BeatTemplateSceneProps): ReactNode {
    const meta = beatTemplateStageMeta('compare-dual');
    const compact = useOutdoorLayout() === 'portrait';
    return (
        <BeatTemplateStage compact={compact} tone={meta.tone}>
            <CompareBeatContent {...props} />
        </BeatTemplateStage>
    );
}

export { compareScreenRecordingLabel };

export { CompareLandscape as CompareDualLandscapeLayout };
export type { LandscapeProps as CompareDualLandscapeLayoutProps };
export { ComparePortrait as CompareDualPortraitLayout };
export type { PortraitProps as CompareDualPortraitLayoutProps };
