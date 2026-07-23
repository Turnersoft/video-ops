/** Types for StabilizePanel. */
import type { StageResultPreview } from '../../types';

export type StabilizePanelProps = {
  jobId: string;
  scriptId: string;
  takeId: string;
  hasSourceVideo: boolean;
  stage: StageResultPreview;
  onPipelineChange?: () => void;
};
