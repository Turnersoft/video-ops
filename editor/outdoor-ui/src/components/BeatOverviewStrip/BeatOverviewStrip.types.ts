/** Types for BeatOverviewStrip. */
import type { StyleKit, LiveBeat } from '../../types';
import type { BeatStudioDocument } from '../../types/beatStudio';

export type BeatOverviewStripProps = {
  beats: LiveBeat[];
  styleKit: StyleKit;
  activeIndex: number;
  onSelect: (index: number) => void;
  beatStudio?: BeatStudioDocument | null;
};
