import type { DraftBeat } from "../ScriptBeatEditorPanel/ScriptBeatEditorPanel.types";
import type { LiveBeat, StyleKit } from "../../types";
import type { VoiceEngineId } from "../../utils/voiceEngine";

export type BeatEditorVisualPanelProps = {
  beat: LiveBeat;
  beats: LiveBeat[];
  draft: DraftBeat;
  beatIndex: number;
  styleKit: StyleKit;
  onDraftChange: (patch: Partial<DraftBeat>) => void;
  /** Fill the beat editor column (split desktop layout). */
  fillHeight?: boolean;
  scriptId?: string;
  voiceEngine?: VoiceEngineId;
  scriptLanguage?: import('../../utils/scriptLanguage').ScriptLanguageId;
  /** Fired when VoxCPM preview voice under export/voice was updated. */
  onPreviewAudioChanged?: () => void;
  onSeekPreviewFrame?: (
    frame: number,
    label: string,
    options?: import('../RemotionEmbed/RemotionEmbed.types').RemotionSeekOptions,
  ) => void;
  template?: BeatTemplateKind;
  templateConfig?: BeatTemplateConfig;
  onTemplateChange?: (kind: BeatTemplateKind) => void;
  onTemplateConfigChange?: (config: BeatTemplateConfig) => void;
};
