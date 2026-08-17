import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { colors, radii, typography } from '../../theme';
import type { PipelineVideoHandle, PipelineVideoProps } from './PipelineVideo.types';

export type { PipelineVideoHandle, PipelineVideoProps } from './PipelineVideo.types';

export const PipelineVideo = forwardRef<PipelineVideoHandle, PipelineVideoProps>(
  function PipelineVideo({ src, label, onTimeUpdate, tall = false, tallHeight = 420, reveal: _reveal }, ref) {
    const player = useVideoPlayer(src, (instance) => {
      instance.loop = false;
      instance.timeUpdateEventInterval = 0.25;
    });

    useImperativeHandle(
      ref,
      () => ({
        seekTo: (seconds: number) => {
          player.currentTime = Math.max(0, seconds);
        },
        play: () => {
          player.play();
        },
        getCurrentTime: () => player.currentTime,
      }),
      [player],
    );

    useEffect(() => {
      if (!onTimeUpdate) {
        return;
      }
      const subscription = player.addListener('timeUpdate', ({ currentTime }) => {
        onTimeUpdate(currentTime);
      });
      return () => {
        subscription.remove();
      };
    }, [onTimeUpdate, player]);

    return (
      <View style={[styles.wrap, tall ? styles.wrapTall : null]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <VideoView
          style={tall ? [styles.videoTall, { height: tallHeight, minHeight: tallHeight }] : styles.video}
          player={player}
          nativeControls
          contentFit="contain"
        />
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
  video: {
    width: '100%',
    height: 220,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  videoTall: {
    width: '100%',
    flex: 1,
    minHeight: 280,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
});
