/** Types for LocalTakeCard. */
import type { LocalTakeView } from '../../types';

export type LocalTakeCardProps = {
  take: LocalTakeView;
  exporting?: boolean;
  onExportToIcloud?: () => void;
};
