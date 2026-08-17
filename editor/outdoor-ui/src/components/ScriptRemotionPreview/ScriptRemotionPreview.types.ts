/** Types for ScriptRemotionPreview. */

import type { OutdoorPreviewFormat } from '../../utils/animationMdFormat';

import type { RemotionSeekOptions } from '../RemotionEmbed/RemotionEmbed.types';

export type ScriptRemotionPreviewHandle = {
  seekToFrame: (frame: number, options?: RemotionSeekOptions) => void;
};

export type ScriptRemotionPreviewProps = {
  scriptId: string;
  /** Bump after save/sync so the iframe reloads if Studio composition list was stale. */
  revision?: number;
  /** Side-by-side beat editor — keep preview shorter so the row fits the viewport. */
  layoutVariant?: 'default' | 'split';
  /** Matches animation.md width/height — drives preview frame aspect ratio. */
  previewFormat?: OutdoorPreviewFormat;
};
