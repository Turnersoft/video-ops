import type { ReactNode } from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import {
    COMPARE_PANEL_FONT_SCALE,
    compareBodyFontSize,
    compareBodyFontSizeMin,
} from '../../lib/tracks/compareTypography';
import { SidePanelFromTrack } from '../../components/SidePanelFromTrack/SidePanelFromTrack';
import { TurnTypingCode } from '../../components/TurnTypingCode/TurnTypingCode';
import { TURN_LANG_LOGO_SRC } from '../../lib/layout/brandAssets';
import { TURN_VIDEO_THEME } from '../../lib/layout/turnVideoTheme';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { useOutdoorLayout } from '../../lib/outdoor/outdoorLayoutContext';
import { activeSayLineIndex } from '../../lib/outdoor/sayTiming';
import type { RenderScene } from '../../lib/types/renderProps';
import { BeatTemplateStage } from '../BeatTemplateStage';
import { cfgString } from '../configHelpers';
import type { BeatTemplateComponentProps } from '../types';
import {
    BeatFootageOverlays,
    BeatPortraitPresenterBand,
    showStudioFootagePlaceholders,
} from '../../components/BeatFootage/BeatFootage';
import { parseConfig, renderEnabled, typingCps } from './api';
import classes from './TurnFocusBeat.module.scss';

const PORTRAIT_OUTDOOR_FONT_SCALE = 3;
const PORTRAIT_TITLE_FONT_RATIO = 0.42;
const TURN_EDITOR_LOGO_HEIGHT = 169;
const TURN_RENDER_LOGO_HEIGHT = 169;
const TURN_ACCENT = '#c4a882';

type TurnFocusLayoutProps = {
    main: ReactNode;
    side: ReactNode;
    showRender?: boolean;
};

function TurnFocusBrandHeader() {
    return (
        <div className={classes.landscapeHeader}>
            <Img
                src={staticFile(TURN_LANG_LOGO_SRC)}
                alt="Turn-Lang"
                className={classes.landscapeLogo}
            />
            <h1 className={classes.landscapeBrand}>Turn-Lang</h1>
        </div>
    );
}

