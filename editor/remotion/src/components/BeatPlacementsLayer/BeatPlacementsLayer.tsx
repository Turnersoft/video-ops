import { AbsoluteFill, Img, interpolate, staticFile, useVideoConfig, getRemotionEnvironment } from 'remotion';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';

import type { VideoOpsBeatPlacement } from '../../lib/placements/beatPlacements';
import { staticPathForScriptAsset } from '../../lib/assets/scriptAssetPath';
import { ScriptAssetVideo } from '../ScriptAssetVideo/ScriptAssetVideo';
import { MathBoard } from '../MathBoard/MathBoard';
import type { MathBoardDiagramId } from '../../lib/panels/mathBoardDiagramTypes';
import {
    effectivePlacementRect,
    placementLayoutStorageKey,
    readPlacementDragOffset,
    writePlacementDragOffset,
    type PlacementDragOffset,
} from './placementLayout';
import classes from './BeatPlacementsLayer.module.scss';

type BeatPlacementsLayerProps = {
    scriptId: string;
    sceneIndex: number;
    beatIndex: number;
    placements: VideoOpsBeatPlacement[];
    beatRelativeSeconds: number;
    beatDurationSeconds?: number;
};

function placementVisible(placement: VideoOpsBeatPlacement, beatRelativeSeconds: number): boolean {
    return (
        beatRelativeSeconds >= placement.atSeconds &&
        beatRelativeSeconds < placement.atSeconds + placement.durationSeconds
    );
}

function enterOpacity(
    placement: VideoOpsBeatPlacement,
    beatRelativeSeconds: number,
    fps: number,
): number {
    const localFrame = (beatRelativeSeconds - placement.atSeconds) * fps;
    const remaining = (placement.atSeconds + placement.durationSeconds - beatRelativeSeconds) * fps;
    const enterKind = placement.enter ?? 'fade';
    const fadeIn =
        enterKind === 'none'
            ? 1
            : interpolate(localFrame, [0, 10], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
              });
    const fadeOut = interpolate(remaining, [0, 12], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return fadeIn * fadeOut;
}

