/** Types for PublishPackSection. */
import type { PublishState, ScriptCoversResponse } from '../../types';
import type { SocialDraftCard } from '../../utils/socialDraftCards';

export type PublishPackSectionProps = {
  scriptId: string;
  cards: SocialDraftCard[];
  scriptCovers: ScriptCoversResponse | null;
  publish?: PublishState | null;
  onCoversChange: (covers: ScriptCoversResponse) => void;
};
