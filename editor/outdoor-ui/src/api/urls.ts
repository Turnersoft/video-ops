import type { PipelineStage } from '../types';

/** Outdoor composites, or a studio script composition id (episode slug). */
export type RemotionCompositionPath =
  | 'video-outdoor-landscape'
  | 'video-outdoor-portrait'
  | (string & {});

const DEFAULT_REMOTION_ORIGIN = 'http://127.0.0.1:3000';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function joinBase(baseUrl: string, path: string): string {
  const root = normalizeBaseUrl(baseUrl);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return root ? `${root}${suffix}` : suffix;
}

/** Relative artifact path (same shape as outdoor_agent/web/app.js). */
export function artifactPath(
  scriptId: string,
  takeId: string,
  stage: PipelineStage | string,
  runId: string,
  fileName: string,
): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/artifacts/${encodeURIComponent(stage)}/${encodeURIComponent(runId)}/${encodeURIComponent(fileName)}`;
}

/** Absolute artifact URL against an agent base URL. */
export function artifactUrl(
  baseUrl: string,
  scriptId: string,
  takeId: string,
  stage: PipelineStage | string,
  runId: string,
  fileName: string,
): string {
  return joinBase(baseUrl, artifactPath(scriptId, takeId, stage, runId, fileName));
}

/** Relative path for Cut review preview (stabilized when available). */
export function cutReviewPreviewPath(
  review: {
    previewVideoUrl?: string | null;
    sourceVideoUrl?: string | null;
  },
  scriptId: string,
  takeId: string,
): string {
  return (
    review.previewVideoUrl ||
    review.sourceVideoUrl ||
    sourcePath(scriptId, takeId)
  );
}

/** Relative source video path (same shape as outdoor_agent/web/app.js). */
export function sourcePath(scriptId: string, takeId: string): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/source`;
}

/** POST endpoint to reveal the take source video in Finder (macOS agent only). */
export function sourceRevealPath(scriptId: string, takeId: string): string {
  return `${sourcePath(scriptId, takeId)}/reveal-in-finder`;
}

/** POST endpoint to reveal a take artifact in Finder (macOS agent only). */
export function artifactRevealPath(
  scriptId: string,
  takeId: string,
  stage: PipelineStage | string,
  runId: string,
  fileName: string,
): string {
  return `${artifactPath(scriptId, takeId, stage, runId, fileName)}/reveal-in-finder`;
}

export type TakeVideoRevealTarget =
  | { kind: 'source'; scriptId: string; takeId: string }
  | {
      kind: 'artifact';
      scriptId: string;
      takeId: string;
      stage: PipelineStage | string;
      runId: string;
      fileName: string;
    };

/** Parse a take video URL (relative or absolute) into a Finder reveal target. */
export function parseTakeVideoPath(relativeOrAbsolute: string): TakeVideoRevealTarget | null {
  let pathname = relativeOrAbsolute;
  try {
    if (/^https?:\/\//i.test(relativeOrAbsolute)) {
      pathname = new URL(relativeOrAbsolute).pathname;
    }
  } catch {
    return null;
  }

  const sourceMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/source$/);
  if (sourceMatch) {
    return {
      kind: 'source',
      scriptId: decodeURIComponent(sourceMatch[1]),
      takeId: decodeURIComponent(sourceMatch[2]),
    };
  }

  const artifactMatch = pathname.match(
    /^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)$/,
  );
  if (artifactMatch) {
    const [, scriptId, takeId, stage, runId, fileName] = artifactMatch.map(decodeURIComponent);
    return {
      kind: 'artifact',
      scriptId,
      takeId,
      stage,
      runId,
      fileName,
    };
  }

  return null;
}

export function revealTargetFromStageVideo(
  scriptId: string,
  takeId: string,
  video: {
    fileName?: string;
    stage?: PipelineStage | string;
    runId?: string | null;
    url: string;
  },
): TakeVideoRevealTarget | undefined {
  if (video.fileName && video.stage && video.runId) {
    return {
      kind: 'artifact',
      scriptId,
      takeId,
      stage: video.stage,
      runId: video.runId,
      fileName: video.fileName,
    };
  }
  return parseTakeVideoPath(video.url) ?? undefined;
}

/** Absolute source video URL against an agent base URL. */
export function sourceUrl(baseUrl: string, scriptId: string, takeId: string): string {
  return joinBase(baseUrl, sourcePath(scriptId, takeId));
}

export function seriesSharedAssetPath(seriesId: string, relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  return `/api/series/${encodeURIComponent(seriesId)}/shared/${clean}`;
}

