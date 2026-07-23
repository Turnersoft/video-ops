/** Types for AbortStageButton. */
import type { ButtonProps } from '../Button/Button.types';

export type AbortStageButtonProps = {
  jobId: string;
  visible?: boolean;
  disabled?: boolean;
  label?: string;
  onAborted?: () => void;
};
