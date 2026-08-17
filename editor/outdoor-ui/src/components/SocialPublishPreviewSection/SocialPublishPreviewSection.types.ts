/** Types for SocialPublishPreviewSection. */
import type { PublishState } from '../../types';

export type SocialPublishPreviewSectionProps = {
  scriptId: string;
  jobId: string;
  publish?: PublishState | null;
};
