/** Types for CompositeBlock. */
import type { OutdoorJob } from '../../types';
import type { StageResultPreview } from '../../types';

export type CompositeBlockProps = {
  jobId: string;
  job: OutdoorJob | null;
  stage?: StageResultPreview | null;
};
