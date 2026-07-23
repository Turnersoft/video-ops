import type { VideoOpsBeatPlacement } from '../../lib/placements/beatPlacements';

export type PlacementDragOffset = {
    dx: number;
    dy: number;
};

export function placementLayoutStorageKey(
    scriptId: string,
    sceneIndex: number,
    beatIndex: number,
    placementId: string,
): string {
    return `video-ops:placement-layout:${scriptId}:${sceneIndex}:${beatIndex}:${placementId}`;
}

export function readPlacementDragOffset(storageKey: string): PlacementDragOffset | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as PlacementDragOffset;
        if (typeof parsed.dx !== 'number' || typeof parsed.dy !== 'number') {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function writePlacementDragOffset(storageKey: string, offset: PlacementDragOffset): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(offset));
}

export function effectivePlacementRect(
    placement: VideoOpsBeatPlacement,
    dragOffset: PlacementDragOffset | null,
): { left: string; top: string; width: string; height: string } {
    const x = Math.min(1, Math.max(0, placement.x + (dragOffset?.dx ?? 0)));
    const y = Math.min(1, Math.max(0, placement.y + (dragOffset?.dy ?? 0)));
    const width = placement.width;
    const height = placement.height ?? width * 0.62;
    return {
        left: `${Math.round(x * 100)}%`,
        top: `${Math.round(y * 100)}%`,
        width: `${Math.round(width * 100)}%`,
        height: `${Math.round(height * 100)}%`,
    };
}
