import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatOutdoorApiError } from '../api/client';
import { AbortStageButton } from './AbortStageButton';
import { Button } from './ui/Button';
import { CollapsibleSection } from './ui/CollapsibleSection';
import { StageErrorBlock } from './StageErrorBlock';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import { colors, sharedStyles, spacing, typography } from '../theme';
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type PipelineSnapshot,
  type PipelineStage,
  type RunStatus,
} from '../types';
import { stableFingerprint } from '../utils/stableFingerprint';

const FAST_POLL_MS = 1500;
const IDLE_POLL_MS = 8000;

function statusColor(status: RunStatus | 'pending', stale?: boolean): string {
  if (stale && status === 'succeeded') {
    return colors.orange;
  }
  switch (status) {
    case 'running':
      return colors.orange;
    case 'succeeded':
      return colors.online;
    case 'failed':
      return colors.offline;
    case 'cancelled':
      return colors.muted;
    default:
      return colors.muted;
  }
}

function jobStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    case 'review':
      return 'Review';
    case 'ingested':
      return 'Ingested';
    case 'published':
      return 'Published';
    default:
      return status;
  }
}

function stageStatusLabel(status: RunStatus | 'pending', stale?: boolean): string {
  if (stale && status === 'succeeded') {
    return 'Outdated';
  }
  switch (status) {
    case 'running':
      return 'Running';
    case 'succeeded':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Aborted';
    case 'pending':
      return 'Waiting';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function logLineCount(text: string | null | undefined): number {
  if (!text?.trim()) {
    return 0;
  }
  return text.split('\n').filter((line) => line.trim()).length;
}

function previousStageSucceeded(
  snapshot: PipelineSnapshot,
  stage: PipelineStage,
): boolean {
  const index = PIPELINE_STAGES.indexOf(stage);
  if (index <= 0) {
    return true;
  }
  const previous = PIPELINE_STAGES[index - 1];
  const entry = snapshot.stages.find((item) => item.stage === previous);
  return entry?.status === 'succeeded';
}

function canRunPendingStage(snapshot: PipelineSnapshot, stage: PipelineStage): boolean {
  const entry = snapshot.stages.find((item) => item.stage === stage);
  if (!entry || entry.status !== 'pending') {
    return false;
  }
  return previousStageSucceeded(snapshot, stage);
}

function pipelineSummary(snapshot: PipelineSnapshot): string {
  return snapshot.stages
    .map((entry) => {
      const label = STAGE_LABELS[entry.stage];
      const status = entry.status ?? 'pending';
      if (status === 'succeeded') {
        return `${label} ✓`;
      }
      if (status === 'running') {
        return `${label}…`;
      }
      if (status === 'failed') {
        return `${label} failed`;
      }
      if (status === 'pending' && canRunPendingStage(snapshot, entry.stage)) {
        return `${label} — not run`;
      }
      return null;
    })
    .filter(Boolean)
    .join(' · ');
}

function shortMessage(text: string | undefined, max = 120): string | null {
  if (!text?.trim()) {
    return null;
  }
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

function snapshotUiKey(snapshot: PipelineSnapshot): string {
  return stableFingerprint({
    jobStatus: snapshot.jobStatus,
    failedStage: snapshot.failedStage,
    failureTitle: snapshot.failureTitle,
    failureMessage: snapshot.failureMessage,
    failureHint: snapshot.failureHint,
    agentLogTail: snapshot.agentLogTail,
    stages: snapshot.stages.map((stage) => ({
      stage: stage.stage,
      status: stage.status,
      runId: stage.runId,
      percent: stage.progress?.percent,
      message: stage.progress?.message,
      logTail: stage.logTail,
      errorTitle: stage.errorTitle,
      error: stage.error,
      stale: stage.stale,
      staleReason: stage.staleReason,
    })),
  });
}

export type PipelineStagesPanelProps = {
  jobId: string;
  onSnapshot?: (snapshot: PipelineSnapshot) => void;
};

export function PipelineStagesPanel({ jobId, onSnapshot }: PipelineStagesPanelProps) {
  const { api } = useOutdoorUi();
  const [snapshot, setSnapshot] = useState<PipelineSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aborting, setAborting] = useState(false);
  const [rerunning, setRerunning] = useState<PipelineStage | 'pipeline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onSnapshotRef = useRef(onSnapshot);
  const snapshotKeyRef = useRef('');
  onSnapshotRef.current = onSnapshot;

  const load = useCallback(async () => {
    try {
      const next = await api.getPipelineSnapshot(jobId);
      const key = snapshotUiKey(next);
      if (key !== snapshotKeyRef.current) {
        snapshotKeyRef.current = key;
        setSnapshot(next);
      }
      onSnapshotRef.current?.(next);
      setError(null);
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [api, jobId]);

  const pipelineActive = useMemo(() => {
    if (!snapshot) {
      return false;
    }
    if (snapshot.jobStatus === 'running' || snapshot.jobStatus === 'queued') {
      return true;
    }
    return snapshot.stages.some((stage) => stage.status === 'running');
  }, [snapshot]);

  useEffect(() => {
    snapshotKeyRef.current = '';
    void load();
  }, [load]);

  useEffect(() => {
    const intervalMs = pipelineActive ? FAST_POLL_MS : IDLE_POLL_MS;
    const timer = setInterval(() => {
      void load();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [load, pipelineActive]);

  const handleAbort = useCallback(async () => {
    setAborting(true);
    try {
      const result = await api.cancelJob(jobId);
      snapshotKeyRef.current = snapshotUiKey(result.snapshot);
      setSnapshot(result.snapshot);
      onSnapshotRef.current?.(result.snapshot);
      setError(null);
    } catch (abortError) {
      setError(formatOutdoorApiError(abortError));
    } finally {
      setAborting(false);
    }
  }, [api, jobId]);

  const handleRerunPipeline = useCallback(async () => {
    setRerunning('pipeline');
    try {
      await api.runPipeline(jobId, { rerun: true });
      setError(null);
      await load();
    } catch (rerunError) {
      setError(formatOutdoorApiError(rerunError));
    } finally {
      setRerunning(null);
    }
  }, [api, jobId, load]);

  const handleRerunStage = useCallback(
    async (stage: PipelineStage) => {
      setRerunning(stage);
      try {
        await api.runStage(jobId, stage, { rerun: true });
        setError(null);
        await load();
      } catch (rerunError) {
        setError(formatOutdoorApiError(rerunError));
      } finally {
        setRerunning(null);
      }
    },
    [api, jobId, load],
  );

  const controlsDisabled = pipelineActive || aborting || rerunning !== null;
  const pipelineNeverRan = useMemo(() => {
    if (!snapshot) {
      return false;
    }
    return snapshot.stages.every((entry) => entry.status === 'pending');
  }, [snapshot]);

  if (loading && !snapshot) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (!snapshot) {
    return error ? <Text style={styles.error}>{error}</Text> : null;
  }

  return (
    <View style={styles.wrap}>
      <CollapsibleSection
        title="Mac pipeline & logs"
        summary={`Job ${jobStatusLabel(snapshot.jobStatus)} · ${pipelineSummary(snapshot)}`}
        defaultOpen={pipelineActive}
      >
        {snapshot.failureTitle && snapshot.failureMessage ? (
          <View style={styles.failureBanner}>
            <Text style={styles.failureTitle}>
              {snapshot.failedStage ? `${STAGE_LABELS[snapshot.failedStage]} — ` : ''}
              {snapshot.failureTitle}
            </Text>
            <Text style={styles.failureMessage}>{snapshot.failureMessage}</Text>
            {snapshot.failureHint ? (
              <Text style={styles.failureHint}>{snapshot.failureHint}</Text>
            ) : null}
          </View>
        ) : null}

        {PIPELINE_STAGES.map((stage: PipelineStage) => {
          const entry = snapshot.stages.find((item) => item.stage === stage);
          if (!entry) {
            return null;
          }
          const status = entry.status ?? 'pending';
          const progress = entry.progress;
          const detail =
            status === 'running'
              ? shortMessage(progress?.message)
              : null;
          const percent =
            status === 'running' && typeof progress?.percent === 'number'
              ? `${Math.round(progress.percent)}%`
              : null;
          const logTail = entry.logTail ?? null;
          const canRunStage =
            !controlsDisabled &&
            status !== 'running' &&
            (status !== 'pending' || canRunPendingStage(snapshot, stage));
          const stageActionLabel =
            status === 'pending' ? 'Run' : 'Rerun';
          const stageRerunning = rerunning === stage;

          return (
            <View key={stage} style={styles.stageRow}>
              <View style={styles.stageTop}>
                <Text style={styles.stageName}>{STAGE_LABELS[stage]}</Text>
                <View style={styles.stageActions}>
                  {status === 'running' ? (
                <AbortStageButton
                  jobId={jobId}
                  label="Abort"
                  disabled={aborting}
                  onAborted={() => {
                    void load();
                  }}
                />
              ) : null}
              {canRunStage ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={controlsDisabled}
                      onPress={() => {
                        void handleRerunStage(stage);
                      }}
                      style={({ pressed }) => [
                        styles.rerunChip,
                        pressed ? styles.rerunChipPressed : null,
                        controlsDisabled ? styles.rerunChipDisabled : null,
                      ]}
                    >
                      <Text style={styles.rerunChipText}>
                        {stageRerunning ? '…' : stageActionLabel}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Text style={[styles.stageStatus, { color: statusColor(status, entry.stale) }]}>
                    {stageStatusLabel(status, entry.stale)}
                    {percent ? ` · ${percent}` : ''}
                  </Text>
                </View>
              </View>
              {detail ? (
                <Text style={styles.stageDetail} numberOfLines={2}>
                  {detail}
                </Text>
              ) : null}
              {entry.stale && entry.staleReason ? (
                <Text style={styles.stageDetail} numberOfLines={3}>
                  {entry.staleReason}
                </Text>
              ) : null}
              <StageErrorBlock entry={entry} />
              {logTail ? (
                <CollapsibleSection
                  title={`Run log (${logLineCount(logTail)} lines)`}
                  defaultOpen={status === 'failed' || status === 'running'}
                >
                  <Text style={styles.logBox} selectable>
                    {logTail}
                  </Text>
                </CollapsibleSection>
              ) : null}
            </View>
          );
        })}

        {snapshot.agentLogTail ? (
          <CollapsibleSection
            title={`Take agent log (${logLineCount(snapshot.agentLogTail)} lines)`}
            defaultOpen={false}
          >
            <Text style={styles.logBox} selectable>
              {snapshot.agentLogTail}
            </Text>
          </CollapsibleSection>
        ) : null}

        {pipelineActive ? (
          <Button
            label={aborting ? 'Aborting…' : 'Abort pipeline'}
            variant="primary"
            disabled={aborting}
            onPress={() => {
              void handleAbort();
            }}
          />
        ) : (
          <Button
            label={
              rerunning === 'pipeline'
                ? 'Starting…'
                : pipelineNeverRan
                  ? 'Run pipeline'
                  : 'Rerun full pipeline'
            }
            variant="primary"
            disabled={controlsDisabled}
            onPress={() => {
              void handleRerunPipeline();
            }}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...sharedStyles.slideCard,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  jobStatus: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  failureBanner: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(127, 29, 29, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  failureTitle: {
    color: '#fecaca',
    fontSize: typography.small,
    fontWeight: '900',
  },
  failureMessage: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
  },
  failureHint: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 16,
  },
  stageRow: {
    gap: 2,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  rerunChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rerunChipPressed: {
    opacity: 0.85,
  },
  rerunChipDisabled: {
    opacity: 0.45,
  },
  rerunChipText: {
    color: colors.orange,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  stageName: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
    flex: 1,
  },
  stageStatus: {
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  stageDetail: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 15,
    fontFamily: 'Menlo',
  },
  agentLogWrap: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  agentLogLabel: {
    color: colors.orange,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  logBox: {
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: typography.tiny,
    lineHeight: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  error: {
    color: colors.offline,
    fontSize: typography.small,
  },
});
