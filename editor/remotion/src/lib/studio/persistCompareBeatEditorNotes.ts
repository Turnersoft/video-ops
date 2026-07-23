import { videoOpsDevApiUrl } from './videoOpsDevApi';

export type PersistCompareBeatEditorNotesInput = {
    scriptId: string;
    beatIndex: number;
    comment: string;
    allowScriptChange: boolean;
    sceneIndex?: number;
};

export type PersistCompareBeatEditorNotesResult =
    | { ok: true; comment: string; allowScriptChange: boolean }
    | { ok: false; error: string };

function notifyAnimationJsonChanged(scriptId: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(
        new CustomEvent('video-ops-animation-changed', { detail: { scriptId } }),
    );
}

async function postBeatEditorNotes(
    endpoint: string,
    body: string,
): Promise<PersistCompareBeatEditorNotesResult> {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
            return {
                ok: false,
                error:
                    endpoint.startsWith('/')
                        ? 'Save API is not on the Remotion Studio server. Use the sidecar on port 3021.'
                        : `Unexpected response from ${endpoint}`,
            };
        }

        const payload = (await response.json()) as {
            ok?: boolean;
            comment?: string;
            allowScriptChange?: boolean;
            error?: string;
        };
        if (!response.ok || !payload.ok) {
            if (response.status === 404 && endpoint.includes(':3021')) {
                return {
                    ok: false,
                    error:
                        'Video Ops write API on port 3021 is stale (missing compare-beat-editor-notes). Kill the process on :3021 and restart `npm run studio`.',
                };
            }
            return {
                ok: false,
                error: payload.error ?? `Save failed (${response.status})`,
            };
        }

        return {
            ok: true,
            comment: payload.comment ?? JSON.parse(body).comment,
            allowScriptChange:
                payload.allowScriptChange ?? JSON.parse(body).allowScriptChange,
        };
    } catch (caught) {
        return {
            ok: false,
            error:
                caught instanceof Error
                    ? caught.message
                    : `Could not reach ${endpoint}`,
        };
    }
}

function beatEditorNotesEndpoints(): string[] {
    const endpoints = [videoOpsDevApiUrl('/video_ops/api/compare-beat-editor-notes')];
    if (typeof window !== 'undefined' && window.location.port === '5173') {
        endpoints.push('/video_ops/api/compare-beat-editor-notes');
    } else {
        endpoints.push('http://localhost:5173/video_ops/api/compare-beat-editor-notes');
    }
    return endpoints;
}

export async function persistCompareBeatEditorNotesToFile(
    input: PersistCompareBeatEditorNotesInput,
): Promise<PersistCompareBeatEditorNotesResult> {
    if (typeof fetch === 'undefined') {
        return { ok: false, error: 'Fetch is unavailable in this environment.' };
    }

    const body = JSON.stringify({
        scriptId: input.scriptId,
        beatIndex: input.beatIndex,
        sceneIndex: input.sceneIndex ?? 0,
        comment: input.comment,
        allowScriptChange: input.allowScriptChange,
    });

    const endpoints = beatEditorNotesEndpoints();
    let lastError =
        'Video Ops write API is not running on port 3021. Stop Studio and run `npm run studio` again.';

    for (const endpoint of endpoints) {
        const result = await postBeatEditorNotes(endpoint, body);
        if (result.ok) {
            notifyAnimationJsonChanged(input.scriptId);
            return result;
        }
        lastError = result.error;
    }

    return { ok: false, error: lastError };
}
