import type { OutdoorPipMask } from '../types/renderProps';

/** Top presenter strip height in portrait outdoor / compare layouts. */
export const PORTRAIT_PRESENTER_BAND_RATIO = 0.33;

/** Default mask when the filmed clip fills the portrait top band container. */
export const DEFAULT_PORTRAIT_TOP_BAND_MASK: OutdoorPipMask = {
    shape: 'rectangle',
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    videoX: 0,
    videoY: 0,
    videoW: 1,
    videoH: 1,
    objectPositionX: 0.5,
    objectPositionY: 0.35,
    scale: 1,
};

/** Default mask for full-frame portrait overlays (top third of the composition). */
export const DEFAULT_PORTRAIT_FRAME_MASK: OutdoorPipMask = {
    shape: 'rectangle',
    x: 0,
    y: 0,
    w: 1,
    h: PORTRAIT_PRESENTER_BAND_RATIO,
    videoX: 0,
    videoY: 0,
    videoW: 1,
    videoH: PORTRAIT_PRESENTER_BAND_RATIO,
    objectPositionX: 0.5,
    objectPositionY: 0.35,
    scale: 1,
};

function isLandscapeBottomPip(pipMask: OutdoorPipMask | undefined): boolean {
    return !pipMask || (pipMask.y ?? 0) >= 0.4;
}

/** Landscape-style bottom PIP coordinates do not fit portrait top-band layout. */
export function resolvePortraitBandPipMask(pipMask: OutdoorPipMask | undefined): OutdoorPipMask {
    const base = { ...DEFAULT_PORTRAIT_TOP_BAND_MASK };
    if (isLandscapeBottomPip(pipMask)) {
        return base;
    }
    return {
        ...base,
        objectPositionX: pipMask?.objectPositionX ?? base.objectPositionX,
        objectPositionY: pipMask?.objectPositionY ?? base.objectPositionY,
        scale: pipMask?.scale ?? base.scale,
    };
}

/** Full-frame studio overlays — map legacy bottom PIP to the portrait top strip. */
export function resolvePortraitFramePipMask(pipMask: OutdoorPipMask | undefined): OutdoorPipMask {
    const base = { ...DEFAULT_PORTRAIT_FRAME_MASK };
    if (isLandscapeBottomPip(pipMask)) {
        return base;
    }
    return {
        ...base,
        objectPositionX: pipMask?.objectPositionX ?? base.objectPositionX,
        objectPositionY: pipMask?.objectPositionY ?? base.objectPositionY,
        scale: pipMask?.scale ?? base.scale,
    };
}

/** @deprecated Use resolvePortraitBandPipMask or resolvePortraitFramePipMask. */
export function resolvePortraitPipMask(pipMask: OutdoorPipMask | undefined): OutdoorPipMask {
    return resolvePortraitBandPipMask(pipMask);
}
