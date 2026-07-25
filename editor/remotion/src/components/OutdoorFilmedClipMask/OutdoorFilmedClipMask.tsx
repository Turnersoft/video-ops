// Filmed take: two editable nets on the composition (photo-crop style).
// 1) Mask net = visible window  2) Video net = underlying original/cut clip rectangle
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getRemotionEnvironment } from "remotion";
import classes from "./OutdoorFilmedClipMask.module.scss";

import {
  persistOutdoorPipMask,
  persistOutdoorPipMaskSyncAll,
} from "../../lib/studio/persistOutdoorPipMask";
import type { OutdoorPipMaskSyncMode } from "../../lib/studio/persistOutdoorPipMask";
import { scaleCss } from "../../lib/layout/scaleCss";
import { useCompositionScale } from "../../lib/layout/useCompositionScale";
import {
  beatMaskFingerprint,
  maskFingerprint,
} from "../../lib/outdoor/pipMaskLocalStorage";
import type { OutdoorPipMask } from "../../lib/types/renderProps";
import { hasFootageSrc } from "../FilmedPlaceholders/FilmedPlaceholders";
import { OutdoorSceneVideo } from "../OutdoorSceneVideo/OutdoorSceneVideo";

export type OutdoorFilmedClipMaskProps = {
  scriptId: string;
  /** Cut clip for picture. Voice is SceneComposer <Audio> — keep this muted. */
  src: string;
  pipMask?: OutdoorPipMask;
  beatIndex?: number;
  sceneIndex?: number;
  /** Compare beats in this scene — enables sync-to-all-beats actions. */
  beatCount?: number;
  /** Share this mask position with every beat instead of saving a beat override. */
  persistAcrossBeats?: boolean;
  /** Studio / preview drag editing. */
  enableMaskEditing?: boolean;
  /** Landscape vs portrait layout (display only). */
  layoutFormat?: 'landscape' | 'portrait' | 'studio';
  /** `parent` = mask % of the containing band (portrait top strip). */
  boundsMode?: 'composition' | 'parent';
};

type NetKind = "mask" | "video" | "clip";
type DragMode = "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw";

type Rect01 = { x: number; y: number; w: number; h: number };

const DEFAULT_MASK: OutdoorPipMask = {
  shape: "rectangle",
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
  if (mode === "move") {
    return {
      ...prev,
      x: clamp01(prev.x + dx, 0, 1 - prev.w),
      y: clamp01(prev.y + dy, 0, 1 - prev.h),
    };
  }
  let next = { ...prev };
  if (mode === "resize-se") {
    next.w = clamp01(prev.w + dx, minSize, 1 - prev.x);
    next.h = clamp01(prev.h + dy, minSize, 1 - prev.y);
  } else if (mode === "resize-sw") {
    const newW = clamp01(prev.w - dx, minSize, prev.x + prev.w);
    next.x = clamp01(prev.x + prev.w - newW, 0, 1 - newW);
    next.w = newW;
    next.h = clamp01(prev.h + dy, minSize, 1 - prev.y);
  } else if (mode === "resize-ne") {
    next.w = clamp01(prev.w + dx, minSize, 1 - prev.x);
    const newH = clamp01(prev.h - dy, minSize, prev.y + prev.h);
    next.y = clamp01(prev.y + prev.h - newH, 0, 1 - newH);
    next.h = newH;
  } else if (mode === "resize-nw") {
    const newW = clamp01(prev.w - dx, minSize, prev.x + prev.w);
    next.x = clamp01(prev.x + prev.w - newW, 0, 1 - newW);
    next.w = newW;
    const newH = clamp01(prev.h - dy, minSize, prev.y + prev.h);
    next.y = clamp01(prev.y + prev.h - newH, 0, 1 - newH);
    next.h = newH;
  }
  return next;
}

/** Keep the visible mask window on-screen when repositioning the whole clip. */
function clampMaskRectInComposition(rect: Rect01): Rect01 {
  return {
    ...rect,
    x: clamp01(rect.x, 0, 1 - rect.w),
    y: clamp01(rect.y, 0, 1 - rect.h),
  };
}

/** Move a rect inside an outer bounds (e.g. mask net inside video net). */
function applyRectMoveInside(
  prev: Rect01,
  dx: number,
  dy: number,
  outer: Rect01,
): Rect01 {
  return {
    ...prev,
    x: clamp01(prev.x + dx, outer.x, outer.x + outer.w - prev.w),
    y: clamp01(prev.y + dy, outer.y, outer.y + outer.h - prev.h),
  };
}