function TurnFocusPortraitPane({
    label,
    accent,
    logoHeight = TURN_EDITOR_LOGO_HEIGHT,
    flexGrow = 1,
    children,
}: {
    label: string;
    accent: string;
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
                    src={staticFile(TURN_LANG_LOGO_SRC)}
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

function PaneEntrance({
    children,
    delayFrames,
}: {
    children: ReactNode;
    delayFrames: number;
}) {
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const entrance = interpolate(Math.max(0, frame - delayFrames), [0, 18], [0, 1], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const y = interpolate(entrance, [0, 1], [s.px(18), 0]);
    const opacity = interpolate(entrance, [0, 0.3, 1], [0, 1, 1]);

    return (
        <div style={{ height: '100%', translate: `0 ${y}px`, opacity }}>{children}</div>
    );
}

function TurnFocusLandscape({ main, side, showRender = true }: TurnFocusLayoutProps) {
    const s = useCompositionScale();

    return (
        <div className={classes.landscapeRoot} style={scaleCss(s.scale)}>
            <TurnFocusBrandHeader />
            <div
                className={`${classes.landscapePanels} ${showRender ? classes.landscapePanelsDual : classes.landscapePanelsSingle}`}
            >
                <PaneEntrance delayFrames={2}>
                    <div
                        className={`${classes.landscapePane} ${showRender ? '' : classes.landscapePaneSingle}`}
                    >
                        <div className={classes.landscapePaneLabel}>Turn-Lang source</div>
                        <div className={`${classes.landscapePaneBody} ${classes.landscapeEditorBody}`}>
                            {main}
                        </div>
                    </div>
                </PaneEntrance>
                {showRender ? (
                    <PaneEntrance delayFrames={8}>
                        <div className={classes.landscapePane}>
                            <div className={classes.landscapePaneLabel}>Rendered knowledge</div>
                            <div className={`${classes.landscapePaneBody} ${classes.landscapeRenderBody}`}>
                                {side}
                            </div>
                        </div>
                    </PaneEntrance>
                ) : null}
            </div>
        </div>
    );
}

function TurnFocusPortrait({
    scene,
    main,
    side,
    showRender = true,
}: TurnFocusLayoutProps & { scene: RenderScene }) {
    const showPresenterBand = showStudioFootagePlaceholders(scene);
    const editorFlex = showRender ? 1.15 : 1;

    return (
        <div className={classes.portraitCompareRoot}>
            {showPresenterBand ? <BeatPortraitPresenterBand /> : null}
            <TurnFocusPortraitPane
                label="Turn-Lang Editor"
                accent={TURN_ACCENT}
                logoHeight={TURN_EDITOR_LOGO_HEIGHT}
                flexGrow={editorFlex}
            >
                {main}
            </TurnFocusPortraitPane>
            {showRender ? (
                <TurnFocusPortraitPane
                    label="Turn-Lang Render"
                    accent={TURN_ACCENT}
                    logoHeight={TURN_RENDER_LOGO_HEIGHT}
                    flexGrow={1}
                >
                    {side}
                </TurnFocusPortraitPane>
            ) : null}
        </div>
    );
}

/** Turn focus slide — dark editor with optional knowledge render pane. */
export function TurnFocusBeat({
    scriptId,
    scene,
    config,
    turnSource = '',
}: BeatTemplateComponentProps): ReactNode {
    const s = useCompositionScale();
    const outdoorFormat = useOutdoorLayout() ?? 'landscape';
    const isPortrait = outdoorFormat === 'portrait';
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const parsed = parseConfig(config);
    const charsPerSecond = typingCps(parsed);
    const showRenderPane = renderEnabled(parsed);
    const editorFontScale = parsed.editorFontScale ?? 1;
    const compareFont = compareBodyFontSize(s.codeFontSize);
    const portraitFontBoost = isPortrait ? PORTRAIT_OUTDOOR_FONT_SCALE : 1;
    const editorFontMax = isPortrait
        ? Math.round(compareFont * editorFontScale * portraitFontBoost)
        : Math.round(s.codeFontSize * editorFontScale);
    const editorFontMin = isPortrait
        ? Math.max(6, compareBodyFontSizeMin(s.codeFontSizeMin))
        : Math.round(s.codeFontSizeMin * editorFontScale);
    const activeBeatIndex = activeSayLineIndex(
        scene.director,
        scene.durationSeconds,
        frame,
        fps,
    );
    const screenRecordingLabel =
        cfgString(config, 'screenRecording') ??
        scene.beatScreenRecordings?.[activeBeatIndex] ??
        null;

    const editor = (
        <TurnTypingCode
            source={turnSource}
            charsPerSecond={charsPerSecond}
            appearance={isPortrait ? 'light' : 'dark'}
            fontSize={editorFontMax}
            minFontSize={editorFontMin}
            viewportHeight={isPortrait ? undefined : s.codeViewportHeight}
            wrapLines={false}
        />
    );

    const renderFontScale = isPortrait
        ? COMPARE_PANEL_FONT_SCALE * editorFontScale * portraitFontBoost
        : editorFontScale;

    const render = (
        <SidePanelFromTrack
            scriptId={scriptId}
            trackPath={`tracks/scene-${scene.index}-ide.json`}
            fontScale={renderFontScale}
            compact={isPortrait}
        />
    );

    const layoutProps = {
        showRender: showRenderPane,
        main: editor,
        side: render,
    };

    return (
        <div className={classes.shell}>
            {isPortrait ? (
                <BeatTemplateStage tone="compare" compact>
                    <TurnFocusPortrait scene={scene} {...layoutProps} />
                </BeatTemplateStage>
            ) : (
                <TurnFocusLandscape {...layoutProps} />
            )}
            <BeatFootageOverlays
                scriptId={scriptId}
                scene={scene}
                activeBeatIndex={activeBeatIndex}
                format={outdoorFormat}
                screenRecordingLabel={screenRecordingLabel}
            />
        </div>
    );
}

export { TurnFocusLandscape as TurnFocusSlideFrame };
