import type { OutdoorLayout } from '../layout';
import type { OutdoorPreviewFormat } from './animationMdFormat';

/** Landscape preview frame width = height × 8/9. */
export const PREVIEW_WIDTH_FROM_HEIGHT = 8 / 9;
export const PREVIEW_HEIGHT_FROM_WIDTH = 9 / 8;
/** Portrait preview frame width = height × 9/16. */
export const PREVIEW_PORTRAIT_WIDTH_FROM_HEIGHT = 9 / 16;
export const PREVIEW_PORTRAIT_HEIGHT_FROM_WIDTH = 16 / 9;
/** Full-width preview (no beat editor beside it). */
export const PREVIEW_HEIGHT_VH_BROWSER = 0.6;
/** Side-by-side with beat editor — upper cap; viewport reservation may shrink further. */
export const PREVIEW_HEIGHT_VH_SPLIT = 0.55;
/** Minimum frame height (browser). */
export const PREVIEW_MIN_FRAME_HEIGHT = 180;
export const PREVIEW_MIN_FRAME_HEIGHT_SPLIT = 240;
/** Mobile: max frame height as fraction of viewport (scroll wraps extra chrome). */
export const PREVIEW_HEIGHT_VH_MOBILE_CAP = 0.9;
/**
 * Space reserved below the split preview row: app header, storyboard strip,
 * AI dock, padding, and status lines.
 */
export const SPLIT_DESKTOP_RESERVED_PX = 400;

export type ScriptRemotionPreviewLayout = {
  width: number;
  height: number;
  /** Total block height (matches frame when no header chrome). */
  blockHeight: number;
};

export function computeScriptRemotionPreviewSize(
  windowHeight: number,
  windowWidth: number,
  layout: OutdoorLayout,
  layoutVariant: 'default' | 'split' = 'default',
  previewFormat: OutdoorPreviewFormat = 'landscape',
): ScriptRemotionPreviewLayout {
  const isPortrait = previewFormat === 'portrait';
  const widthFromHeight = isPortrait
    ? PREVIEW_PORTRAIT_WIDTH_FROM_HEIGHT
    : PREVIEW_WIDTH_FROM_HEIGHT;
  const heightFromWidth = isPortrait
    ? PREVIEW_PORTRAIT_HEIGHT_FROM_WIDTH
    : PREVIEW_HEIGHT_FROM_WIDTH;

  if (layout === 'mobile') {
    const width = Math.max(240, windowWidth - 24);
    const height = Math.round(width * heightFromWidth);
    const frameHeight = Math.min(height, Math.round(windowHeight * PREVIEW_HEIGHT_VH_MOBILE_CAP));
    return {
      width,
      height: frameHeight,
      blockHeight: frameHeight,
    };
  }

  const heightRatio =
    layoutVariant === 'split' ? PREVIEW_HEIGHT_VH_SPLIT : PREVIEW_HEIGHT_VH_BROWSER;
  const minFrameHeight =
    layoutVariant === 'split' ? PREVIEW_MIN_FRAME_HEIGHT_SPLIT : PREVIEW_MIN_FRAME_HEIGHT;
  const fromVh = Math.round(windowHeight * heightRatio);
  const fromViewport =
    layoutVariant === 'split'
      ? windowHeight - SPLIT_DESKTOP_RESERVED_PX
      : fromVh;
  const height = Math.max(minFrameHeight, Math.min(fromVh, fromViewport));
  const width = Math.round(height * widthFromHeight);
  return {
    width,
    height,
    blockHeight: height,
  };
}
