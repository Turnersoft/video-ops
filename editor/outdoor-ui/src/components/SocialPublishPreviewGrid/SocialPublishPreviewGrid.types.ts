/** Types for SocialPublishPreviewGrid. */
import type { PublishPlanPlatform, PublishState, ScriptCoversResponse } from '../../types';

export type SocialPreviewDraftCard = {
  group: 'headline' | 'english' | 'china';
  platform: string;
  title: string;
  body: string;
  titleOnly: boolean;
};

export type SocialPublishPreviewGridProps = {
  cards: SocialPreviewDraftCard[];
  scriptCovers: ScriptCoversResponse | null;
  /** Exact publish payload from agent — preferred over cards when present. */
  planPlatforms?: PublishPlanPlatform[] | null;
  publish?: PublishState | null;
  /** When false, only cover + title overlay are shown (caption hidden). */
  showCaptions?: boolean;
  /** Hide duplicate section heading when nested inside SocialPublishPreviewSection. */
  embedded?: boolean;
  emptyMessage?: string | null;
};
