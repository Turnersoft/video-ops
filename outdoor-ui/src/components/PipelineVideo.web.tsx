import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../theme';
import type { PipelineVideoHandle, PipelineVideoProps } from './PipelineVideo.types';

export type { PipelineVideoHandle, PipelineVideoProps } from './PipelineVideo.types';

export const PipelineVideo = forwardRef<PipelineVideoHandle, PipelineVideoProps>(
  function PipelineVideo({ src, label, onTimeUpdate, tall = false, tallHeight = 420 }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        seekTo: (seconds: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, seconds);
          }
        },
        play: () => {
          void videoRef.current?.play();
        },
        getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      }),
      [],
    );

    useEffect(() => {
      setLoadError(null);
      const video = videoRef.current;
      if (!video) {
        return;
      }
      video.load();
    }, [src]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !onTimeUpdate) {
        return;
      }
      const handleTimeUpdate = () => {
        onTimeUpdate(video.currentTime);
      };
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }, [onTimeUpdate, src]);

    const videoStyle = tall
      ? { ...styles.webVideoTall, height: tallHeight, minHeight: tallHeight }
      : styles.webVideo;

    return (
      <View style={[styles.wrap, tall ? styles.wrapTall : null]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {createElement('video', {
          key: src,
          ref: videoRef,
          src,
          controls: true,
          preload: 'metadata',
          playsInline: true,
          style: videoStyle,
          onError: () => {
            setLoadError('Video failed to load — open http://127.0.0.1:8788/ on Mac (not Expo ngrok).');
          },
          onLoadedData: () => {
            setLoadError(null);
          },
        })}
        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  wrapTall: {
    flex: 1,
    minHeight: 0,
  },
  label: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  error: {
    color: colors.orange,
    fontSize: typography.tiny,
  },
  webVideo: {
    width: '100%',
    height: 220,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    objectFit: 'contain',
  },
  webVideoTall: {
    width: '100%',
    flexGrow: 1,
    minHeight: 360,
    height: 420,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    objectFit: 'contain',
  },
});
