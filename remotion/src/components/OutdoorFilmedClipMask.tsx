// Filmed take: two editable nets on the composition (photo-crop style).
// 1) Mask net = visible window  2) Video net = underlying original/cut clip rectangle
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { getRemotionEnvironment } from 'remotion';

import { persistOutdoorPipMask } from '@turn-video-shared/ide/persistOutdoorPipMask';
import { useCompositionScale } from '../lib/useCompositionScale';
import type { OutdoorPipMask } from '../lib/renderProps';
import { OutdoorSceneVideo } from './OutdoorSceneVideo';

export type OutdoorFilmedClipMaskProps = {
    scriptId: string;
    /** Cut clip for picture. Voice is SceneComposer <Audio> — keep this muted. */
    src: string;
    pipMask?: OutdoorPipMask;
    beatIndex?: number;
};

type NetKind = 'mask' | 'video' | 'clip';
type DragMode =
    | 'move'
    | 'resize-se'
    | 'resize-sw'
    | 'resize-ne'
    | 'resize-nw';

type Rect01 = { x: number; y: number; w: number; h: number };

const DEFAULT_MASK: OutdoorPipMask = {
    shape: 'rectangle',
    x: 0.02,
    y: 0.55,
    w: 0.28,
    h: 0.38,
    videoX: 0.02,
    videoY: 0.55,
    videoW: 0.28,
    videoH: 0.38,
    objectPositionX: 0.5,
    objectPositionY: 0.5,
    scale: 1,
};

function clamp01(value: number, min = 0, max = 1): number {
    return Math.min(max, Math.max(min, value));
}

/** Resolve video net; migrate legacy scale/objectPosition into a rectangle. */
export function resolveVideoNet(mask: OutdoorPipMask): Rect01 {
    if (
        Number.isFinite(mask.videoW) &&
        Number.isFinite(mask.videoH) &&
        mask.videoW! > 0 &&
        mask.videoH! > 0
    ) {
        return {
            x: clamp01(mask.videoX ?? mask.x),
            y: clamp01(mask.videoY ?? mask.y),
            w: clamp01(mask.videoW!, 0.05, 1),
            h: clamp01(mask.videoH!, 0.05, 1),
        };
    }
    const scale = Math.max(0.5, mask.scale ?? 1);
    const w = clamp01(mask.w * scale, 0.05, 1);
    const h = clamp01(mask.h * scale, 0.05, 1);
    const ox = mask.objectPositionX ?? 0.5;
    const oy = mask.objectPositionY ?? 0.5;
    return {
        x: clamp01(mask.x + mask.w / 2 - w * ox, 0, 1 - w),
        y: clamp01(mask.y + mask.h / 2 - h * oy, 0, 1 - h),
        w,
        h,
    };
}

function withVideoNet(mask: OutdoorPipMask, video: Rect01): OutdoorPipMask {
    return {
        ...mask,
        videoX: video.x,
        videoY: video.y,
        videoW: video.w,
        videoH: video.h,
        // Keep legacy fields roughly in sync for older readers.
        scale: mask.w > 0 ? clamp01(video.w / mask.w, 0.5, 3) : 1,
        objectPositionX:
            video.w > 0 ? clamp01((mask.x + mask.w / 2 - video.x) / video.w) : 0.5,
        objectPositionY:
            video.h > 0 ? clamp01((mask.y + mask.h / 2 - video.y) / video.h) : 0.5,
    };
}

