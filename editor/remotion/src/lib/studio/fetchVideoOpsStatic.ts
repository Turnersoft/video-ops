// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/fetchVideoOpsStatic.ts

import { videoOpsDevApiUrl } from '../studio/videoOpsDevApi';

function looksLikeHtml(text: string): boolean {
    const trimmed = text.trimStart().toLowerCase();
    return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

/** URL candidates for static assets (Remotion static hash, then dev API disk read). */
export function videoOpsStaticUrlCandidates(
    relativePath: string,
    staticFile: (path: string) => string,
): string[] {
    const clean = relativePath.replace(/^\/+/, '');
    const encodedPath = encodeURIComponent(clean);
    return [
        staticFile(clean),
        `/video_ops/api/static-file?path=${encodedPath}`,
        `${videoOpsDevApiUrl('/video_ops/api/static-file')}?path=${encodedPath}`,
    ];
}

export async function fetchVideoOpsStaticText(
    relativePath: string,
    staticFile: (path: string) => string,
    options?: { cacheBust?: number },
): Promise<string | null> {
    const bust = options?.cacheBust;
    for (const url of videoOpsStaticUrlCandidates(relativePath, staticFile)) {
        try {
            const fetchUrl = bust !== undefined ? `${url}${url.includes('?') ? '&' : '?'}v=${bust}` : url;
            const response = await fetch(fetchUrl, { cache: 'no-store' });
            if (!response.ok) {
                continue;
            }
            const text = await response.text();
            if (looksLikeHtml(text)) {
                continue;
            }
            return text;
        } catch {
            // Try next base path.
        }
    }
    return null;
}

export async function fetchVideoOpsStaticJson<T>(
    relativePath: string,
    staticFile: (path: string) => string,
    options?: { cacheBust?: number },
): Promise<T | null> {
    const raw = await fetchVideoOpsStaticText(relativePath, staticFile, options);
    if (!raw?.trim()) {
        return null;
    }
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}