export function seriesSharedAssetUrl(
  baseUrl: string,
  seriesId: string,
  relativePath: string,
): string {
  return joinBase(baseUrl, seriesSharedAssetPath(seriesId, relativePath));
}

export function jobArtifactPath(
  jobId: string,
  stage: PipelineStage | string,
  runId: string,
  fileName: string,
): string {
  return `/api/jobs/${encodeURIComponent(jobId)}/artifacts/${encodeURIComponent(stage)}/${encodeURIComponent(runId)}/${encodeURIComponent(fileName)}`;
}

export function jobArtifactUrl(
  baseUrl: string,
  jobId: string,
  stage: PipelineStage | string,
  runId: string,
  fileName: string,
): string {
  return joinBase(baseUrl, jobArtifactPath(jobId, stage, runId, fileName));
}

export function absoluteAgentUrl(baseUrl: string, relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  const root = normalizeBaseUrl(baseUrl);
  if (!root && typeof window !== 'undefined' && window.location?.origin) {
    const suffix = relativeOrAbsolute.startsWith('/') ? relativeOrAbsolute : `/${relativeOrAbsolute}`;
    return `${window.location.origin}${suffix}`;
  }
  return joinBase(baseUrl, relativeOrAbsolute);
}

function defaultPageHost(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return '127.0.0.1';
}

function isRemotionCompositionPath(pathname: string): boolean {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  return (
    clean === 'video-outdoor-landscape' ||
    clean === 'video-outdoor-portrait' ||
    /^[a-z0-9][a-z0-9-]*$/i.test(clean)
  );
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost';
}

/** Tailscale CGNAT range 100.64.0.0/10 */
function isTailscaleHost(host: string): boolean {
  return /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host);
}

/** Private LAN / iPhone hotspot (excludes Tailscale + loopback). */
function isPrivateLanHost(host: string): boolean {
  if (isLoopbackHost(host) || isTailscaleHost(host)) {
    return false;
  }
  const parts = host.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [a, b] = parts;
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

function isNgrokHost(host: string): boolean {
  return host.includes('ngrok');
}

/**
 * Rewrites Remotion Studio URLs for LAN/mobile iframes.
 * Prefer the same reachability as the agent page:
 *   localhost → 127.0.0.1:3000
 *   hotspot/LAN → pageHost:3000
 *   Tailscale page → Tailscale remotion
 * Only keep a dedicated remote remotion URL (ngrok/Tailscale) when the page itself is remote.
 */
export function remotionStudioEmbedUrl(
  preferredUrl: string | null | undefined,
  compositionPath: RemotionCompositionPath = 'video-outdoor-landscape',
  pageHost: string = defaultPageHost(),
): string {
  const fallback = `${DEFAULT_REMOTION_ORIGIN}/${compositionPath}`;
  const raw = (preferredUrl ?? fallback).trim();
  try {
    const url = new URL(raw, DEFAULT_REMOTION_ORIGIN);

    if (isLoopbackHost(pageHost)) {
      url.hostname = '127.0.0.1';
      url.port = '3000';
      url.protocol = 'http:';
    } else if (isPrivateLanHost(pageHost) || isTailscaleHost(pageHost)) {
      // Same machine/network as the agent page — don't keep a different Tailscale/ngrok remotion host.
      url.hostname = pageHost;
      url.port = '3000';
      url.protocol = 'http:';
    } else if (
      (url.protocol === 'https:' && isNgrokHost(url.hostname) && url.hostname !== pageHost) ||
      (url.protocol === 'http:' && isTailscaleHost(url.hostname) && url.hostname !== pageHost)
    ) {
      // Remote agent page with a dedicated remotion tunnel — keep host, swap composition only.
      if (!url.pathname || url.pathname === '/' || isRemotionCompositionPath(url.pathname)) {
        url.pathname = `/${compositionPath}`;
      }
      url.searchParams.set('outdoorEmbed', '1');
      return url.toString().replace(/\/+$/, '');
    } else if (pageHost) {
      url.hostname = pageHost;
      if (!url.port || url.port === '8788') {
        url.port = '3000';
      }
    }

    if (!url.pathname || url.pathname === '/' || isRemotionCompositionPath(url.pathname)) {
      url.pathname = `/${compositionPath}`;
    }
    // Composition canvas only — hide Studio narration overlay (editable script stays in standalone Studio).
    url.searchParams.set('outdoorEmbed', '1');
    return url.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

export function remotionStudioOrigin(studioUrl: string): string {
  try {
    return new URL(studioUrl).origin;
  } catch {
    return DEFAULT_REMOTION_ORIGIN;
  }
}