function applyRectDrag(
    mode: DragMode,
    prev: Rect01,
    dx: number,
    dy: number,
): Rect01 {
    const minSize = 0.05;
    if (mode === 'move') {
        return {
            ...prev,
            x: clamp01(prev.x + dx, 0, 1 - prev.w),
            y: clamp01(prev.y + dy, 0, 1 - prev.h),
        };
    }
    let next = { ...prev };
    if (mode === 'resize-se') {
        next.w = clamp01(prev.w + dx, minSize, 1 - prev.x);
        next.h = clamp01(prev.h + dy, minSize, 1 - prev.y);
    } else if (mode === 'resize-sw') {
        const newW = clamp01(prev.w - dx, minSize, prev.x + prev.w);
        next.x = clamp01(prev.x + prev.w - newW, 0, 1 - newW);
        next.w = newW;
        next.h = clamp01(prev.h + dy, minSize, 1 - prev.y);
    } else if (mode === 'resize-ne') {
        next.w = clamp01(prev.w + dx, minSize, 1 - prev.x);
        const newH = clamp01(prev.h - dy, minSize, prev.y + prev.h);
        next.y = clamp01(prev.y + prev.h - newH, 0, 1 - newH);
        next.h = newH;
    } else if (mode === 'resize-nw') {
        const newW = clamp01(prev.w - dx, minSize, prev.x + prev.w);
        next.x = clamp01(prev.x + prev.w - newW, 0, 1 - newW);
        next.w = newW;
        const newH = clamp01(prev.h - dy, minSize, prev.y + prev.h);
        next.y = clamp01(prev.y + prev.h - newH, 0, 1 - newH);
        next.h = newH;
    }
    return next;
}

/** Keep the mask net fully inside the video net. */
function clampRectInside(inner: Rect01, outer: Rect01, minSize = 0.05): Rect01 {
    const w = clamp01(Math.min(inner.w, outer.w), Math.min(minSize, outer.w), outer.w);
    const h = clamp01(Math.min(inner.h, outer.h), Math.min(minSize, outer.h), outer.h);
    return {
        x: clamp01(inner.x, outer.x, outer.x + outer.w - w),
        y: clamp01(inner.y, outer.y, outer.y + outer.h - h),
        w,
        h,
    };
}

/**
 * Equal pixel width/height so `border-radius: 50%` is a true circle
 * (not a capsule with flat sides on a non-square rect).
 */
