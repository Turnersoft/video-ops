// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/CompareSceneContent.tsx
import { getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
    CompareFontScaleEditorProvider,
    useCompareFontScaleEditor,
} from '@turn-video-shared/ide/compareFontScaleEditorContext';
import {
    type CompareFontScales,
    readCompareBeatFontScalesFromStorage,
    writeAllCompareBeatFontScalesToStorage,
} from '@turn-video-shared/ide/compareFontScale';
import {
    COMPARE_PANEL_FONT_SCALE,
    compareBodyFontSize,
    compareBodyFontSizeMin,
} from '@turn-video-shared/ide/compareTypography';

import type { CompareFocusBeat } from '../video-kit/types';
import { activeSayLineIndex } from '../lib/sayTiming';
import { CompareBeatVideoPanel } from './CompareBeatVideoPanel';
import { CompareFontScalesSaveBar } from './CompareFontScalesSaveBar';
import { CompareHintCallouts } from './CompareHintCallouts';
import { CompareVideoFrame } from './CompareVideoFrame';
import { Lean4CodeFromTrack, Lean4GoalFromTrack } from './Lean4FromTrack';
import { TurnCodeFromTrack } from './TurnCodeFromTrack';
import { SidePanelFromTrack } from './SidePanelFromTrack';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';
import type { CompareCompiledTracks } from '../lib/compareTrackLoad';
import { trackLoadOptions, turnTrackLoadOptions } from '../lib/compareTrackLoad';
import type { CompareBeatVideo, DirectorScene } from '../lib/renderProps';

type CompareSceneContentProps = {
    scriptId: string;
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
    beatVideos?: Array<CompareBeatVideo | undefined>;
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

type CompareSceneBodyProps = CompareSceneContentProps & {
    activeBeatIndex: number;
    fallbackScales: CompareFontScales;
};

function CompareSceneBody({
    scriptId,
    leanTrack,
    turnTrack,
    leftLabel = 'Lean 4',
    rightLabel = 'Turn-Lang',
    fallbackScales,
    hintLayoutsPath,
    contentRevision,
    compiledTracks,
    focusBeats,
    activeBeatIndex,
    beatVideos,
}: CompareSceneBodyProps): ReactNode {
    const scales = fallbackScales;
    const activeBeatVideo = beatVideos?.[activeBeatIndex];
    const s = useCompositionScale();
    const t = TURN_VIDEO_THEME;
    const compareFont = compareBodyFontSize(s.codeFontSize);
    const editorFontMin = compareBodyFontSizeMin(s.codeFontSizeMin);
    const leanFont = Math.round(compareFont * scales.leanEditorFontScale);
    const turnFont = Math.round(compareFont * scales.editorFontScale);
    const comparePaneHeight = s.compareCodePaneHeight;
    const leanLoad = trackLoadOptions({ contentRevision, compiledTracks });
    const turnLoad = turnTrackLoadOptions({ contentRevision, compiledTracks });

    return (
        <div
            style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                height: '100%',
                width: '100%',
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {activeBeatVideo ? (
                <CompareBeatVideoPanel scriptId={scriptId} video={activeBeatVideo} />
            ) : (
                <CompareVideoFrame
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
            )}
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
        </div>
    );
}

export function CompareSceneContent({
    scriptId,
    editorFontScale = 1,
    leanEditorFontScale,
    renderFontScale = 1,
    beatFontScales,
    director,
    durationSeconds = 0,
    ...rest
}: CompareSceneContentProps): ReactNode {
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
        <CompareSceneBody
            {...rest}
            scriptId={scriptId}
            activeBeatIndex={activeBeatIndex}
            fallbackScales={activeScales}
            director={director}
            durationSeconds={durationSeconds}
            beatFontScales={beatFontScales}
            editorFontScale={editorFontScale}
            leanEditorFontScale={leanEditorFontScale}
            renderFontScale={renderFontScale}
        />
    );

    const shell = (
        <div
            style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                height: '100%',
                width: '100%',
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
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