/** Keep the mask net fully inside the video net. */
function clampRectInside(inner: Rect01, outer: Rect01, minSize = 0.05): Rect01 {
  const w = clamp01(
    Math.min(inner.w, outer.w),
    Math.min(minSize, outer.w),
    outer.w,
  );
  const h = clamp01(
    Math.min(inner.h, outer.h),
    Math.min(minSize, outer.h),
    outer.h,
  );
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
  if (mask.shape === "circle") {
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
  beatIndex,
  sceneIndex = 0,
  beatCount = 0,
  persistAcrossBeats = false,
  enableMaskEditing = !hasFootageSrc(src),
  layoutFormat = 'studio',
  boundsMode = 'composition',
}: OutdoorFilmedClipMaskProps) {
  const s = useCompositionScale();
  const remotionEnv = getRemotionEnvironment();
  const canEdit =
    (remotionEnv.isStudio || remotionEnv.isPlayer) && enableMaskEditing;
  const beatScopeKey = `${layoutFormat}:${sceneIndex}:${beatIndex ?? "all"}`;
  const initialMask = pipMask;

  const rootRef = useRef<HTMLDivElement>(null);
  const [parentSize, setParentSize] = useState({ w: s.width, h: s.height });
  useEffect(() => {
    if (boundsMode !== 'parent') {
      setParentSize({ w: s.width, h: s.height });
      return;
    }
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const sync = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setParentSize({ w, h });
      }
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [boundsMode, s.height, s.width]);

  const spaceW = boundsMode === 'parent' ? parentSize.w : s.width;
  const spaceH = boundsMode === 'parent' ? parentSize.h : s.height;

  const [mask, setMask] = useState<OutdoorPipMask | undefined>(initialMask);
  /** Studio: edit nets vs pass-through so Remotion can scrub/play the clip. */
  const [isEditing, setIsEditing] = useState(false);
  const maskRef = useRef<OutdoorPipMask | undefined>(initialMask);
  const dragRef = useRef<{
    net: NetKind;
    mode: DragMode;
    startX: number;
    startY: number;
    orig: OutdoorPipMask;
  } | null>(null);
  const lastAppliedPropRef = useRef<string>(maskFingerprint(pipMask));
  /** After drag/save: keep local position until reloaded props match (blocks stale snap-back). */
  const pendingLocalMaskRef = useRef<OutdoorPipMask | null>(null);
  const lastScopeRef = useRef<string>(beatScopeKey);
  const updateMask = useCallback((next: OutdoorPipMask | undefined) => {
    maskRef.current = next;
    setMask(next);
  }, []);

  useEffect(() => {
    const scopeChanged = lastScopeRef.current !== beatScopeKey;
    if (scopeChanged) {
      lastScopeRef.current = beatScopeKey;
      pendingLocalMaskRef.current = null;
      lastAppliedPropRef.current = maskFingerprint(pipMask);
      updateMask(pipMask);
      return;
    }
    if (dragRef.current) {
      return;
    }
    const propFingerprint = maskFingerprint(pipMask);
    const pending = pendingLocalMaskRef.current;
    if (pending) {
      // Accept props only once animation.md round-trip matches what we saved.
      if (beatMaskFingerprint(pipMask) === beatMaskFingerprint(pending)) {
        pendingLocalMaskRef.current = null;
        lastAppliedPropRef.current = propFingerprint;
        updateMask(pipMask);
      }
      return;
    }
    if (propFingerprint === lastAppliedPropRef.current) {
      return;
    }
    lastAppliedPropRef.current = propFingerprint;
    updateMask(pipMask);
  }, [beatScopeKey, pipMask, updateMask]);

  const resolvedRaw = mask ?? DEFAULT_MASK;
  const videoNet = resolveVideoNet(resolvedRaw);
  const resolved = withClampedMask(resolvedRaw, videoNet, spaceW, spaceH);
  const shape = resolved.shape ?? "rectangle";
  const showEditors = canEdit && isEditing;

  const maskLeft = Math.round(spaceW * resolved.x);
  const maskTop = Math.round(spaceH * resolved.y);
  const maskW = Math.round(spaceW * resolved.w);
  const maskH = Math.round(spaceH * resolved.h);
  const videoLeft = Math.round(spaceW * videoNet.x);
  const videoTop = Math.round(spaceH * videoNet.y);
  const videoW = Math.round(spaceW * videoNet.w);
  const videoH = Math.round(spaceH * videoNet.h);
  const handleSize = Math.max(14, s.px(14));
  const handleOffset = handleSize / 2;

  const schedulePersist = useCallback(
    (next: OutdoorPipMask) => {
      if (!canEdit) {
        return;
      }
      const payload = withVideoNet(next, resolveVideoNet(next));
      pendingLocalMaskRef.current = payload;
      lastAppliedPropRef.current = maskFingerprint(payload);
      void persistOutdoorPipMask(
        scriptId,
        payload,
        persistAcrossBeats ? undefined : beatIndex,
        sceneIndex,
      ).then((ok) => {
        if (!ok) {
          // Keep pending so stale props cannot snap the mask back after a failed save.
          console.warn(
            '[video-ops] Pip mask stay on screen locally, but animation.md was not updated.',
          );
        }
      });
    },
    [beatIndex, canEdit, persistAcrossBeats, sceneIndex, scriptId],
  );

  const beginDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      net: NetKind,
      mode: DragMode,
    ) => {
      if (!canEdit) {
        return;
      }
      if (net !== "clip" && !isEditing) {
        return;
      }
      const base = maskRef.current ?? DEFAULT_MASK;
      const current = withClampedMask(
        base,
        resolveVideoNet(base),
        spaceW,
        spaceH,
      );
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
    [canEdit, isEditing, spaceH, spaceW],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current || !canEdit) {
        return;
      }
      const dx = (event.clientX - dragRef.current.startX) / spaceW;
      const dy = (event.clientY - dragRef.current.startY) / spaceH;
      const prev = dragRef.current.orig;
      const prevVideo = resolveVideoNet(prev);

      if (dragRef.current.net === "clip") {
        // Move mask + video together. Clamp the visible mask — the scaled video net
        // may extend past the frame bottom for crop; clamping video Y caused upward snap.
        const maskRect = { x: prev.x, y: prev.y, w: prev.w, h: prev.h };
        const nextMaskRect = clampMaskRectInComposition({
          ...maskRect,
          x: maskRect.x + dx,
          y: maskRect.y + dy,
        });
        const adx = nextMaskRect.x - maskRect.x;
        const ady = nextMaskRect.y - maskRect.y;
        updateMask(
          withClampedMask(
            {
              ...prev,
              x: nextMaskRect.x,
              y: nextMaskRect.y,
            },
            {
              ...prevVideo,
              x: prevVideo.x + adx,
              y: prevVideo.y + ady,
            },
            spaceW,
            spaceH,
          ),
        );
        return;
      }

      if (!isEditing) {
        return;
      }

      if (dragRef.current.net === "mask") {
        let nextMaskRect: Rect01;
        if (dragRef.current.mode === "move") {
          nextMaskRect = applyRectMoveInside(
            { x: prev.x, y: prev.y, w: prev.w, h: prev.h },
            dx,
            dy,
            prevVideo,
          );
        } else {
          nextMaskRect = applyRectDrag(
            dragRef.current.mode,
            { x: prev.x, y: prev.y, w: prev.w, h: prev.h },
            dx,
            dy,
          );
        }
        if (prev.shape === "circle" && dragRef.current.mode !== "move") {
          // Uniform diameter from the larger axis change (pixel-square).
          nextMaskRect = toPixelSquare(nextMaskRect, spaceW, spaceH);
        }
        updateMask(
          withClampedMask(
            { ...prev, ...nextMaskRect },
            prevVideo,
            spaceW,
            spaceH,
          ),
        );
        return;
      }

      if (dragRef.current.net !== "video") {
        return;
      }

      const nextVideo =
        dragRef.current.mode === "move"
          ? {
              ...prevVideo,
              x: prevVideo.x + dx,
              y: prevVideo.y + dy,
            }
          : applyRectDrag(dragRef.current.mode, prevVideo, dx, dy);
      // Keep mask inside the new video net; translate with video when moving.
      let nextMaskRect: Rect01 = { x: prev.x, y: prev.y, w: prev.w, h: prev.h };
      if (dragRef.current.mode === "move") {
        nextMaskRect = {
          ...nextMaskRect,
          x: prev.x + (nextVideo.x - prevVideo.x),
          y: prev.y + (nextVideo.y - prevVideo.y),
        };
      }
      updateMask(
        withClampedMask(
          { ...prev, ...nextMaskRect },
          nextVideo,
          spaceW,
          spaceH,
        ),
      );
    },
    [canEdit, isEditing, spaceH, spaceW, updateMask],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    const next = maskRef.current;
    if (next) {
      const clamped = withClampedMask(
        next,
        resolveVideoNet(next),
        spaceW,
        spaceH,
      );
      updateMask(clamped);
      schedulePersist(clamped);
    }
  }, [schedulePersist, spaceH, spaceW, updateMask]);

  const setShape = useCallback(
    (nextShape: OutdoorPipMask["shape"]) => {
      const base = maskRef.current ?? DEFAULT_MASK;
      const next = withClampedMask(
        { ...base, shape: nextShape },
        resolveVideoNet(base),
        spaceW,
        spaceH,
      );
      updateMask(next);
      schedulePersist(next);
    },
    [schedulePersist, spaceH, spaceW, updateMask],
  );

  const finishEditing = useCallback(() => {
    dragRef.current = null;
    const next = maskRef.current;
    if (next) {
      const clamped = withClampedMask(
        next,
        resolveVideoNet(next),
        spaceW,
        spaceH,
      );
      updateMask(clamped);
      schedulePersist(clamped);
    }
    setIsEditing(false);
  }, [schedulePersist, spaceH, spaceW, updateMask]);

  const syncToAllBeats = useCallback(
    (mode: OutdoorPipMaskSyncMode) => {
      if (!canEdit || beatCount <= 1) {
        return;
      }
      const next = maskRef.current;
      if (!next) {
        return;
      }
      const clamped = withClampedMask(
        next,
        resolveVideoNet(next),
        spaceW,
        spaceH,
      );
      const payload = withVideoNet(clamped, resolveVideoNet(clamped));
      updateMask(clamped);
      pendingLocalMaskRef.current = payload;
      lastAppliedPropRef.current = maskFingerprint(payload);
      void persistOutdoorPipMaskSyncAll(
        scriptId,
        payload,
        sceneIndex,
        beatCount,
        mode,
      );
    },
    [
      beatCount,
      canEdit,
      sceneIndex,
      scriptId,
      spaceH,
      spaceW,
      updateMask,
    ],
  );

  const showSyncButtons = canEdit && beatCount > 1;

  const renderHandles = (net: NetKind, color: string) => (
    <>
      <div
        className={`${classes.handle} ${classes.handleNw}`}
        onPointerDown={(event) => beginDrag(event, net, "resize-nw")}
        style={{ background: color, left: -handleOffset, top: -handleOffset }}
      />
      <div
        className={`${classes.handle} ${classes.handleNe}`}
        onPointerDown={(event) => beginDrag(event, net, "resize-ne")}
        style={{ background: color, right: -handleOffset, top: -handleOffset }}
      />
      <div
        className={`${classes.handle} ${classes.handleSw}`}
        onPointerDown={(event) => beginDrag(event, net, "resize-sw")}
        style={{
          background: color,
          left: -handleOffset,
          bottom: -handleOffset,
        }}
      />
      <div
        className={`${classes.handle} ${classes.handleSe}`}
        onPointerDown={(event) => beginDrag(event, net, "resize-se")}
        style={{
          background: color,
          right: -handleOffset,
          bottom: -handleOffset,
        }}
      />
    </>
  );

  const maskShapeClass =
    shape === "circle" ? classes.maskNetCircle : classes.maskNetRect;
  const portraitFlush = layoutFormat === "portrait" && !canEdit;
  const maskModeClass = showEditors
    ? classes.maskNetEditing
    : portraitFlush
      ? classes.maskNetPortraitFlush
      : classes.maskNetLocked;

  return (
    <div
      ref={rootRef}
      onPointerMove={canEdit ? onPointerMove : undefined}
      onPointerUp={canEdit ? endDrag : undefined}
      onPointerCancel={canEdit ? endDrag : undefined}
      className={`${classes.root} ${portraitFlush ? classes.rootPortraitBack : ""}`}
      style={scaleCss(s.scale)}
    >
      {showEditors ? (
        <div
          className={classes.videoNet}
          style={{
            left: videoLeft,
            top: videoTop,
            width: videoW,
            height: videoH,
          }}
        >
          <div
            className={classes.videoNetDrag}
            onPointerDown={(event) => beginDrag(event, "video", "move")}
            title="Drag to move the video net (underlying clip)"
          />
          {renderHandles("video", "rgba(56, 189, 248, 0.98)")}
          <div className={`${classes.netLabel} ${classes.videoNetLabel}`}>
            Video net
          </div>
        </div>
      ) : null}

      <div
        className={`${classes.maskNet} ${maskShapeClass} ${maskModeClass}`}
        style={{
          left: maskLeft,
          top: maskTop,
          width: maskW,
          height: maskH,
        }}
      >
        <div
          className={classes.videoClip}
          style={{
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
            style={{ pointerEvents: "none" }}
          />
        </div>
      </div>

      {canEdit && !isEditing ? (
        <div
          className={`${classes.clipDragOverlay} ${maskShapeClass}`}
          onPointerDown={(event) => beginDrag(event, "clip", "move")}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing(true);
          }}
          title="Drag to position · double-click to edit framing"
          style={{
            left: maskLeft,
            top: maskTop,
            width: maskW,
            height: maskH,
          }}
        />
      ) : null}

      {showEditors ? (
        <div
          className={classes.maskEditor}
          style={{
            left: maskLeft,
            top: maskTop,
            width: maskW,
            height: maskH,
          }}
        >
          <div
            className={classes.maskDrag}
            onPointerDown={(event) => beginDrag(event, "mask", "move")}
            title="Drag to move the mask net (visible window)"
            style={{ inset: handleSize }}
          />
          {renderHandles("mask", "rgba(253, 230, 138, 0.98)")}
          <div className={classes.maskControls}>
            <span className={classes.maskLabel}>
              Mask net · {maskW}×{maskH}
            </span>
            <button
              type="button"
              className={`${classes.shapeButton} ${
                shape === "rectangle"
                  ? classes.shapeButtonActive
                  : classes.shapeButtonInactive
              }`}
              onClick={() => setShape("rectangle")}
            >
              Rect
            </button>
            <button
              type="button"
              className={`${classes.shapeButton} ${
                shape === "circle"
                  ? classes.shapeButtonActive
                  : classes.shapeButtonInactive
              }`}
              onClick={() => setShape("circle")}
            >
              Circle
            </button>
            <button
              type="button"
              className={`${classes.toolbarButton} ${classes.doneButton}`}
              onClick={finishEditing}
              title="Finish framing — then drag the clip to position it"
            >
              Done editing
            </button>
            {showSyncButtons ? (
              <>
                <button
                  type="button"
                  className={`${classes.toolbarButton} ${classes.syncButton}`}
                  onClick={() => syncToAllBeats("position")}
                  title="Copy this beat's avatar position to every beat"
                >
                  Sync position → all
                </button>
                <button
                  type="button"
                  className={`${classes.toolbarButton} ${classes.syncButton}`}
                  onClick={() => syncToAllBeats("full")}
                  title="Copy shape, size, crop, and position to every beat"
                >
                  Sync mask → all
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {canEdit && !isEditing ? (
        <div
          className={classes.postEditToolbar}
          style={{
            left: maskLeft,
            top: Math.min(maskTop + maskH + s.px(8), spaceH - s.px(72)),
            maxWidth: Math.max(maskW, s.px(420)),
          }}
        >
          <button
            type="button"
            className={`${classes.toolbarButton} ${classes.editFramingButton}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsEditing(true);
            }}
            title="Edit mask and video nets"
          >
            Edit framing
          </button>
          {showSyncButtons ? (
            <>
              <button
                type="button"
                className={`${classes.toolbarButton} ${classes.syncButton}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  syncToAllBeats("position");
                }}
                title="Copy this beat's avatar position to every beat"
              >
                Sync position → all
              </button>
              <button
                type="button"
                className={`${classes.toolbarButton} ${classes.syncButton}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  syncToAllBeats("full");
                }}
                title="Copy shape, size, crop, and position to every beat"
              >
                Sync mask → all
              </button>
            </>
          ) : null}
          <span className={classes.dragHint}>
            Drag clip · double-click to edit
          </span>
        </div>
      ) : null}
    </div>
  );
}
