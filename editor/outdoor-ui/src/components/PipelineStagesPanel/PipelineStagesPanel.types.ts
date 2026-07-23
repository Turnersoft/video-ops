/** Types for PipelineStagesPanel. */
import type { PipelineSnapshot } from '../../types';

export type PipelineStagesPanelProps = {
  jobId: string;
  onSnapshot?: (snapshot: PipelineSnapshot) => void;
};
