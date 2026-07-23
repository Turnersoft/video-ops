/** Types for StaleBanner. */

export type StaleBannerProps = {
  reason: string;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
};
