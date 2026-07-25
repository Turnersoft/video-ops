import { videoOpsDevApiUrl } from './videoOpsDevApi';
import { canonicalVideoOpsScriptId } from '../videoOpsPaths';

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
    const canonicalId = canonicalVideoOpsScriptId(scriptId);
    window.dispatchEvent(
        new CustomEvent('video-ops-animation-changed', { detail: { scriptId: canonicalId } }),
    );
}

function outdoorPipMaskPersistEndpoints(): string[] {
    // Prefer the :3021 sidecar — outdoor:all always runs it; webpack middleware may be stale.
    const endpoints = [videoOpsDevApiUrl('/video_ops/api/outdoor-pip-mask')];
    if (typeof window !== 'undefined') {
        endpoints.push('/video_ops/api/outdoor-pip-mask');
    }
    return endpoints;
}

function outdoorPipMaskSyncAllEndpoints(): string[] {
    const endpoints = [videoOpsDevApiUrl('/video_ops/api/outdoor-pip-mask-sync-all')];
    if (typeof window !== 'undefined') {
        endpoints.push('/video_ops/api/outdoor-pip-mask-sync-all');
    }
    return endpoints;
}

async function readOkPayload(response: Response): Promise<{ ok: boolean; error?: string }> {
    const text = await response.text();
    const trimmed = text.trimStart().toLowerCase();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
        return { ok: false, error: 'Got HTML instead of JSON (API route missing?)' };
    }
    try {
        const payload = JSON.parse(text) as { ok?: boolean; error?: string };
        if (response.ok && payload.ok === true) {
            return { ok: true };
        }
        return {
            ok: false,
            error: payload.error?.trim() || `HTTP ${response.status}`,
        };
    } catch {
        return { ok: false, error: `HTTP ${response.status}` };
    }
}

/** Browser-side: POST outdoor PIP mask to the video-ops dev API. */
export async function persistOutdoorPipMask(
    scriptId: string,
    pipMask: OutdoorPipMaskPersist,
    beatIndex?: number,
    sceneIndex = 0,
): Promise<boolean> {
    const canonicalId = canonicalVideoOpsScriptId(scriptId);
    const endpoints = outdoorPipMaskPersistEndpoints();
    let lastError = '';
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: canonicalId,
                    pipMask,
                    beatIndex,
                    sceneIndex,
                }),
            });
            const result = await readOkPayload(response);
            if (result.ok) {
                notifyAnimationJsonChanged(canonicalId);
                return true;
            }
            lastError = result.error || 'Save failed';
        } catch (caught) {
            lastError = caught instanceof Error ? caught.message : 'Network error';
        }
    }
    if (typeof console !== 'undefined' && lastError) {
        console.warn(`[video-ops] Could not save outdoor pip mask: ${lastError}`);
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
    const canonicalId = canonicalVideoOpsScriptId(scriptId);
    const endpoints = outdoorPipMaskSyncAllEndpoints();
    let lastError = '';
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: canonicalId,
                    pipMask,
                    sceneIndex,
                    beatCount,
                    mode,
                }),
            });
            const result = await readOkPayload(response);
            if (result.ok) {
                notifyAnimationJsonChanged(canonicalId);
                return true;
            }
            lastError = result.error || 'Sync failed';
        } catch (caught) {
            lastError = caught instanceof Error ? caught.message : 'Network error';
        }
    }
    if (typeof console !== 'undefined' && lastError) {
        console.warn(`[video-ops] Could not sync outdoor pip mask: ${lastError}`);
    }
    return false;
}
