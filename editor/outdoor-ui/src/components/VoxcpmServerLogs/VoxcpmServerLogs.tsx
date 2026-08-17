import classes from './VoxcpmServerLogs.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text } from 'react-native';

import { formatOutdoorApiError, OutdoorApiError } from '../../api/client';
import { CollapsibleSection } from '../CollapsibleSection/CollapsibleSection';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, typography } from '../../theme';

export type VoxcpmServerLogsProps = {
  active?: boolean;
  defaultOpen?: boolean;
  pollMs?: number;
};

function lastLogSummary(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  return lines[lines.length - 1] ?? 'Waiting for VoxCPM output…';
}

function isLogsEndpointMissing(error: unknown): boolean {
  if (error instanceof OutdoorApiError) {
    return error.status === 404;
  }
  const message = formatOutdoorApiError(error);
  return message.includes('Not found') || message.includes('404');
}

export function VoxcpmServerLogs({
  active = false,
  defaultOpen = true,
  pollMs = 1500,
}: VoxcpmServerLogsProps) {
  const { api } = useOutdoorUi();
  const [logs, setLogs] = useState('');
  const [error, setError] = useState<string | null>(null);
  const logsUnavailableRef = useRef(false);

  const loadLogs = useCallback(async () => {
    if (logsUnavailableRef.current) {
      return;
    }
    try {
      const result = await api.getVoxcpmLogs();
      const text =
        result.text ??
        (result.lines && result.lines.length > 0 ? result.lines.join('\n') : '');
      setLogs(text);
      setError(result.ok ? null : (result.error ?? 'VoxCPM server unreachable'));
    } catch (loadError) {
      if (isLogsEndpointMissing(loadError)) {
        logsUnavailableRef.current = true;
        setError('Restart npm run outdoor:all to enable VoxCPM server logs in the UI.');
        return;
      }
      setError(formatOutdoorApiError(loadError));
    }
  }, [api]);

  useEffect(() => {
    void loadLogs();
    if (!active || logsUnavailableRef.current) {
      return;
    }
    const timer = setInterval(() => {
      void loadLogs();
    }, pollMs);
    return () => clearInterval(timer);
  }, [active, loadLogs, pollMs]);

  const summary = useMemo(() => {
    if (error) {
      return error;
    }
    if (!logs.trim()) {
      return active ? 'Waiting for model load / inference…' : 'No VoxCPM server output yet';
    }
    return lastLogSummary(logs);
  }, [active, error, logs]);

  return (
    <CollapsibleSection
      title="VoxCPM server log"
      summary={summary}
      defaultOpen={defaultOpen || active}
    >
      {error ? (
        <Text style={{ color: colors.offline, fontSize: typography.small, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}
      <Text style={webModuleStyle(classes.logBox)} selectable>
        {logs.trim() ? logs : 'Model load, warm-up progress, and clone requests appear here.'}
      </Text>
    </CollapsibleSection>
  );
}
