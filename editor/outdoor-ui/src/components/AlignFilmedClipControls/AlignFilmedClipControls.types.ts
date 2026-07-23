/** Types for AlignFilmedClipControls. */
import type { AlignLayout } from '../../types';

export type AlignFilmedClipControlsProps = {
  beatIndex: number;
  beatTitle: string;
  layout: AlignLayout;
  busy: boolean;
  onSave: (next: AlignLayout) => Promise<void>;
};