function toPixelSquare(rect: Rect01, compW: number, compH: number): Rect01 {
    const sidePx = Math.min(rect.w * compW, rect.h * compH);
    const w = sidePx / compW;
    const h = sidePx / compH;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Clamp mask inside video; circle shape stays a true pixel square. */
function withClampedMask(
    mask: OutdoorPipMask,
    video: Rect01,
    compW: number,
    compH: number,
): OutdoorPipMask {
    let rect: Rect01 = { x: mask.x, y: mask.y, w: mask.w, h: mask.h };
    if (mask.shape === 'circle') {
        const maxSidePx = Math.min(video.w * compW, video.h * compH);
        const sidePx = Math.min(rect.w * compW, rect.h * compH, maxSidePx);
        const w = sidePx / compW;
        const h = sidePx / compH;
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        rect = {
            x: clamp01(cx - w / 2, video.x, video.x + video.w - w),
            y: clamp01(cy - h / 2, video.y, video.y + video.h - h),
            w,
            h,
        };
    } else {
        rect = clampRectInside(rect, video);
    }
    return withVideoNet({ ...mask, ...rect }, video);
}

/** Presenter take cropped into a masked box — two nets editable in Studio. */
export function OutdoorFilmedClipMask({
    scriptId,
    src,
    pipMask,
    beatIndex = 0,
}: OutdoorFilmedClipMaskProps) {
    const s = useCompositionScale();
    const remotionEnv = getRemotionEnvironment();
    const canEdit = remotionEnv.isStudio || remotionEnv.isPlayer;

    const [mask, setMask] = useState<OutdoorPipMask | undefined>(pipMask);
    /** Studio: edit nets vs pass-through so Remotion can scrub/play the clip. */
    const [isEditing, setIsEditing] = useState(true);
    const maskRef = useRef(mask);
    maskRef.current = mask;
    const dragRef = useRef<{
        net: NetKind;
        mode: DragMode;
        startX: number;
        startY: number;
        orig: OutdoorPipMask;
    } | null>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setMask(pipMask);
    }, [pipMask]);

    const resolvedRaw = mask ?? DEFAULT_MASK;
    const videoNet = resolveVideoNet(resolvedRaw);
    const resolved = withClampedMask(resolvedRaw, videoNet, s.width, s.height);
    const shape = resolved.shape ?? 'rectangle';
    const showEditors = canEdit && isEditing;

    const maskLeft = Math.round(s.width * resolved.x);
    const maskTop = Math.round(s.height * resolved.y);
    const maskW = Math.round(s.width * resolved.w);
    const maskH = Math.round(s.height * resolved.h);
    const videoLeft = Math.round(s.width * videoNet.x);
    const videoTop = Math.round(s.height * videoNet.y);
    const videoW = Math.round(s.width * videoNet.w);
    const videoH = Math.round(s.height * videoNet.h);
    const handleSize = Math.max(14, s.px(14));

    const schedulePersist = useCallback(
        (next: OutdoorPipMask) => {
            if (!canEdit) {
                return;
            }
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
            persistTimerRef.current = setTimeout(() => {
                void persistOutdoorPipMask(scriptId, withVideoNet(next, resolveVideoNet(next)), beatIndex);
            }, 300);
        },
        [beatIndex, canEdit, scriptId],
    );

    useEffect(() => {
        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
        };
    }, []);

    const beginDrag = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>, net: NetKind, mode: DragMode) => {
            if (!canEdit) {
                return;
            }
            if (net !== 'clip' && !isEditing) {
                return;
            }
            const base = maskRef.current ?? DEFAULT_MASK;
            const current = withClampedMask(base, resolveVideoNet(base), s.width, s.height);
            dragRef.current = {
                net,
                mode,
                startX: event.clientX,
                startY: event.clientY,
                orig: current,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
        },
        [canEdit, isEditing, s.height, s.width],
    );

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!dragRef.current || !canEdit) {
                return;
            }
            const dx = (event.clientX - dragRef.current.startX) / s.width;
            const dy = (event.clientY - dragRef.current.startY) / s.height;
            const prev = dragRef.current.orig;
            const prevVideo = resolveVideoNet(prev);

            if (dragRef.current.net === 'clip') {
                // Move mask + video together so the crop stays fixed while positioning.
                const nextVideoX = clamp01(prevVideo.x + dx, 0, 1 - prevVideo.w);
                const nextVideoY = clamp01(prevVideo.y + dy, 0, 1 - prevVideo.h);
                const adx = nextVideoX - prevVideo.x;
                const ady = nextVideoY - prevVideo.y;
                setMask(
                    withClampedMask(
                        {
                            ...prev,
                            x: prev.x + adx,
                            y: prev.y + ady,
                        },
                        {
                            ...prevVideo,
                            x: nextVideoX,
                            y: nextVideoY,
                        },
                        s.width,
                        s.height,
                    ),
                );
                return;
            }

            if (!isEditing) {
                return;
            }

            if (dragRef.current.net === 'mask') {
                let nextMaskRect = applyRectDrag(
                    dragRef.current.mode,
                    { x: prev.x, y: prev.y, w: prev.w, h: prev.h },
                    dx,
                    dy,
                );
                if (prev.shape === 'circle' && dragRef.current.mode !== 'move') {
                    // Uniform diameter from the larger axis change (pixel-square).
                    nextMaskRect = toPixelSquare(nextMaskRect, s.width, s.height);
                }
                setMask(
                    withClampedMask(
                        { ...prev, ...nextMaskRect },
                        prevVideo,
                        s.width,
                        s.height,
                    ),
                );
                return;
            }

            if (dragRef.current.net !== 'video') {
                return;
            }

            const nextVideo = applyRectDrag(dragRef.current.mode, prevVideo, dx, dy);
            // Keep mask inside the new video net; translate with video when moving.
            let nextMaskRect: Rect01 = { x: prev.x, y: prev.y, w: prev.w, h: prev.h };
            if (dragRef.current.mode === 'move') {
                nextMaskRect = {
                    ...nextMaskRect,
                    x: prev.x + (nextVideo.x - prevVideo.x),
                    y: prev.y + (nextVideo.y - prevVideo.y),
                };
            }
            setMask(
                withClampedMask({ ...prev, ...nextMaskRect }, nextVideo, s.width, s.height),
            );
        },
        [canEdit, isEditing, s.height, s.width],
    );

    const endDrag = useCallback(() => {
        if (!dragRef.current) {
            return;
        }
        dragRef.current = null;
        const next = maskRef.current;
        if (next) {
            schedulePersist(withClampedMask(next, resolveVideoNet(next), s.width, s.height));
        }
    }, [schedulePersist, s.height, s.width]);

    const setShape = useCallback(
        (nextShape: OutdoorPipMask['shape']) => {
            const base = maskRef.current ?? DEFAULT_MASK;
            const next = withClampedMask(
                { ...base, shape: nextShape },
                resolveVideoNet(base),
                s.width,
                s.height,
            );
            setMask(next);
            schedulePersist(next);
        },
        [schedulePersist, s.height, s.width],
    );

    const finishEditing = useCallback(() => {
        dragRef.current = null;
        const next = maskRef.current;
        if (next) {
            const clamped = withClampedMask(next, resolveVideoNet(next), s.width, s.height);
            setMask(clamped);
            schedulePersist(clamped);
        }
        setIsEditing(false);
    }, [schedulePersist, s.height, s.width]);

    const handleStyle = (color: string) => ({
        position: 'absolute' as const,
        width: handleSize,
        height: handleSize,
        borderRadius: 999,
        background: color,
        border: '2px solid rgba(15, 23, 42, 0.9)',
        zIndex: 10,
        touchAction: 'none' as const,
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
    });

    const renderHandles = (net: NetKind, color: string) => (
        <>
            <div
                onPointerDown={(event) => beginDrag(event, net, 'resize-nw')}
                style={{ ...handleStyle(color), left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' }}
            />
            <div
                onPointerDown={(event) => beginDrag(event, net, 'resize-ne')}
                style={{ ...handleStyle(color), right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' }}
            />
            <div
                onPointerDown={(event) => beginDrag(event, net, 'resize-sw')}
                style={{ ...handleStyle(color), left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' }}
            />
            <div
                onPointerDown={(event) => beginDrag(event, net, 'resize-se')}
                style={{ ...handleStyle(color), right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' }}
            />
        </>
    );

    const buttonStyle = {
        fontSize: s.px(11),
        fontWeight: 700,
        padding: `${s.px(5)}px ${s.px(10)}px`,
        borderRadius: s.px(6),
        border: 'none' as const,
        cursor: 'pointer' as const,
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        whiteSpace: 'nowrap' as const,
    };

    return (
        <div
            onPointerMove={canEdit ? onPointerMove : undefined}
            onPointerUp={canEdit ? endDrag : undefined}
            onPointerCancel={canEdit ? endDrag : undefined}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 6,
                pointerEvents: 'none',
            }}
        >
            {/* Video net outline (editable) — shows full underlying clip bounds */}
            {showEditors ? (
                <div
                    style={{
                        position: 'absolute',
                        left: videoLeft,
                        top: videoTop,
                        width: videoW,
                        height: videoH,
                        border: '2px dashed rgba(56, 189, 248, 0.95)',
                        borderRadius: s.px(8),
                        boxSizing: 'border-box',
                        zIndex: 7,
                        overflow: 'visible',
                        pointerEvents: 'auto',
                    }}
                >
                    <div
                        onPointerDown={(event) => beginDrag(event, 'video', 'move')}
                        title="Drag to move the video net (underlying clip)"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            cursor: 'grab',
                            background: 'rgba(56, 189, 248, 0.08)',
                        }}
                    />
                    {renderHandles('video', 'rgba(56, 189, 248, 0.98)')}
                    <div
                        style={{
                            position: 'absolute',
                            top: -s.px(22),
                            left: 0,
                            fontSize: s.px(11),
                            fontWeight: 800,
                            color: '#7dd3fc',
                            background: 'rgba(15, 23, 42, 0.85)',
                            padding: `${s.px(2)}px ${s.px(6)}px`,
                            borderRadius: s.px(4),
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Video net
                    </div>
                </div>
            ) : null}

            {/* Mask net — clips the video */}
            <div
                style={{
                    position: 'absolute',
                    left: maskLeft,
                    top: maskTop,
                    width: maskW,
                    height: maskH,
                    borderRadius: shape === 'circle' ? '50%' : s.px(14),
                    overflow: 'hidden',
                    boxShadow: showEditors
                        ? '0 0 0 9999px rgba(2, 6, 23, 0.45)'
                        : '0 10px 32px rgba(15, 23, 42, 0.28)',
                    border: showEditors
                        ? '2px solid rgba(253, 230, 138, 0.98)'
                        : '2px solid rgba(255, 255, 255, 0.88)',
                    zIndex: 8,
                    background: '#020617',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: videoLeft - maskLeft,
                        top: videoTop - maskTop,
                        width: videoW,
                        height: videoH,
                    }}
                >
                    <OutdoorSceneVideo
                        scriptId={scriptId}
                        src={src}
                        muted
                        objectFit="cover"
                        style={{ pointerEvents: 'none' }}
                    />
                </div>
            </div>

            {/* After Done: drag the clip to reposition (mask + video move together). */}
            {canEdit && !isEditing ? (
                <div
                    onPointerDown={(event) => beginDrag(event, 'clip', 'move')}
                    title="Drag to position the clip"
                    style={{
                        position: 'absolute',
                        left: maskLeft,
                        top: maskTop,
                        width: maskW,
                        height: maskH,
                        zIndex: 9,
                        cursor: 'grab',
                        pointerEvents: 'auto',
                        borderRadius: shape === 'circle' ? '50%' : s.px(14),
                    }}
                />
            ) : null}

            {showEditors ? (
                <div
                    style={{
                        position: 'absolute',
                        left: maskLeft,
                        top: maskTop,
                        width: maskW,
                        height: maskH,
                        overflow: 'visible',
                        zIndex: 9,
                        pointerEvents: 'auto',
                    }}
                >
                    <div
                        onPointerDown={(event) => beginDrag(event, 'mask', 'move')}
                        title="Drag to move the mask net (visible window)"
                        style={{
                            position: 'absolute',
                            inset: handleSize,
                            cursor: 'grab',
                        }}
                    />
                    {renderHandles('mask', 'rgba(253, 230, 138, 0.98)')}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -s.px(28),
                            left: 0,
                            display: 'flex',
                            gap: s.px(6),
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <span
                            style={{
                                fontSize: s.px(11),
                                fontWeight: 800,
                                color: '#fde68a',
                                background: 'rgba(15, 23, 42, 0.85)',
                                padding: `${s.px(2)}px ${s.px(6)}px`,
                                borderRadius: s.px(4),
                            }}
                        >
                            Mask net · {maskW}×{maskH}
                        </span>
                        <button
                            type="button"
                            onClick={() => setShape('rectangle')}
                            style={{
                                fontSize: s.px(10),
                                padding: `${s.px(3)}px ${s.px(8)}px`,
                                borderRadius: s.px(6),
                                border: 'none',
                                background:
                                    shape === 'rectangle'
                                        ? 'rgba(249, 115, 22, 0.9)'
                                        : 'rgba(15, 23, 42, 0.85)',
                                color: '#f8fafc',
                                cursor: 'pointer',
                            }}
                        >
                            Rect
                        </button>
                        <button
                            type="button"
                            onClick={() => setShape('circle')}
                            style={{
                                fontSize: s.px(10),
                                padding: `${s.px(3)}px ${s.px(8)}px`,
                                borderRadius: s.px(6),
                                border: 'none',
                                background:
                                    shape === 'circle'
                                        ? 'rgba(249, 115, 22, 0.9)'
                                        : 'rgba(15, 23, 42, 0.85)',
                                color: '#f8fafc',
                                cursor: 'pointer',
                            }}
                        >
                            Circle
                        </button>
                        <button
                            type="button"
                            onClick={finishEditing}
                            title="Finish framing — then drag the clip to position it"
                            style={{
                                ...buttonStyle,
                                background: 'rgba(34, 197, 94, 0.95)',
                                color: '#052e16',
                            }}
                        >
                            Done editing
                        </button>
                    </div>
                </div>
            ) : null}

            {canEdit && !isEditing ? (
                <div
                    style={{
                        position: 'absolute',
                        left: maskLeft + maskW + s.px(8),
                        top: maskTop,
                        zIndex: 20,
                        pointerEvents: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: s.px(6),
                        alignItems: 'flex-start',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        title="Edit mask and video nets"
                        style={{
                            ...buttonStyle,
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: '#f8fafc',
                        }}
                    >
                        Edit framing
                    </button>
                    <span
                        style={{
                            fontSize: s.px(10),
                            fontWeight: 600,
                            color: '#e2e8f0',
                            background: 'rgba(15, 23, 42, 0.75)',
                            padding: `${s.px(2)}px ${s.px(6)}px`,
                            borderRadius: s.px(4),
                        }}
                    >
                        Drag clip to position
                    </span>
                </div>
            ) : null}
        </div>
    );
}
