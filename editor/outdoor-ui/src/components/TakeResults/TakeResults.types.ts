/** Types for TakeResults. */
import type { CutReviewPayload } from '../../types';
import type { AlignReviewPayload } from '../../types';
import type { OutdoorJob } from '../../types';
import type { CoversListResponse } from '../../types';
import type { PublishState } from '../../types';
import type { VideoOpsCatalogTake } from '../../types';

export type TakeResultsExtras = {
  cutReview?: CutReviewPayload | null;
  alignReview?: AlignReviewPayload | null;
  jobId?: string;
  job?: OutdoorJob | null;
  covers?: CoversListResponse | null;
  publish?: PublishState | null;
};

import type { JobResultsPreview } from '../../types';

export type TakeResultsProps = {
  scriptId: string;
  take: VideoOpsCatalogTake;
  results?: JobResultsPreview | null;
  extras?: TakeResultsExtras;
  /** Bump to soft-refresh finished stage previews without remounting. */
  refreshTick?: number;
};
