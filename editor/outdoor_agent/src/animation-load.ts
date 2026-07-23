/**
 * Load compiled animation v4 — live compile from animation.md in dev, disk cache for offline/render.
 */
import path from 'node:path';

import { fileExists, readJson } from './fs_util.ts';
import { scriptDirFor } from './paths.ts';

const CACHE_REL = '.cache/animation-v4.json';
const REMOTION_DEV_API_ORIGIN = Deno.env.get('VIDEO_OPS_DEV_API_ORIGIN') ?? 'http://127.0.0.1:3021';

export type AnimationV4Doc = {
  title?: string;
  scenes?: Array<{
    title?: string;
    durationSeconds?: number;
    burnCaptions?: boolean;
    outdoorEdit?: unknown;
    compare?: {
      beats?: Array<{
        say?: string;
        sayZh?: string;
        visualNotes?: string;
        durationSeconds?: number;
        lean?: { code?: string; hints?: Array<{ text?: string }> };
        turn?: { code?: string; hints?: Array<{ text?: string }> };
      }>;
    };
    director?: {
      say?: string | string[];
      sayTimings?: number[];
      countdownSeconds?: number;
    };
  }>;
};

export function animationV4CachePath(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), CACHE_REL);
}

/** Compile animation.md on the Remotion dev API (real-time, no .cache read). */
export async function loadAnimationV4Live(scriptId: string): Promise<AnimationV4Doc | null> {
  try {
    const response = await fetch(
      `${REMOTION_DEV_API_ORIGIN}/video_ops/api/animation-v4?scriptId=${encodeURIComponent(scriptId)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as AnimationV4Doc;
  } catch {
    return null;
  }
}

/** Offline fallback — pre-synced .cache/animation-v4.json (render/export). */
export function loadAnimationV4(
  scriptId: string,
  _options: { warnLegacy?: boolean } = {},
): AnimationV4Doc | null {
  const cachePath = animationV4CachePath(scriptId);
  if (fileExists(cachePath)) {
    return readJson<AnimationV4Doc>(cachePath);
  }
  return null;
}

/** Prefer live compile; fall back to cache when dev API is unavailable. */
export async function resolveAnimationV4(scriptId: string): Promise<AnimationV4Doc | null> {
  const live = await loadAnimationV4Live(scriptId);
  if (live?.scenes?.length) {
    return live;
  }
  return loadAnimationV4(scriptId);
}