function enterScale(placement: VideoOpsBeatPlacement, beatRelativeSeconds: number, fps: number): number {
    const localFrame = (beatRelativeSeconds - placement.atSeconds) * fps;
    if (placement.enter === 'scale') {
        return interpolate(localFrame, [0, 12], [0.92, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
    }
    return 1;
}

function PlacementItem({
    scriptId,
    placement,
    beatRelativeSeconds,
    beatDurationSeconds,
    canDrag,
    dragOffset,
    onDragCommit,
}: {
    scriptId: string;
    placement: VideoOpsBeatPlacement;
    beatRelativeSeconds: number;
    beatDurationSeconds?: number;
    canDrag: boolean;
    dragOffset: PlacementDragOffset | null;
    onDragCommit: (offset: PlacementDragOffset) => void;
}) {
    const { fps } = useVideoConfig();
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const dragOrigin = useRef<{ px: number; py: number; offset: PlacementDragOffset } | null>(null);
    const [liveOffset, setLiveOffset] = useState<PlacementDragOffset | null>(null);
    const shownOffset = liveOffset ?? dragOffset;
    const rect = effectivePlacementRect(placement, shownOffset);
    const opacity = enterOpacity(placement, beatRelativeSeconds, fps);
    const scale = enterScale(placement, beatRelativeSeconds, fps);
    const maskClass =
        placement.mask?.shape === 'circle'
            ? classes.maskCircle
            : placement.mask?.shape === 'rectangle'
              ? classes.maskRect
              : undefined;

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!canDrag) {
                return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            dragOrigin.current = {
                px: event.clientX,
                py: event.clientY,
                offset: shownOffset ?? { dx: 0, dy: 0 },
            };
        },
        [canDrag, shownOffset],
    );

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!canDrag || !dragOrigin.current || !nodeRef.current?.offsetParent) {
                return;
            }
            const parent = nodeRef.current.offsetParent as HTMLElement;
            const dxPx = event.clientX - dragOrigin.current.px;
            const dyPx = event.clientY - dragOrigin.current.py;
            setLiveOffset({
                dx: dragOrigin.current.offset.dx + dxPx / parent.clientWidth,
                dy: dragOrigin.current.offset.dy + dyPx / parent.clientHeight,
            });
        },
        [canDrag],
    );

    const onPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!canDrag || !dragOrigin.current) {
                return;
            }
            event.currentTarget.releasePointerCapture(event.pointerId);
            const next = liveOffset ?? dragOrigin.current.offset;
            dragOrigin.current = null;
            setLiveOffset(null);
            onDragCommit(next);
        },
        [canDrag, liveOffset, onDragCommit],
    );

    const body = (() => {
        if ((placement.kind === 'video' || placement.kind === 'manim') && placement.src) {
            return (
                <ScriptAssetVideo
                    scriptId={scriptId}
                    src={placement.src}
                    objectFit={placement.objectFit ?? 'contain'}
                />
            );
        }
        if (placement.kind === 'manim' && placement.diagramId) {
            return (
                <MathBoard
                    scriptId={scriptId}
                    layer={{
                        type: 'math-board',
                        heading: placement.label ?? placement.diagramId,
                        beats: [
                            {
                                label: placement.label ?? placement.diagramId,
                                diagram: placement.diagramId as MathBoardDiagramId,
                            },
                        ],
                    }}
                    durationSeconds={placement.durationSeconds}
                />
            );
        }
        if (placement.src) {
            return (
                <Img
                    src={staticFile(staticPathForScriptAsset(scriptId, placement.src))}
                    className={classes.image}
                />
            );
        }
        return (
            <>
                {placement.emoji ? <span className={classes.emoji}>{placement.emoji}</span> : null}
                {placement.text?.trim() ? <span className={classes.text}>{placement.text}</span> : null}
            </>
        );
    })();

    return (
        <div
            ref={nodeRef}
            className={[classes.item, maskClass, canDrag ? classes.draggable : ''].filter(Boolean).join(' ')}
            style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                opacity,
                transform: `scale(${scale})`,
                zIndex: placement.zIndex ?? 10,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            {body}
        </div>
    );
}

/** Timed, positioned front-layer objects over base footage (video editor model). */
export function BeatPlacementsLayer({
    scriptId,
    sceneIndex,
    beatIndex,
    placements,
    beatRelativeSeconds,
    beatDurationSeconds,
}: BeatPlacementsLayerProps) {
    const remotionEnv = getRemotionEnvironment();
    const canDrag = !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);
    const visiblePlacements = useMemo(
        () => placements.filter((placement) => placementVisible(placement, beatRelativeSeconds)),
        [beatRelativeSeconds, placements],
    );
    const [dragOffsets, setDragOffsets] = useState<Record<string, PlacementDragOffset>>({});

    useEffect(() => {
        const next: Record<string, PlacementDragOffset> = {};
        for (const placement of placements) {
            const key = placementLayoutStorageKey(scriptId, sceneIndex, beatIndex, placement.id);
            const stored = readPlacementDragOffset(key);
            if (stored) {
                next[placement.id] = stored;
            }
        }
        setDragOffsets(next);
    }, [beatIndex, placements, sceneIndex, scriptId]);

    if (visiblePlacements.length === 0) {
        return null;
    }

    return (
        <AbsoluteFill className={classes.root}>
            {visiblePlacements.map((placement) => (
                <PlacementItem
                    key={placement.id}
                    scriptId={scriptId}
                    placement={placement}
                    beatRelativeSeconds={beatRelativeSeconds}
                    beatDurationSeconds={beatDurationSeconds}
                    canDrag={canDrag}
                    dragOffset={dragOffsets[placement.id] ?? null}
                    onDragCommit={(offset) => {
                        const key = placementLayoutStorageKey(
                            scriptId,
                            sceneIndex,
                            beatIndex,
                            placement.id,
                        );
                        writePlacementDragOffset(key, offset);
                        setDragOffsets((current) => ({ ...current, [placement.id]: offset }));
                    }}
                />
            ))}
        </AbsoluteFill>
    );
}
