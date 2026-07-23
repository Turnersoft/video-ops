import type { RemotionCompositionPath } from '../../api/urls';

export type RemotionEmbedHandle = {
  seekToFrame: (frame: number, compositionId: RemotionCompositionPath) => void;
};

export type RemotionEmbedProps = {
  url: string;
  title?: string;
  studioOrigin?: string;
  compositionId?: RemotionCompositionPath;
  fallbackText?: string;
};
