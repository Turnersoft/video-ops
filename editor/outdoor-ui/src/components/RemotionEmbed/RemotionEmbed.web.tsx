import classes from './RemotionEmbed.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { RemotionCompositionPath } from '../../api/urls';
import type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export type { RemotionEmbedHandle, RemotionEmbedProps } from './RemotionEmbed.types';

export const RemotionEmbed = forwardRef<RemotionEmbedHandle, RemotionEmbedProps>(
  function RemotionEmbed(
    {
      url,
      title = 'Remotion Studio outdoor',
      studioOrigin,
      compositionId = 'video-outdoor-landscape',
      fallbackText = 'Loading Remotion…',
    },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const origin = studioOrigin ?? deriveOrigin(url);

    useEffect(() => {
      setLoaded(false);
      setLoadError(null);
    }, [url]);

    useImperativeHandle(
      ref,
      () => ({
        seekToFrame: (frame: number, nextCompositionId: RemotionCompositionPath) => {
          const iframe =
            iframeRef.current ??
            (typeof document !== 'undefined'
              ? (Array.from(document.querySelectorAll('iframe')).find(
                  (node) => node.title === title,
                ) as HTMLIFrameElement | undefined) ?? null
              : null);
          const targetOrigin = (() => {
            try {
              return iframe?.src ? new URL(iframe.src).origin : origin;
            } catch {
              return origin;
            }
          })();
          iframe?.contentWindow?.postMessage(
            {
              type: 'turn-outdoor-align-seek',
              frame,
              compositionId: nextCompositionId,
            },
            targetOrigin,
          );
        },
      }),
      [origin, title],
    );

    return (
      <View style={webModuleStyle(classes.frame)}>
        {createElement('iframe', {
          ref: iframeRef,
          src: url,
          title,
          className: classes.iframe,
          allow: 'autoplay; clipboard-write; fullscreen',
          onLoad: () => setLoaded(true),
          onLoadStart: () => {
            setLoaded(false);
            setLoadError(null);
          },
          onError: () => setLoadError('Remotion preview failed to load.'),
        })}
        {!loaded || loadError ? (
          <Text style={webModuleStyle(classes.fallback)}>{loadError ?? fallbackText}</Text>
        ) : null}
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
