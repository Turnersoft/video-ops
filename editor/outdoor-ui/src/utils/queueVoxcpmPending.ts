import type { OutdoorApi } from '../api/client';
import type { VoxcpmEditorSentence } from '../types';

export function voxcpmSentenceNeedsRender(sentence: VoxcpmEditorSentence): boolean {
  if (sentence.hasLatestAudio || sentence.status === 'ready') {
    return false;
  }
  if (sentence.status === 'queued' || sentence.status === 'rendering') {
    return false;
  }
  return true;
}

/** Queue pending sentences in one beat, or every beat when beatIndex is omitted. */
export async function queueVoxcpmPendingSentences(
  api: OutdoorApi,
  scriptId: string,
  options: {
    referenceTakeId: string;
    beatIndex?: number;
    voiceEngine?: import('../utils/voiceEngine').VoiceEngineId;
    scriptLanguage?: import('../utils/scriptLanguage').ScriptLanguageId;
    force?: boolean;
  },
): Promise<{ queued: number }> {
  const doc = await api.getVoxcpmEditor(
    scriptId,
    options.referenceTakeId,
    options.voiceEngine,
    options.scriptLanguage,
  );
  const beats =
    typeof options.beatIndex === 'number'
      ? doc.beats.filter((beat) => beat.beatIndex === options.beatIndex)
      : doc.beats;
  const jobs: Array<{ beatIndex: number; sentenceId: string }> = [];
  for (const beat of beats) {
    for (const sentence of beat.sentences) {
      if (options.force || voxcpmSentenceNeedsRender(sentence)) {
        jobs.push({ beatIndex: beat.beatIndex, sentenceId: sentence.id });
      }
    }
  }
  if (jobs.length === 0) {
    return { queued: 0 };
  }
  await Promise.all(
    jobs.map((job) =>
      api.renderVoxcpmEditorSentence(
        scriptId,
        job.beatIndex,
        job.sentenceId,
        options.referenceTakeId,
        {
          voiceEngine: options.voiceEngine,
          scriptLanguage: options.scriptLanguage,
          force: options.force === true ? true : undefined,
        },
      ),
    ),
  );
  return { queued: jobs.length };
}
