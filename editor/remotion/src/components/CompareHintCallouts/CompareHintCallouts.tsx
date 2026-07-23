// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/CompareHintCallouts.tsx
import {
    continueRender,
    delayRender,
    getRemotionEnvironment,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import classes from './CompareHintCallouts.module.scss';

import {
    activeCaptionBeatAt,
    activeCompareHintInstances,
    type CompareHintInstance,
} from '../../lib/tracks/captionBeats';
import {
    compareHintFallbackLayout,
    compareHintKey,
    compareHintStorageKey,
    computeCompareHintArrows,
    defaultHintPanelLayout,
    dispatchHintLayoutsChanged,
    hintLayoutWithHighlightAnchor,
    lookupHintLayout,
    mergeHintLayoutRecords,
    persistHintLayoutsToFile,
    readHintLayoutsFromStorage,
    resolveAnchoredHintLayout,
    type CompareHintLayout,
    writeHintLayoutToStorage,
} from '../../lib/tracks/compareHintLayout';
import type { Lean4Track } from '../../lib/tracks/lean4TrackTypes';
import type { IdeTrack } from '../../lib/tracks/ideTrackTypes';

import { loadIdeTrack } from '../../lib/tracks/loadIdeTrack';
import { loadLean4Track } from '../../lib/tracks/loadLean4Track';
import { bundledHintLayoutsForScript, loadHintLayoutsFile } from '../../lib/tracks/loadHintLayouts';
import type { CompareCompiledTracks } from '../../lib/tracks/compareTrackLoad';
import { trackLoadOptions, turnTrackLoadOptions } from '../../lib/tracks/compareTrackLoad';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { useOutdoorHintPanel } from '../../lib/outdoor/outdoorLayoutContext';

const HINT_LAYOUTS_FILE = 'tracks/scene-compare-hint-layouts.json';

type CompareHintCalloutsProps = {
    scriptId: string;
    leanTrackPath: string;
    turnTrackPath: string;
    hintLayoutsPath?: string;
    contentRevision?: number;
    compiledTracks?: CompareCompiledTracks;
};

function resolveHintLayout(
    hint: CompareHintInstance,
    key: string,
    effectiveLayouts: Record<string, CompareHintLayout>,
    container: HTMLElement | null,
    skipDomDefault: boolean,
): CompareHintLayout {
    const saved =
        lookupHintLayout(hint.compareBeatIndex, hint.beatAtSeconds, hint, effectiveLayouts) ??
        effectiveLayouts[key];
    if (saved) {
        if (
            container &&
            saved.highlightAnchorX !== undefined &&
            saved.highlightAnchorY !== undefined
        ) {
            return resolveAnchoredHintLayout(container, hint.target, hint.needle, saved);
        }
        return saved;
    }
    if (hint.layout) {
        return hint.layout;
    }
    if (!skipDomDefault && container) {
        return defaultHintPanelLayout(container, hint.target, hint.needle);
    }
    return compareHintFallbackLayout(hint.target);
}

function DraggableHintPanel({
    hint,
    hintKey,
    layout,
    enter,
    index,
    canDrag,
    onLayoutChange,
    onLayoutCommit,
}: {
    hint: CompareHintInstance;
    hintKey: string;
    layout: CompareHintLayout;
    enter: number;
    index: number;
    canDrag: boolean;
    onLayoutChange: (key: string, layout: CompareHintLayout, hint: CompareHintInstance) => void;
    onLayoutCommit: (key: string, hint: CompareHintInstance) => void;
}) {
    const s = useCompositionScale();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragOrigin = useRef<{ x: number; y: number; layout: CompareHintLayout } | null>(null);
    const [dragLayout, setDragLayout] = useState<CompareHintLayout | null>(null);
    const shownLayout = dragLayout ?? layout;
    const offsetY = (1 - enter) * s.px(8);

    const onPointerDown = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (!canDrag) {
                return;
            }
            event.stopPropagation();
            dragOrigin.current = {
                x: event.clientX,
                y: event.clientY,
                layout: shownLayout,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [canDrag, shownLayout],
    );

    const onPointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (!dragOrigin.current || !containerRef.current?.parentElement) {
                return;
            }
            const parent = containerRef.current.parentElement;
            const rect = parent.getBoundingClientRect();
            const dx = event.clientX - dragOrigin.current.x;
            const dy = event.clientY - dragOrigin.current.y;
            const nextLayout = {
                xPct: Math.max(
                    2,
                    Math.min(
                        98,
                        dragOrigin.current.layout.xPct + (dx / Math.max(rect.width, 1)) * 100,
                    ),
                ),
                yPct: Math.max(
                    4,
                    Math.min(
                        96,
                        dragOrigin.current.layout.yPct + (dy / Math.max(rect.height, 1)) * 100,
                    ),
                ),
            };
            setDragLayout(nextLayout);
            onLayoutChange(hintKey, nextLayout, hint);
        },
        [hint, hintKey, onLayoutChange],
    );

    const onPointerUp = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (!dragOrigin.current) {
                return;
            }
            dragOrigin.current = null;
            setDragLayout(null);
            event.currentTarget.releasePointerCapture(event.pointerId);
            onLayoutCommit(hintKey, hint);
        },
        [hint, hintKey, onLayoutCommit],
    );

    return (
        <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`${classes.hintPanel} ${canDrag ? classes.hintPanelDraggable : classes.hintPanelReadonly}`}
            style={{
                ...scaleCss(s.scale),
                left: `${shownLayout.xPct}%`,
                top: `${shownLayout.yPct}%`,
                transform: `translate(-50%, calc(-100% + ${offsetY}px)) scale(${0.94 + enter * 0.06})`,
                opacity: enter,
                zIndex: 30 + index,
            }}
        >
            <div className={classes.hintBubble}>{hint.text}</div>
        </div>
    );
}

