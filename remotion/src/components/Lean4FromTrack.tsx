// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/Lean4FromTrack.tsx
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import {
    activeGoalHighlights,
    editorHighlightsForTrack,
} from '@turn-video-shared/ide/captionBeats';
import {
    captionBeatNeedleLayers,
    highlightOverlaysFromLayers,
} from '@turn-video-shared/panels/highlightTransition';
import { Lean4GoalPanel } from '@turn-video-shared/panels/Lean4GoalPanel';
import {
    leanGoalRenderAvailableAtSeconds,
    type Lean4GoalExport,
    type Lean4Track,
} from '@turn-video-shared/ide/lean4TrackTypes';
import {
    activeBeatCodeSegment,
    resolveFocusedSourceDisplay,
} from '@turn-video-shared/ide/ideTrackTypes';

import { loadLean4Track, type LeanTrackLoadOptions, type LoadedLean4Track } from '../lib/loadLean4Track';
import { useCompositionScale } from '../lib/useCompositionScale';
import { compareBodyFontSize } from '@turn-video-shared/ide/compareTypography';
import { LeanTypingCode } from './LeanTypingCode';
import { staticPathForScriptAsset } from '../lib/scriptAssetPath';

type Lean4FromTrackProps = {
    scriptId: string;
    trackPath: string;
    fontSize?: number;
    minFontSize?: number;
    viewportHeight?: number;
    fontScale?: number;
    wrapLines?: boolean;
    /** Compare render pane — tighter shell, same body size as code editors. */
    compact?: boolean;
    trackLoad?: LeanTrackLoadOptions;
    inlineGoalExport?: Lean4GoalExport | null;
};

async function fetchGoalExport(
    scriptId: string,
    relativePath: string,
): Promise<Lean4GoalExport | null> {
    const response = await fetch(staticFile(staticPathForScriptAsset(scriptId, relativePath)));
    if (!response.ok) {
        return null;
    }
    return (await response.json()) as Lean4GoalExport;
}

/** Code panel only — for use inside Lean4VideoFrame main column. */
export function Lean4CodeFromTrack({
    scriptId,
    trackPath,
    fontSize,
    minFontSize,
    viewportHeight,
    wrapLines,
    trackLoad,
}: Lean4FromTrackProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const [loaded, setLoaded] = useState<LoadedLean4Track | null>(null);
    const [trackReady, setTrackReady] = useState(false);
    const [handle] = useState(() => delayRender(`lean4-code:${scriptId}:${trackPath}`));
    const seconds = frame / fps;

    useEffect(() => {
        let cancelled = false;
        setTrackReady(false);

        void loadLean4Track(scriptId, trackPath, trackLoad)
            .then((data) => {
                if (!cancelled) {
                    setLoaded(data);
                    setTrackReady(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTrackReady(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [scriptId, trackPath, trackLoad?.contentRevision, trackLoad?.inlineTrack]);

    useLayoutEffect(() => {
        if (trackReady) {
            continueRender(handle);
        }
    }, [handle, trackReady]);

    const beatCode = useMemo(
        () => activeBeatCodeSegment(loaded?.track ?? null, seconds),
        [loaded?.track, seconds],
    );

    const focused = useMemo(() => {
        if (!loaded) {
            return { text: '// loading Lean 4 track…', gutterLineNumbers: undefined };
        }
        if (beatCode) {
            return { text: beatCode.code, gutterLineNumbers: undefined };
        }
        return resolveFocusedSourceDisplay(
            loaded.fullSource,
            loaded.track,
            seconds,
            loaded.renderSource,
        );
    }, [loaded, beatCode, seconds]);

    const highlights = useMemo(() => {
        if (beatCode?.highlights?.length) {
            return beatCode.highlights.map((text) => ({ text }));
        }
        return editorHighlightsForTrack(loaded?.track ?? null, seconds, focused.text);
    }, [beatCode, loaded?.track, seconds, focused.text]);

    return (
        <LeanTypingCode
            renderSource={focused.text}
            typingSnippet={focused.text}
            charsPerSecond={loaded?.track.typing?.charsPerSecond ?? 28}
            fontSize={fontSize}
            minFontSize={minFontSize}
            viewportHeight={viewportHeight}
            wrapLines={wrapLines}
            highlights={highlights}
            staticHighlights={beatCode?.highlights}
            gutterLineNumbers={focused.gutterLineNumbers}
        />
    );
}

/** Goal panel only — for use inside Lean4VideoFrame side column. */
export function Lean4GoalFromTrack({
    scriptId,
    trackPath,
    fontScale = 1,
    compact = false,
    trackLoad,
    inlineGoalExport,
}: Pick<
    Lean4FromTrackProps,
    'scriptId' | 'trackPath' | 'fontScale' | 'compact' | 'trackLoad' | 'inlineGoalExport'
>) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();
    const [goalExport, setGoalExport] = useState<Lean4GoalExport | null>(null);
    const [track, setTrack] = useState<Lean4Track | null>(null);
    const [goalReady, setGoalReady] = useState(false);
    const [handle] = useState(() => delayRender(`lean4-goal:${scriptId}:${trackPath}`));

    useEffect(() => {
        let cancelled = false;
        setGoalReady(false);

        async function loadGoalData() {
            try {
                if (inlineGoalExport) {
                    setGoalExport(inlineGoalExport);
                }
                const loaded = await loadLean4Track(scriptId, trackPath, trackLoad);
                if (!loaded || cancelled) {
                    return;
                }
                setTrack(loaded.track);
                if (!inlineGoalExport) {
                    const goalPath = loaded.track.goalPanel?.exportPath;
                    if (goalPath) {
                        setGoalExport(await fetchGoalExport(scriptId, goalPath));
                    }
                }
            } catch {
                // Keep fallback when export is missing.
            } finally {
                if (!cancelled) {
                    setGoalReady(true);
                }
            }
        }

        void loadGoalData();

        return () => {
            cancelled = true;
        };
    }, [
        inlineGoalExport,
        scriptId,
        trackLoad?.contentRevision,
        trackLoad?.inlineTrack,
        trackPath,
    ]);

    useLayoutEffect(() => {
        if (goalReady) {
            continueRender(handle);
        }
    }, [goalReady, handle]);

    const goalHighlights = useMemo(
        () => activeGoalHighlights(track?.captionBeats ?? [], frame / fps),
        [track?.captionBeats, frame, fps],
    );

    const goalHighlightOverlays = useMemo(() => {
        const layers = captionBeatNeedleLayers(
            track?.captionBeats ?? [],
            frame / fps,
            fps,
            (beat) => beat.goal ?? [],
        );
        return highlightOverlaysFromLayers(layers, frame);
    }, [track?.captionBeats, frame, fps]);

    const proofSeconds = frame / fps;
    const renderAvailable = useMemo(
        () => leanGoalRenderAvailableAtSeconds(track, goalExport, proofSeconds),
        [track, goalExport, proofSeconds],
    );

    return (
        <Lean4GoalPanel
            exportData={goalExport}
            proofSeconds={proofSeconds}
            renderUnavailable={goalExport !== null && !renderAvailable}
            codeFontSize={
                compact
                    ? Math.round(compareBodyFontSize(s.codeFontSize) * fontScale)
                    : Math.round(s.codeFontSize * fontScale)
            }
            compact={compact}
            goalHighlights={goalHighlights}
            goalHighlightOverlays={goalHighlightOverlays}
        />
    );
}
