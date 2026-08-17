/** Types for CompositeBlock. */
import type { OutdoorJob } from '../../types';
import type { StageResultPreview } from '../../types';

export type CompositeBlockProps = {
  jobId: string;
  job: OutdoorJob | null;
  stage?: StageResultPreview | null;
  /** AI clone takes: composite rerun must not touch VoxCPM or align studio sync. */
  remotionPreviewOnly?: boolean;
};
