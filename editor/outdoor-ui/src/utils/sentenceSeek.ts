import type { LiveBeat, VoxcpmEditorSentence } from '../types';
import {
  SCRIPT_DEFAULT_FPS,
  beatStartFrame,
} from './beatSeek';

/** Seconds from beat start to the given sentence (uses rendered durations when available). */
export function sentenceStartSecondsInBeat(
  sentences: VoxcpmEditorSentence[],
  sentenceIndex: number,
): number {
  let seconds = 0;
  for (let index = 0; index < sentenceIndex; index += 1) {
    const sentence = sentences[index];
    const duration =
      typeof sentence.durationSeconds === 'number' && sentence.durationSeconds > 0
        ? sentence.durationSeconds
        : 0;
    seconds += duration + Math.max(0, sentence.pauseAfterMs) / 1000;
  }
  return seconds;
}

/** Absolute Remotion frame where a sentence begins within the script timeline. */
export function sentenceStartFrame(
  beats: LiveBeat[],
  beatIndex: number,
  sentences: VoxcpmEditorSentence[],
  sentenceIndex: number,
  options?: { fps?: number; coverSeconds?: number },
): number {
  const fps = options?.fps ?? SCRIPT_DEFAULT_FPS;
  const beatFrame = beatStartFrame(beats, beatIndex, options);
  const offsetSeconds = sentenceStartSecondsInBeat(sentences, sentenceIndex);
  return beatFrame + Math.round(offsetSeconds * fps);
}
