/** Types for InboxBanner. */

export type InboxBannerProps = {
  /**
   * `standalone` — bordered banner (default).
   * `embedded` — line rows only, for a shared floating dock.
   */
  variant?: 'standalone' | 'embedded';
  /** @deprecated Use variant="embedded". */
  docked?: boolean;
};
