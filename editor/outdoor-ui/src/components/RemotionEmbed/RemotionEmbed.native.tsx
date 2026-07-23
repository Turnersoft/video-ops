import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radii, typography } from '../../theme';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import type { RemotionCompositionPath } from '../../api/urls';
import type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

function seekInjectScript(frame: number, compositionId: string): string {
  const safeFrame = Math.max(0, Math.round(frame));
  const safeId = JSON.stringify(compositionId);
  // Prefer Studio APIs directly; also postMessage for OutdoorAlignSeekBridge.
  return `(function(){
  var frame=${safeFrame};
  var compositionId=${safeId};
  try {
    if (typeof window.remotion_setFrame === 'function') {
      window.remotion_setFrame(frame, compositionId, 0);
    }
  } catch (e) {}
  try {
    window.postMessage({type:'turn-outdoor-align-seek',frame:frame,compositionId:compositionId},'*');
  } catch (e) {}
})();true;`;
}

export const RemotionEmbed = forwardRef<RemotionEmbedHandle, RemotionEmbedProps>(
  function RemotionEmbed(
    {
      url,
      fallbackText = 'Loading Remotion…',
    },
    ref,
  ) {
    const { api } = useOutdoorUi();
    const webViewRef = useRef<WebView | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const requestHeaders = api.requestHeaders();

    useImperativeHandle(
      ref,
      () => ({
        seekToFrame: (frame: number, nextCompositionId: RemotionCompositionPath) => {
          webViewRef.current?.injectJavaScript(
            seekInjectScript(frame, String(nextCompositionId)),
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
          domStorageEnabled
          allowsFullscreenVideo
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          // Let the parent AnimationEditor ScrollView own vertical scrolling.
          scrollEnabled={false}
          onLoadStart={() => {
            setLoaded(false);
            setLoadError(null);
          }}
          onLoadEnd={() => setLoaded(true)}
          onError={(event) => {
            setLoadError(event.nativeEvent.description || 'WebView failed to load Remotion');
          }}
        />
        {!loaded || loadError ? (
          <Text style={styles.fallback}>{loadError ?? fallbackText}</Text>
        ) : null}
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