/** Hover-style hint boxes with arrows to highlighted snippets; draggable in preview. */
export function CompareHintCallouts({
    scriptId,
    leanTrackPath,
    turnTrackPath,
    hintLayoutsPath = HINT_LAYOUTS_FILE,
    contentRevision,
    compiledTracks,
}: CompareHintCalloutsProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const seconds = frame / fps;
    const s = useCompositionScale();
    const overlayRef = useRef<HTMLDivElement>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncedStorageToFileRef = useRef(false);
    const [leanTrack, setLeanTrack] = useState<Lean4Track | null>(null);
    const [turnTrack, setTurnTrack] = useState<IdeTrack | null>(null);
    const [fileLayouts, setFileLayouts] = useState<Record<string, CompareHintLayout>>(() =>
        bundledHintLayoutsForScript(scriptId, hintLayoutsPath),
    );
    const [localLayouts, setLocalLayouts] = useState<Record<string, CompareHintLayout>>({});
    const localLayoutsRef = useRef(localLayouts);
    localLayoutsRef.current = localLayouts;
    const [handle] = useState(() => delayRender(`compare-hints:${scriptId}:${hintLayoutsPath}`));
    const [layoutEpoch, setLayoutEpoch] = useState(0);
    const layoutStorageScope = `${scriptId}:${hintLayoutsPath}`;

    const remotionEnv = getRemotionEnvironment();
    const canDrag = remotionEnv.isStudio || remotionEnv.isPlayer;
    const isRendering = remotionEnv.isRendering;
    const outdoorHintPanel = useOutdoorHintPanel();

    const flushPersistToFile = useCallback(
        (layouts: Record<string, CompareHintLayout>) => {
            if (Object.keys(layouts).length === 0) {
                return;
            }
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
                persistTimerRef.current = null;
            }
            void persistHintLayoutsToFile(scriptId, hintLayoutsPath, layouts).then((merged) => {
                if (merged) {
                    setFileLayouts(merged);
                    dispatchHintLayoutsChanged(layoutStorageScope, merged);
                }
            });
        },
        [hintLayoutsPath, layoutStorageScope, scriptId],
    );

    const schedulePersistToFile = useCallback(
        (layouts: Record<string, CompareHintLayout>) => {
            if (Object.keys(layouts).length === 0) {
                return;
            }
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
            persistTimerRef.current = setTimeout(() => {
                flushPersistToFile(layouts);
            }, 300);
        },
        [flushPersistToFile],
    );

    useEffect(() => {
        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setLocalLayouts(readHintLayoutsFromStorage(layoutStorageScope));
    }, [layoutStorageScope]);

    useEffect(() => {
        const reloadFromStorage = () => {
            setLocalLayouts(readHintLayoutsFromStorage(layoutStorageScope));
        };
        const onCustom = (event: Event) => {
            const detail = (event as CustomEvent<{ scope?: string; layouts?: Record<string, CompareHintLayout> }>)
                .detail;
            if (detail?.scope && detail.scope !== layoutStorageScope) {
                return;
            }
            if (detail?.layouts) {
                setFileLayouts(detail.layouts);
                setLocalLayouts(
                    mergeHintLayoutRecords(
                        detail.layouts,
                        readHintLayoutsFromStorage(layoutStorageScope),
                    ),
                );
                return;
            }
            reloadFromStorage();
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === null || event.key === compareHintStorageKey(layoutStorageScope)) {
                reloadFromStorage();
            }
        };
        window.addEventListener('video-ops-hint-layouts-changed', onCustom);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('video-ops-hint-layouts-changed', onCustom);
            window.removeEventListener('storage', onStorage);
        };
    }, [layoutStorageScope]);

    useEffect(() => {
        if (syncedStorageToFileRef.current) {
            return;
        }
        const fromStorage = readHintLayoutsFromStorage(layoutStorageScope);
        if (Object.keys(fromStorage).length === 0) {
            syncedStorageToFileRef.current = true;
            return;
        }
        const needsSync = Object.entries(fromStorage).some(([key, layout]) => {
            const saved = fileLayouts[key];
            return (
                !saved ||
                Math.abs(saved.xPct - layout.xPct) > 0.05 ||
                Math.abs(saved.yPct - layout.yPct) > 0.05
            );
        });
        if (!needsSync) {
            syncedStorageToFileRef.current = true;
            return;
        }
        syncedStorageToFileRef.current = true;
        void persistHintLayoutsToFile(
            scriptId,
            hintLayoutsPath,
            mergeHintLayoutRecords(fileLayouts, fromStorage),
        ).then((merged) => {
            if (merged) {
                setFileLayouts(merged);
                return;
            }
            syncedStorageToFileRef.current = false;
        });
    }, [fileLayouts, hintLayoutsPath, layoutStorageScope, scriptId]);

    useEffect(() => {
        const flushOnExit = () => {
            const layouts = mergeHintLayoutRecords(
                fileLayouts,
                readHintLayoutsFromStorage(layoutStorageScope),
            );
            if (Object.keys(layouts).length === 0) {
                return;
            }
            flushPersistToFile(layouts);
        };
        window.addEventListener('pagehide', flushOnExit);
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                flushOnExit();
            }
        });
        return () => {
            window.removeEventListener('pagehide', flushOnExit);
        };
    }, [fileLayouts, flushPersistToFile, layoutStorageScope]);

    useEffect(() => {
        let cancelled = false;
        const leanLoad = trackLoadOptions({ contentRevision, compiledTracks });
        const turnLoad = turnTrackLoadOptions({ contentRevision, compiledTracks });

        // Markdown compare scripts ship layouts inside compiledTracks / the Remotion
        // bundle. Disk tracks/ is optional legacy cache — never required for render.
        const applyDiskLayouts = (layoutsFromDisk: Record<string, CompareHintLayout>) => {
            if (cancelled) {
                return;
            }
            setFileLayouts((previous) =>
                mergeHintLayoutRecords(
                    mergeHintLayoutRecords(compiledTracks?.hintLayouts.layouts ?? {}, previous),
                    layoutsFromDisk,
                ),
            );
        };

        if (compiledTracks) {
            setLeanTrack(compiledTracks.leanTrack);
            setTurnTrack(compiledTracks.turnTrack);
            setFileLayouts((previous) =>
                mergeHintLayoutRecords(compiledTracks.hintLayouts.layouts ?? {}, previous),
            );
            if (isRendering) {
                continueRender(handle);
                return () => {
                    cancelled = true;
                };
            }
            loadHintLayoutsFile(scriptId, hintLayoutsPath)
                .then(applyDiskLayouts)
                .finally(() => {
                    if (!cancelled) {
                        continueRender(handle);
                    }
                });
            return () => {
                cancelled = true;
            };
        }

        void Promise.all([
            loadLean4Track(scriptId, leanTrackPath, leanLoad),
            loadIdeTrack(scriptId, turnTrackPath, turnLoad),
            loadHintLayoutsFile(scriptId, hintLayoutsPath),
        ])
            .then(([leanLoaded, turnLoaded, layoutsFromDisk]) => {
                if (cancelled) {
                    return;
                }
                if (leanLoaded) {
                    setLeanTrack(leanLoaded.track);
                }
                if (turnLoaded) {
                    setTurnTrack(turnLoaded.track);
                }
                applyDiskLayouts(layoutsFromDisk);
            })
            .finally(() => {
                if (!cancelled) {
                    continueRender(handle);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        compiledTracks,
        contentRevision,
        handle,
        hintLayoutsPath,
        isRendering,
        leanTrackPath,
        scriptId,
        turnTrackPath,
    ]);

    const leanBeats = leanTrack?.captionBeats ?? [];
    const turnBeats = turnTrack?.captionBeats ?? [];

    const hintInstances = useMemo(
        () => activeCompareHintInstances(leanBeats, turnBeats, seconds),
        [leanBeats, seconds, turnBeats],
    );

    const beatAtSeconds = useMemo(() => {
        const leanBeat = activeCaptionBeatAt(leanBeats, seconds);
        const turnBeat = activeCaptionBeatAt(turnBeats, seconds);
        return Math.max(leanBeat?.atSeconds ?? 0, turnBeat?.atSeconds ?? 0);
    }, [leanBeats, seconds, turnBeats]);

    const beatEnter = spring({
        frame: Math.max(0, frame - Math.round(beatAtSeconds * fps)),
        fps,
        config: { damping: 22, stiffness: 160 },
    });

    const effectiveLayouts = useMemo(
        () => mergeHintLayoutRecords(fileLayouts, localLayouts),
        [fileLayouts, localLayouts],
    );

    useLayoutEffect(() => {
        if (isRendering || !hintInstances.length) {
            return;
        }
        const id = requestAnimationFrame(() => {
            setLayoutEpoch((value) => value + 1);
        });
        return () => {
            cancelAnimationFrame(id);
        };
    }, [frame, hintInstances, isRendering, contentRevision]);

    const layoutByKey = useMemo(() => {
        const container = overlayRef.current;
        const map: Record<string, CompareHintLayout> = {};
        for (const hint of hintInstances) {
            const key = compareHintKey(hint.compareBeatIndex, hint);
            let layout = resolveHintLayout(hint, key, effectiveLayouts, container, isRendering);
            if (outdoorHintPanel && isRendering) {
                layout = {
                    ...layout,
                    xPct: outdoorHintPanel.x * 100,
                    yPct: outdoorHintPanel.y * 100,
                    highlightAnchorX: undefined,
                    highlightAnchorY: undefined,
                };
            }
            map[key] = layout;
        }
        return map;
    }, [effectiveLayouts, hintInstances, isRendering, layoutEpoch, outdoorHintPanel]);

    const arrows = useMemo(() => {
        const container = overlayRef.current;
        if (!container || hintInstances.length === 0) {
            return [];
        }
        return computeCompareHintArrows(
            container,
            hintInstances.map((hint) => {
                const key = compareHintKey(hint.compareBeatIndex, hint);
                return {
                    key,
                    target: hint.target,
                    needle: hint.needle,
                    text: hint.text,
                    layout: layoutByKey[key] ?? compareHintFallbackLayout(hint.target),
                };
            }),
            s.scale,
        );
    }, [hintInstances, layoutByKey, layoutEpoch, s.scale]);

    const onLayoutCommit = useCallback(
        (key: string, hint: CompareHintInstance) => {
            const container = overlayRef.current;
            let nextLocal = { ...localLayoutsRef.current };
            const layout = nextLocal[key];
            if (layout && container) {
                const anchored = hintLayoutWithHighlightAnchor(
                    container,
                    hint.target,
                    hint.needle,
                    layout,
                );
                nextLocal = { ...nextLocal, [key]: anchored };
                localLayoutsRef.current = nextLocal;
                setLocalLayouts(nextLocal);
                writeHintLayoutToStorage(layoutStorageScope, key, anchored);
            }
            flushPersistToFile(mergeHintLayoutRecords(fileLayouts, nextLocal));
        },
        [fileLayouts, flushPersistToFile, layoutStorageScope],
    );

    const onLayoutChange = useCallback(
        (key: string, layout: CompareHintLayout, _hint: CompareHintInstance) => {
            setLocalLayouts((previous) => {
                const nextLayouts = { ...previous, [key]: layout };
                localLayoutsRef.current = nextLayouts;
                writeHintLayoutToStorage(layoutStorageScope, key, layout);
                schedulePersistToFile(mergeHintLayoutRecords(fileLayouts, nextLayouts));
                return nextLayouts;
            });
        },
        [fileLayouts, layoutStorageScope, schedulePersistToFile],
    );

    if (!hintInstances.length) {
        return null;
    }

    return (
        <div ref={overlayRef} className={classes.overlay}>
            <svg className={classes.arrowSvg}>
                <defs>
                    <marker
                        id="compare-hint-arrow"
                        markerWidth={8}
                        markerHeight={8}
                        refX={7}
                        refY={4}
                        orient="auto"
                    >
                        <path d="M0,0 L8,4 L0,8 Z" fill="#B66D48" />
                    </marker>
                </defs>
                {arrows.map((arrow) => (
                    <line
                        key={arrow.key}
                        x1={arrow.x1}
                        y1={arrow.y1}
                        x2={arrow.x2}
                        y2={arrow.y2}
                        stroke="#B66D48"
                        strokeWidth={s.px(2.5)}
                        strokeLinecap="round"
                        markerEnd="url(#compare-hint-arrow)"
                        opacity={0.92 * beatEnter}
                    />
                ))}
            </svg>

            {hintInstances.map((hint, index) => {
                const key = compareHintKey(hint.compareBeatIndex, hint);
                const layout = layoutByKey[key] ?? compareHintFallbackLayout(hint.target);
                return (
                    <DraggableHintPanel
                        key={key}
                        hint={hint}
                        hintKey={key}
                        layout={layout}
                        enter={beatEnter}
                        index={index}
                        canDrag={canDrag}
                        onLayoutChange={onLayoutChange}
                        onLayoutCommit={onLayoutCommit}
                    />
                );
            })}
        </div>
    );
}
