import type { BeatCandidate } from '../../types/beatStudio';

export type BeatCandidateRailProps = {
  candidates: BeatCandidate[];
  selectedCandidateId: string;
  onSelect: (candidateId: string) => void;
  onAdd?: () => void;
  /** Horizontal chip row (mobile) vs vertical strip beside the beat editor (browser). */
  layout?: 'horizontal' | 'vertical';
};
