/** Types for TakeCard. */
import type { InboxFileSighting } from '../../types';
import type { VideoOpsCatalogTake } from '../../types';

export type TakeCardProps = {
  scriptId: string;
  take: VideoOpsCatalogTake;
  ingest?: InboxFileSighting | null;
};
