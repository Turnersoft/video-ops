import { AbsoluteFill, Img, interpolate, staticFile, useVideoConfig } from 'remotion';
import classes from './BeatStickersOverlay.module.scss';

import type { VideoOpsBeatSticker } from '../../lib/compile/video-ops/videoOpsAnimationBeats.ts';
import { staticPathForScriptAsset } from '../../lib/assets/scriptAssetPath';

type BeatStickersOverlayProps = {
  scriptId: string;
  stickers: VideoOpsBeatSticker[];
  beatRelativeSeconds: number;
};

const PRESET: Record<VideoOpsBeatSticker['position'], { x: number; y: number }> = {
  'top-left': { x: 0.06, y: 0.08 },
  'top-right': { x: 0.72, y: 0.08 },
  'bottom-left': { x: 0.06, y: 0.72 },
  'bottom-right': { x: 0.72, y: 0.72 },
  center: { x: 0.38, y: 0.4 },
};

function stickerPosition(sticker: VideoOpsBeatSticker): { left: string; top: string; width: string } {
  const x = sticker.x ?? PRESET[sticker.position].x;
  const y = sticker.y ?? PRESET[sticker.position].y;
  const width = `${Math.round((sticker.width ?? (sticker.assetPath ? 0.22 : 0.28)) * 100)}%`;
  return {
    left: `${Math.round(x * 100)}%`,
    top: `${Math.round(y * 100)}%`,
    width,
  };
}

export function BeatStickersOverlay({
  scriptId,
  stickers,
  beatRelativeSeconds,
}: BeatStickersOverlayProps) {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill className={classes.overlay}>
      {stickers.map((sticker) => {
        const start = sticker.atSeconds;
        const end = start + sticker.durationSeconds;
        if (beatRelativeSeconds < start || beatRelativeSeconds >= end) {
          return null;
        }
        const localFrame = (beatRelativeSeconds - start) * fps;
        const fadeIn = interpolate(localFrame, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const fadeOut = interpolate(
          (end - beatRelativeSeconds) * fps,
          [0, 10],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const opacity = fadeIn * fadeOut;
        const pos = stickerPosition(sticker);
        return (
          <div
            key={sticker.id}
            className={classes.sticker}
            style={{
              left: pos.left,
              top: pos.top,
              width: pos.width,
              opacity,
              transform: `scale(${interpolate(localFrame, [0, 10], [0.92, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })})`,
            }}
          >
            {sticker.emoji ? <span className={classes.emoji}>{sticker.emoji}</span> : null}
            {sticker.assetPath ? (
              <Img
                src={staticFile(staticPathForScriptAsset(scriptId, sticker.assetPath))}
                className={classes.image}
              />
            ) : null}
            {sticker.text?.trim() ? <span className={classes.text}>{sticker.text}</span> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
