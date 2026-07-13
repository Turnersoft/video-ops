// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/types.ts
import type { VideoFromScriptRenderProps } from './lib/renderProps';

export type PipPosition =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';

export type PictureInPictureConfig = {
    src: string;
    position?: PipPosition;
    widthFraction?: number;
    startFrom?: number;
    endAt?: number;
    borderRadius?: number;
    opacity?: number;
};

export type LoadedSlide = VideoFromScriptRenderProps['scenes'][number];

export type RemotionProjectConfig = {
    format: 'short' | 'landscape' | 'long';
    fps: number;
    width: number;
    height: number;
    scenes: LoadedSlide[];
};

export type VideoFromScriptInputProps = {
    scriptId: string;
};
