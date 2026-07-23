import { joinSayParagraphs } from '../compile/video-ops/parseVideoOpsMarkdown';
import { videoOpsDevApiUrl } from './videoOpsDevApi';

export type PersistCompareBeatSayInput = {
    scriptId: string;
    beatIndex: number;
    say: string;
    sceneIndex?: number;
};

export type PersistCompareBeatSayResult =
    | { ok: true; say: string }
    | { ok: false; error: string };

function notifyAnimationJsonChanged(scriptId: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(
        new CustomEvent('video-ops-animation-changed', { detail: { scriptId } }),
    );
}

async function postCompareBeatSay(
    endpoint: string,
    body: string,
): Promise<PersistCompareBeatSayResult> {
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

    const payload = (await response.json()) as { ok?: boolean; say?: string; error?: string };
    if (!response.ok || !payload.ok) {
        return {
            ok: false,
            error: payload.error ?? `Save failed (${response.status})`,
        };
    }

    return { ok: true, say: payload.say ?? JSON.parse(body).say };
}

function compareBeatSayEndpoints(): string[] {
    const endpoints = [videoOpsDevApiUrl('/video_ops/api/compare-beat-say')];
    if (typeof window !== 'undefined' && window.location.port === '5173') {
        endpoints.push('/video_ops/api/compare-beat-say');
    } else {
        endpoints.push('http://localhost:5173/video_ops/api/compare-beat-say');
    }
    return endpoints;
}

/** Write one compare beat `say` into animation.json (Video Editor or Remotion Studio). */
export async function persistCompareBeatSayToFile(
    input: PersistCompareBeatSayInput,
): Promise<PersistCompareBeatSayResult> {
    if (typeof fetch === 'undefined') {
        return { ok: false, error: 'Fetch is unavailable in this environment.' };
    }

    const body = JSON.stringify({
        scriptId: input.scriptId,
        beatIndex: input.beatIndex,
        sceneIndex: input.sceneIndex ?? 0,
        say: input.say,
    });

    const endpoints = compareBeatSayEndpoints();

    let lastError =
        'Video Ops write API is not running on port 3021. Stop Studio and run `npm run studio` again.';

    for (const endpoint of endpoints) {
        try {
            const result = await postCompareBeatSay(endpoint, body);
            if (result.ok) {
                notifyAnimationJsonChanged(input.scriptId);
                return result;
            }
            lastError = result.error;
        } catch {
            if (endpoint.includes(':3021')) {
                lastError =
                    'Video Ops write API is not running on port 3021. Stop Studio and run `npm run studio` again.';
            }
        }
    }

    return { ok: false, error: lastError };
}

export { joinSayParagraphs };
