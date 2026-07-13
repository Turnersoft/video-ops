import { useCallback, useState } from 'react';

import { formatOutdoorApiError } from '../api/client';
import { useOutdoorUi } from '../context/OutdoorUiContext';

export function usePipelineAbort(jobId: string, onAborted?: () => void) {
  const { api, invalidateAll } = useOutdoorUi();
  const [aborting, setAborting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abort = useCallback(async () => {
    setAborting(true);
    setError(null);
    try {
      await api.cancelJob(jobId);
      onAborted?.();
      invalidateAll();
    } catch (abortError) {
      setError(formatOutdoorApiError(abortError));
    } finally {
      setAborting(false);
    }
  }, [api, invalidateAll, jobId, onAborted]);

  return { abort, aborting, error };
}
