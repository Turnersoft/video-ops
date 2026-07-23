/** Types for CutReviewPanel. */
import type { CutReviewPayload } from '../../types';

export type CutReviewPanelProps = {
  jobId: string;
  scriptId: string;
  takeId: string;
  /** Parent reloads cut review after pipeline changes — keeps stale banners in sync. */
  reviewFromParent?: CutReviewPayload | null;
  /** Parent hides Align/Composite/Social and shows progress while rebuild runs. */
  onRebuildPhase?: (phase: string | null) => void;
};
