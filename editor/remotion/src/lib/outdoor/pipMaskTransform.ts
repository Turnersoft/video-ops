import type { OutdoorBeatPipMask } from '../compile/video-ops/videoOpsAnimationBeats';
import type { OutdoorPipMaskPersist } from '../studio/persistOutdoorPipMask';

export type { OutdoorPipMaskSyncMode } from '../studio/persistOutdoorPipMask';

export const DEFAULT_BEAT_PIP_MASK: OutdoorBeatPipMask = {
    shape: 'rectangle',
    x: 0.02,
    y: 0.55,
    w: 0.28,
    h: 0.38,
    objectPositionX: 0.62,
    objectPositionY: 0.42,
    scale: 1.28,
};

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

/** Map Studio mask editor state into animation.md beat pip directives. */
export function outdoorPipMaskPersistToBeatMask(
    mask: OutdoorPipMaskPersist,
): OutdoorBeatPipMask {
    const hasVideoNet =
        Number.isFinite(mask.videoW) &&
        Number.isFinite(mask.videoH) &&
        mask.videoW! > 0 &&
        mask.videoH! > 0;
    let objectPositionX = mask.objectPositionX ?? 0.5;
    let objectPositionY = mask.objectPositionY ?? 0.5;
    let scale = mask.scale ?? 1;
    if (hasVideoNet && mask.w > 0 && mask.h > 0) {
        objectPositionX = clamp01((mask.x + mask.w / 2 - mask.videoX!) / mask.videoW!);
        objectPositionY = clamp01((mask.y + mask.h / 2 - mask.videoY!) / mask.videoH!);
        scale = Math.max(0.5, mask.videoW! / mask.w);
    }
    return {
        shape: mask.shape ?? 'rectangle',
        x: mask.x,
        y: mask.y,
        w: mask.w,
        h: mask.h,
        objectPositionX,
        objectPositionY,
        scale,
    };
}

/** Expand animation.md beat mask into render-time mask with video net fields. */
export function beatPipMaskToRenderMask(beatMask: OutdoorBeatPipMask): OutdoorPipMaskPersist {
    const scale = beatMask.scale ?? 1;
    const videoW = beatMask.w * scale;
    const videoH = beatMask.h * scale;
    const objectPositionX = beatMask.objectPositionX ?? 0.5;
    const objectPositionY = beatMask.objectPositionY ?? 0.5;
    return {
        ...beatMask,
        videoX: clamp01(beatMask.x + beatMask.w / 2 - videoW * objectPositionX),
        videoY: clamp01(beatMask.y + beatMask.h / 2 - videoH * objectPositionY),
        videoW,
        videoH,
        objectPositionX,
        objectPositionY,
        scale,
    };
}
