import type { DraftBeat } from '../ScriptBeatEditorPanel/ScriptBeatEditorPanel.types';
import type { LiveBeat, StyleKit } from '../../types';
import type { BeatTemplateConfig, BeatTemplateKind } from '../../types/beatStudio';

export type BeatEditorVisualPanelProps = {
  beat: LiveBeat;
  draft: DraftBeat;
  beatIndex: number;
  styleKit: StyleKit;
  onDraftChange: (patch: Partial<DraftBeat>) => void;
  /** Fill the beat editor column (split desktop layout). */
  fillHeight?: boolean;
  scriptId?: string;
  template?: BeatTemplateKind;
  templateConfig?: BeatTemplateConfig;
  onTemplateChange?: (kind: BeatTemplateKind) => void;
  onTemplateConfigChange?: (config: BeatTemplateConfig) => void;
};
