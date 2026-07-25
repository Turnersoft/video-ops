import type { ReactNode } from 'react';

import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { scaleCss } from '../../lib/layout/scaleCss';
import classes from './BeatNumberBadge.module.scss';

export type BeatNumberBadgeProps = {
  /** Zero-based active beat index. */
  beatIndex: number;
  /** Total beats when known — shows "3 / 11"; omit for "Beat 3". */
  beatCount?: number;
};

/** Top-right beat index — Inter, shared by landscape and portrait. */
export function BeatNumberBadge({
  beatIndex,
  beatCount,
}: BeatNumberBadgeProps): ReactNode {
  const s = useCompositionScale();
  const n = Math.max(1, beatIndex + 1);
  const label =
    beatCount && beatCount > 0 ? `${n} / ${beatCount}` : `Beat ${n}`;

  return (
    <div
      className={classes.badge}
      style={{
        ...scaleCss(s.scale),
        top: s.px(18),
        right: s.px(18),
        fontSize: s.px(22),
        padding: `${s.px(6)}px ${s.px(12)}px`,
        borderRadius: s.px(999),
      }}
    >
      {label}
    </div>
  );
}
