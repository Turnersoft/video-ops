import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radii, typography } from '../theme';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import type { RemotionCompositionPath } from '../api/urls';
import type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export const RemotionEmbed = forwardRef<RemotionEmbedHandle, RemotionEmbedProps>(
  function RemotionEmbed(
    {
      url,
      fallbackText = 'Loading Remotion Studio… Start cd remotion && npm run studio:lan if blank, then hard-refresh.',
    },
    ref,
  ) {
    const { api } = useOutdoorUi();
    const webViewRef = useRef<WebView | null>(null);
    const requestHeaders = api.requestHeaders();

    useImperativeHandle(
      ref,
      () => ({
        seekToFrame: (frame: number, nextCompositionId: RemotionCompositionPath) => {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'turn-outdoor-align-seek',
              frame,
              compositionId: nextCompositionId,
            }),
          );
        },
      }),
      [],
    );

    return (
      <View style={styles.frame}>
        <WebView
          ref={webViewRef}
          source={{ uri: url, headers: requestHeaders }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
        />
        <Text style={styles.fallback}>{fallbackText}</Text>
      </View>
    );
  },
);

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
  webview: {
    flex: 1,
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
