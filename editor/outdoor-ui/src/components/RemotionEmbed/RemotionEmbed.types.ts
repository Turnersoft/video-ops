import type { RemotionCompositionPath } from '../../api/urls';

export type RemotionSeekOptions = {
  /** When true, resume Studio playback if it was playing before the seek. */
  resumePlayback?: boolean;
};

export type RemotionEmbedHandle = {
  seekToFrame: (
    frame: number,
    compositionId: RemotionCompositionPath,
    options?: RemotionSeekOptions,
  ) => void;
};

export type RemotionEmbedProps = {
  url: string;
  title?: string;
  studioOrigin?: string;
  compositionId?: RemotionCompositionPath;
  fallbackText?: string;
};
