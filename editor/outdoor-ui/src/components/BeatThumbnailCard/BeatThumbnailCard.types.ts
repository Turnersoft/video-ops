/** Types for BeatThumbnailCard. */
import type { StyleKit } from '../../types';
import type { LiveBeat } from '../../types';
import type { BeatTemplateKind } from '../../types/beatStudio';

export type BeatThumbnailCardProps = {
  beat: LiveBeat;
  styleKit: StyleKit;
  /** Selected beat-studio template — drives the preview badge (Compare, Turn, …). */
  template?: BeatTemplateKind;
  active?: boolean;
  onPress?: () => void;
  compact?: boolean;
  candidateBadge?: string;
};
