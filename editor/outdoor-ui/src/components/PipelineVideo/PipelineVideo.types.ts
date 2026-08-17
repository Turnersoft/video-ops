import type { TakeVideoRevealTarget } from '../../api/urls';

export type PipelineVideoHandle = {
  seekTo: (seconds: number) => void;
  play: () => void;
  getCurrentTime: () => number;
};

export type PipelineVideoProps = {
  src: string;
  label?: string;
  onTimeUpdate?: (currentTime: number) => void;
  /** Taller player for side-by-side cut studio / composite panes. */
  tall?: boolean;
  /** Explicit pixel height when tall (defaults to ~420). */
  tallHeight?: number;
  /** Reveal the backing file in macOS Finder via the local agent. */
  reveal?: TakeVideoRevealTarget;
};
