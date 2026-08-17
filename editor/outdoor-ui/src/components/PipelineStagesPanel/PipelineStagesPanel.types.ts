/** Types for PipelineStagesPanel. */
import type { PipelineSnapshot, PipelineStage } from '../../types';

export type PipelineStagesPanelProps = {
  jobId: string;
  onSnapshot?: (snapshot: PipelineSnapshot) => void;
  /** When set, only these stages are listed (e.g. VoxCPM synthetic takes). */
  visibleStages?: PipelineStage[];
  panelTitle?: string;
  hideFullPipelineRun?: boolean;
  stageLabels?: Partial<Record<PipelineStage, string>>;
  /** AI clone takes: block align rerun (would not re-voice safely) and clarify composite rerun. */
  voxcpmTake?: boolean;
};
