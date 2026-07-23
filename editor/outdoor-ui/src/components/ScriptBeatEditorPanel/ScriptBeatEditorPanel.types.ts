/** Types for ScriptBeatEditorPanel. */
import type { ReactNode } from 'react';
import type { LiveBeat, StyleKit } from '../../types';
import type { BeatTemplateConfig, BeatTemplateKind } from '../../types/beatStudio';

export type DraftBeat = {
  title: string;
  say: string;
  leanCode: string;
  turnCode: string;
  visualNotes: string;
};

export type ScriptBeatEditorPanelProps = {
  beats: LiveBeat[];
  drafts: DraftBeat[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onDraftChange: (index: number, patch: Partial<DraftBeat>) => void;
  onSaveBeat?: (index: number) => void;
  savingIndex?: number | null;
  readOnlyMeta?: boolean;
  /** Hide the beats list sidebar when a storyboard/overview already navigates beats. */
  hideBeatList?: boolean;
  /**
   * When true, render form content without an inner ScrollView / flex fill
   * so a parent screen can scroll Remotion + editor + storyboard together.
   */
  embedInParentScroll?: boolean;
  /** When set, beat fields use kit-aware visual layout instead of generic form. */
  styleKit?: StyleKit;
  beatTemplate?: BeatTemplateKind;
  templateConfig?: BeatTemplateConfig;
  onTemplateChange?: (kind: BeatTemplateKind) => void;
  onTemplateConfigChange?: (config: BeatTemplateConfig) => void;
  scriptId?: string;
  footer?: ReactNode;
};
