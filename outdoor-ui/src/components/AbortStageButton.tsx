import { Button } from './ui/Button';
import { usePipelineAbort } from '../hooks/usePipelineAbort';

export type AbortStageButtonProps = {
  jobId: string;
  visible?: boolean;
  disabled?: boolean;
  label?: string;
  onAborted?: () => void;
};

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
