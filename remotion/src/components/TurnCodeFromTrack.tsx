// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TurnCodeFromTrack.tsx
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { editorHighlightsForTrack } from '@turn-video-shared/ide/captionBeats';
import { activeBeatCodeSegment, resolveFocusedSourceDisplay } from '@turn-video-shared/ide/ideTrackTypes';
import { loadIdeTrack, type LoadedIdeTrack, type TrackLoadOptions } from '../lib/loadIdeTrack';
import { TurnTypingCode } from './TurnTypingCode';

type TurnCodeFromTrackProps = {
    scriptId: string;
    trackPath: string;
    fontSize?: number;
    minFontSize?: number;
    viewportHeight?: number;
    wrapLines?: boolean;
    trackLoad?: TrackLoadOptions;
};

export function TurnCodeFromTrack({
    scriptId,
    trackPath,
    fontSize,
    minFontSize,
    viewportHeight,
    wrapLines,
    trackLoad,
}: TurnCodeFromTrackProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const [loaded, setLoaded] = useState<LoadedIdeTrack | null>(null);
    const [trackReady, setTrackReady] = useState(false);
    const [handle] = useState(() => delayRender(`code-track:${scriptId}:${trackPath}`));
    const seconds = frame / fps;

    useEffect(() => {
        let cancelled = false;
        setTrackReady(false);

        void loadIdeTrack(scriptId, trackPath, trackLoad)
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
            return { text: '// loading track…', gutterLineNumbers: undefined };
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
        <TurnTypingCode
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
