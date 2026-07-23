import classes from './PipelineVideo.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';

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

    return (
      <View style={webModuleStyle(classes.wrap, tall ? classes.wrapTall : null)}>
        {label ? <Text style={webModuleStyle(classes.label)}>{label}</Text> : null}
        {createElement('video', {
          key: src,
          ref: videoRef,
          src,
          controls: true,
          preload: 'metadata',
          playsInline: true,
          className: tall ? classes.webVideoTall : classes.webVideo,
          style: tall ? { height: tallHeight, minHeight: tallHeight } : undefined,
          onError: () => {
            setLoadError('Video failed to load — open http://127.0.0.1:8788/ on Mac (not Expo ngrok).');
          },
          onLoadedData: () => {
            setLoadError(null);
          },
        })}
        {loadError ? <Text style={webModuleStyle(classes.error)}>{loadError}</Text> : null}
      </View>
    );
  },
);
