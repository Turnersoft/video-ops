import { createElement, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../theme';
import type { RemotionCompositionPath } from '../api/urls';
import type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export const RemotionEmbed = forwardRef<RemotionEmbedHandle, RemotionEmbedProps>(
  function RemotionEmbed(
    {
      url,
      title = 'Remotion Studio outdoor',
      studioOrigin,
      compositionId = 'video-outdoor-landscape',
      fallbackText = 'Loading Remotion Studio… Start cd remotion && npm run studio:lan if blank, then hard-refresh.',
    },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const origin = studioOrigin ?? deriveOrigin(url);

    useImperativeHandle(
      ref,
      () => ({
        seekToFrame: (frame: number, nextCompositionId: RemotionCompositionPath) => {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'turn-outdoor-align-seek',
              frame,
              compositionId: nextCompositionId,
            },
            origin,
          );
        },
      }),
      [origin],
    );

    return (
      <View style={styles.frame}>
        {createElement('iframe', {
          ref: iframeRef,
          src: url,
          title,
          style: styles.iframe,
          allow: 'autoplay; clipboard-write; fullscreen',
        })}
        <Text style={styles.fallback}>{fallbackText}</Text>
      </View>
    );
  },
);

function deriveOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'http://127.0.0.1:3000';
  }
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: colors.black,
  },
  fallback: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    color: colors.muted,
    fontSize: typography.tiny,
    pointerEvents: 'none',
  },
});
