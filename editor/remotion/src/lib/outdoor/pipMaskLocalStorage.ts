import type { OutdoorPipMask } from '../types/renderProps';

export function pipMaskStorageKey(
    scriptId: string,
    sceneIndex: number,
    beatIndex: number | undefined,
    layoutFormat: 'landscape' | 'portrait' | 'studio' = 'studio',
): string {
    return `video-ops:pip-mask:${layoutFormat}:${scriptId}:${sceneIndex}:${beatIndex ?? 'all'}`;
}

function roundMaskPart(value: number | undefined, digits: number): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return '';
    }
    return String(Number(value.toFixed(digits)));
}

export function maskFingerprint(mask: OutdoorPipMask | null | undefined): string {
    if (!mask) {
        return '';
    }
    return [
        mask.shape ?? 'rectangle',
        mask.x,
        mask.y,
        mask.w,
        mask.h,
        mask.videoX ?? '',
        mask.videoY ?? '',
        mask.videoW ?? '',
        mask.videoH ?? '',
        mask.objectPositionX ?? '',
        mask.objectPositionY ?? '',
        mask.scale ?? '',
    ].join('|');
}

/** Stable key for fields that survive animation.md round-trip (ignores video-net float noise). */
export function beatMaskFingerprint(mask: OutdoorPipMask | null | undefined): string {
    if (!mask) {
        return '';
    }
    return [
        mask.shape ?? 'rectangle',
        roundMaskPart(mask.x, 4),
        roundMaskPart(mask.y, 4),
        roundMaskPart(mask.w, 4),
        roundMaskPart(mask.h, 4),
        roundMaskPart(mask.objectPositionX ?? 0.5, 4),
        roundMaskPart(mask.objectPositionY ?? 0.5, 4),
        roundMaskPart(mask.scale ?? 1, 4),
    ].join('|');
}

export function readPipMaskFromStorage(key: string): OutdoorPipMask | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as OutdoorPipMask;
        if (
            typeof parsed.x !== 'number' ||
            typeof parsed.y !== 'number' ||
            typeof parsed.w !== 'number' ||
            typeof parsed.h !== 'number'
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function writePipMaskToStorage(key: string, mask: OutdoorPipMask): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(mask));
    } catch {
        // Ignore quota / private-mode failures — file persist is the source of truth.
    }
}

export function writePipMaskToAllBeatStorage(
    scriptId: string,
    sceneIndex: number,
    beatCount: number,
    mask: OutdoorPipMask,
    layoutFormat: 'landscape' | 'portrait' | 'studio' = 'studio',
): void {
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
        writePipMaskToStorage(
            pipMaskStorageKey(scriptId, sceneIndex, beatIndex, layoutFormat),
            mask,
        );
    }
}

export function resolveInitialPipMask(
    storageKey: string,
    pipMask: OutdoorPipMask | undefined,
    /** When true, animation.md / render props win over preview localStorage. */
    preferScript = false,
): OutdoorPipMask | undefined {
    if (preferScript && pipMask) {
        return pipMask;
    }
    const stored = readPipMaskFromStorage(storageKey);
    if (stored && maskFingerprint(stored) !== maskFingerprint(pipMask)) {
        return stored;
    }
    return pipMask ?? stored ?? undefined;
}
