export type { AbortStageButtonProps } from './AbortStageButton.types';

import classes from './AbortStageButton.module.scss';
import type { AbortStageButtonProps } from './AbortStageButton.types';
import { Button } from '../Button/Button';
import { usePipelineAbort } from '../../hooks/usePipelineAbort';

export function AbortStageButton({
  jobId,
  visible = true,
  disabled = false,
  label = 'Abort',
  onAborted,
}: AbortStageButtonProps) {
  const { abort, aborting } = usePipelineAbort(jobId, onAborted);

  if (!visible) {
    return null;
  }

  return (
    <Button
      label={aborting ? 'Aborting…' : label}
      variant="primary"
      disabled={disabled || aborting}
      onPress={() => void abort()}
    />
  );
}
