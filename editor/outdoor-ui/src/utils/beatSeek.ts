import type { LiveBeat } from '../types';

/** Must match `VIDEO_OPS_COVER_SECONDS` in basic_ui turn-video. */
export const SCRIPT_COVER_SECONDS = 4;

/** Default Remotion fps for script compositions. */
export const SCRIPT_DEFAULT_FPS = 30;

/**
 * Absolute Remotion frame where a beat begins (after cover card).
 * Uses authored `durationSeconds` on earlier beats (same timeline as sayTimings).
 */
export function beatStartFrame(
  beats: LiveBeat[],
  beatIndex: number,
  options?: { fps?: number; coverSeconds?: number },
): number {
  const fps = options?.fps ?? SCRIPT_DEFAULT_FPS;
  const coverSeconds = options?.coverSeconds ?? SCRIPT_COVER_SECONDS;
  const clamped = Math.min(Math.max(beatIndex, 0), Math.max(beats.length - 1, 0));
  let seconds = coverSeconds;
  for (let index = 0; index < clamped; index += 1) {
    const duration = beats[index]?.durationSeconds;
    seconds += typeof duration === 'number' && duration > 0 ? duration : 6;
  }
  return Math.max(0, Math.round(seconds * fps));
}
