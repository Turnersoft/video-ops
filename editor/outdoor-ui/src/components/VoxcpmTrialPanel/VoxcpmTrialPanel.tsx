import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { formatOutdoorApiError, OutdoorApiError } from '../../api/client';
import { Button } from '../../components/Button/Button';
import { SectionLabel } from '../../components/SectionLabel/SectionLabel';
import { VoxcpmServerLogs } from '../../components/VoxcpmServerLogs/VoxcpmServerLogs';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, sharedStyles, spacing, typography } from '../../theme';
import type { VideoOpsCatalogTake } from '../../types';

export type VoxcpmTrialPanelProps = {
  scriptId: string;
  takes: VideoOpsCatalogTake[];
  onTrialStarted: (takeId: string) => void;
};

export function VoxcpmTrialPanel({
  scriptId,
  takes,
  onTrialStarted,
}: VoxcpmTrialPanelProps) {
  const { api, invalidateAll } = useOutdoorUi();
  const referenceTakes = useMemo(
    () => takes.filter((take) => take.hasSourceVideo),
    [takes],
  );
  const [referenceTakeId, setReferenceTakeId] = useState<string>(
    () => referenceTakes[0]?.takeId ?? '',
  );
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voxcpmReady, setVoxcpmReady] = useState<boolean | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const health = await api.getVoxcpmHealth();
        if (!cancelled) {
          setVoxcpmReady(health.ok);
        }
      } catch {
        if (!cancelled) {
          setVoxcpmReady(false);
        }
      }
    };
    void check();
    const timer = setInterval(() => {
      void check();
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api]);

  useEffect(() => {
    if (!referenceTakeId && referenceTakes[0]?.takeId) {
      setReferenceTakeId(referenceTakes[0].takeId);
    }
  }, [referenceTakeId, referenceTakes]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setRunning(true);
    setStatus('Starting VoxCPM trial…');
    stopPolling();
    try {
      const response = await api.startVoxcpmTrial(scriptId, {
        referenceTakeId: referenceTakeId || undefined,
        renderComposite: true,
      });
      invalidateAll();
      setStatus(`Synthesizing voice (take ${response.takeId})…`);
      onTrialStarted(response.takeId);

      pollRef.current = setInterval(() => {
        void api.getJob(response.jobId).then((detail) => {
          const alignRunId = detail.job.selectedRuns.align;
          const alignProgress = alignRunId ? detail.progress.align : null;
          const compositeRun = (detail.job.runs.composite ?? []).find(
            (run) => run.runId === detail.job.selectedRuns.composite,
          );
          if (alignProgress?.message) {
            setStatus(alignProgress.message);
          }
          if (detail.job.status === 'review' && compositeRun?.status === 'succeeded') {
            stopPolling();
            setRunning(false);
            setStatus('Trial complete — open the new take to preview composite.');
            invalidateAll();
          } else if (detail.job.status === 'failed') {
            stopPolling();
            setRunning(false);
            const failure =
              detail.job.runs.align?.find((run) => run.status === 'failed') ??
              detail.job.runs.composite?.find((run) => run.status === 'failed');
            setError(failure?.error ?? 'VoxCPM trial failed');
            setStatus(null);
          }
        }).catch(() => {
          // ignore transient poll errors
        });
      }, 2500);
    } catch (startError) {
      setRunning(false);
      setStatus(null);
      const message = formatOutdoorApiError(startError);
      if (startError instanceof OutdoorApiError && startError.status === 404) {
        setError(
          `${message} — restart npm run outdoor:all on Mac so the agent loads the VoxCPM trial route.`,
        );
      } else if (startError instanceof OutdoorApiError && startError.status === 503) {
        setError(
          `${message} — run npm run outdoor:all on Mac and wait until VoxCPM is listening on :8791.`,
        );
      } else {
        setError(message);
      }
    }
  }, [
    api,
    invalidateAll,
    onTrialStarted,
    referenceTakeId,
    scriptId,
    stopPolling,
  ]);

  if (referenceTakes.length === 0) {
    return (
      <View style={sharedStyles.slideCard}>
        <SectionLabel>VoxCPM trial (no filming)</SectionLabel>
        <Text style={sharedStyles.mutedText}>
          Film at least one take first — VoxCPM clones your voice from that recording.
        </Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.slideCard}>
      <SectionLabel>VoxCPM trial (no filming)</SectionLabel>
      <Text style={sharedStyles.mutedText}>
        Assemble sentence-level narration from animation.md, reusing current voice clips, then
        render the finished Remotion preview — no camera required.
      </Text>
      <Text style={sharedStyles.cardMeta}>
        Reference voice: {referenceTakeId || referenceTakes[0]?.takeId}
      </Text>
      {voxcpmReady === false ? (
        <Text style={{ color: colors.offline, fontSize: typography.small }}>
          VoxCPM is not running on Mac (:8791). Run npm run outdoor:all and wait ~30s, then refresh.
        </Text>
      ) : voxcpmReady ? (
        <Text style={{ color: colors.online, fontSize: typography.small }}>
          VoxCPM server ready on :8791
        </Text>
      ) : null}
      {referenceTakes.length > 1 ? (
        <View style={{ gap: spacing.xs }}>
          {referenceTakes.map((take) => (
            <Button
              key={take.takeId}
              label={take.takeId === referenceTakeId ? `✓ ${take.takeId}` : take.takeId}
              variant={take.takeId === referenceTakeId ? 'primary' : 'default'}
              disabled={running}
              onPress={() => setReferenceTakeId(take.takeId)}
            />
          ))}
        </View>
      ) : null}
      <Button
        label={running ? 'Generating…' : 'Generate final VoxCPM preview'}
        variant="primary"
        disabled={running || voxcpmReady === false}
        onPress={() => {
          void handleGenerate();
        }}
      />
      {running ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator color={colors.orange} size="small" />
          <Text style={{ color: colors.online, fontSize: typography.small }}>{status}</Text>
        </View>
      ) : null}
      <VoxcpmServerLogs active={running} defaultOpen={running} />
      {!running && status ? (
        <Text style={{ color: colors.online, fontSize: typography.small }}>{status}</Text>
      ) : null}
      {error ? (
        <Text style={{ color: colors.offline, fontSize: typography.small }}>{error}</Text>
      ) : null}
    </View>
  );
}
