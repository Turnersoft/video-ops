import type { DraftBeat } from '../ScriptBeatEditorPanel/ScriptBeatEditorPanel.types';
import type { LiveBeat } from '../../types';
import type { RemotionSeekOptions } from '../RemotionEmbed/RemotionEmbed.types';
import type { VoiceEngineId } from '../../utils/voiceEngine';
import type { ScriptLanguageId } from '../../utils/scriptLanguage';

export type SpokenSentencesFieldProps = {
  scriptId: string;
  beatIndex: number;
  say: string;
  beats: LiveBeat[];
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
  onDraftChange: (patch: Partial<DraftBeat>) => void;
  /** Fired when Remotion-reachable beat voice was published/updated. */
  onPreviewAudioChanged?: () => void;
  onSeekPreviewFrame?: (
    frame: number,
    label: string,
    options?: RemotionSeekOptions,
  ) => void;
};
