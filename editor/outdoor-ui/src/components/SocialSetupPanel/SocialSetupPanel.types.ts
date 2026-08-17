/** Types for SocialSetupPanel. */
import type { CoversListResponse } from '../../types';
import type { PublishState } from '../../types';
import type { SocialPosts } from '../../types';

export type SocialSetupPanelProps = {
  jobId: string;
  scriptId: string;
  social?: SocialPosts | null;
  status?: string;
  covers?: CoversListResponse | null;
  publish?: PublishState | null;
};
