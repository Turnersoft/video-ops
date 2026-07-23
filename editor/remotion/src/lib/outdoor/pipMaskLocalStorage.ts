import type { OutdoorPipMask } from '../types/renderProps';

export function pipMaskStorageKey(
    scriptId: string,
    sceneIndex: number,
    beatIndex: number | undefined,
): string {
    return `video-ops:pip-mask:${scriptId}:${sceneIndex}:${beatIndex ?? 'all'}`;
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
): void {
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
        writePipMaskToStorage(pipMaskStorageKey(scriptId, sceneIndex, beatIndex), mask);
    }
}

export function resolveInitialPipMask(
    storageKey: string,
    pipMask: OutdoorPipMask | undefined,
): OutdoorPipMask | undefined {
    const stored = readPipMaskFromStorage(storageKey);
    if (stored && maskFingerprint(stored) !== maskFingerprint(pipMask)) {
        return stored;
    }
    return pipMask;
}
