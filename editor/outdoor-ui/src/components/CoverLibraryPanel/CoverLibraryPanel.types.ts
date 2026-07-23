/** Types for CoverLibraryPanel. */
import type { CoversListResponse } from '../../types';

export type CoverLibraryPanelProps = {
  jobId: string;
  covers: CoversListResponse | null;
  englishPlatforms: string[];
  chinaPlatforms: string[];
  onCoversChange: (covers: CoversListResponse) => void;
};
