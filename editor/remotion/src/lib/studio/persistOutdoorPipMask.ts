import { videoOpsDevApiUrl } from './videoOpsDevApi';

export type OutdoorPipMaskPersist = {
    shape: 'circle' | 'rectangle';
    x: number;
    y: number;
    w: number;
    h: number;
    videoX?: number;
    videoY?: number;
    videoW?: number;
    videoH?: number;
    objectPositionX?: number;
    objectPositionY?: number;
    scale?: number;
};

export type OutdoorPipMaskSyncMode = 'position' | 'full';

function notifyAnimationJsonChanged(scriptId: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new CustomEvent('video-ops-animation-changed', { detail: { scriptId } }));
}

function outdoorPipMaskPersistEndpoints(): string[] {
    const endpoints: string[] = [];
    if (typeof window !== 'undefined') {
        // Remotion Studio (webpack dev server) and Video Editor (Vite) — same origin.
        endpoints.push('/video_ops/api/outdoor-pip-mask');
    }
    endpoints.push(videoOpsDevApiUrl('/video_ops/api/outdoor-pip-mask'));
    return endpoints;
}

function outdoorPipMaskSyncAllEndpoints(): string[] {
    const endpoints: string[] = [];
    if (typeof window !== 'undefined') {
        endpoints.push('/video_ops/api/outdoor-pip-mask-sync-all');
    }
    endpoints.push(videoOpsDevApiUrl('/video_ops/api/outdoor-pip-mask-sync-all'));
    return endpoints;
}

/** Browser-side: POST outdoor PIP mask to the video-ops dev API. */
export async function persistOutdoorPipMask(
    scriptId: string,
    pipMask: OutdoorPipMaskPersist,
    beatIndex?: number,
    sceneIndex = 0,
): Promise<boolean> {
    const endpoints = outdoorPipMaskPersistEndpoints();
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId, pipMask, beatIndex, sceneIndex }),
            });
            if (response.ok) {
                notifyAnimationJsonChanged(scriptId);
                return true;
            }
        } catch {
            // try next
        }
    }
    return false;
}

/** Copy the active beat's mask position or full settings onto every beat in the scene. */
export async function persistOutdoorPipMaskSyncAll(
    scriptId: string,
    pipMask: OutdoorPipMaskPersist,
    sceneIndex: number,
    beatCount: number,
    mode: OutdoorPipMaskSyncMode,
): Promise<boolean> {
    const endpoints = outdoorPipMaskSyncAllEndpoints();
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId, pipMask, sceneIndex, beatCount, mode }),
            });
            if (response.ok) {
                notifyAnimationJsonChanged(scriptId);
                return true;
            }
        } catch {
            // try next
        }
    }
    return false;
}
