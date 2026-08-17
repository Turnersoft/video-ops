import classes from './VoxcpmPipelineResults.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { artifactPath } from '../../api/urls';
import { formatOutdoorApiError } from '../../api/client';
import { CompositeBlock } from '../CompositeBlock/CompositeBlock';
import { Button } from '../Button/Button';
import { SocialPublishPreviewSection } from '../SocialPublishPreviewSection/SocialPublishPreviewSection';
import { SocialSetupPanel } from '../SocialSetupPanel/SocialSetupPanel';
import { VoxcpmServerLogs } from '../VoxcpmServerLogs/VoxcpmServerLogs';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, typography } from '../../theme';
import type {
  CoversListResponse,
  OutdoorJob,
  PublishState,
  RunStatus,
  StageResultPreview,
  StageRunSummary,
  VideoOpsCatalogTake,
} from '../../types';

export type VoxcpmPipelineResultsProps = {
  scriptId: string;
  take: VideoOpsCatalogTake;
  refreshTick?: number;
};

type StepStatus = RunStatus | 'pending' | 'waiting';

function statusColor(status: StepStatus): string {
  switch (status) {
    case 'running':
      return colors.orange;
    case 'succeeded':
      return colors.online;
    case 'failed':
    case 'cancelled':
      return colors.offline;
    default:
      return colors.muted;
  }
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'succeeded':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Aborted';
    case 'waiting':
      return 'Waiting';
    default:
      return 'Pending';
  }
}

function VoxcpmStepCard({
  step,
  title,
  status,
  children,
}: {
  step: number;
  title: string;
  status: StepStatus;
  children?: ReactNode;
}) {
  const cardClass =
    status === 'running'
      ? classes.stepCardActive
      : status === 'succeeded'
        ? classes.stepCardDone
        : status === 'failed' || status === 'cancelled'
          ? classes.stepCardFailed
          : '';

  return (
    <View style={[webModuleStyle(classes.stepCard), webModuleStyle(cardClass)]}>
      <View style={webModuleStyle(classes.stepHeader)}>
        <View style={webModuleStyle(classes.stepBadge)}>
          <Text style={webModuleStyle(classes.stepBadgeText)}>{step}</Text>
        </View>
        <Text style={webModuleStyle(classes.stepTitle)}>{title}</Text>
        <Text style={[webModuleStyle(classes.stepStatus), { color: statusColor(status) }]}>
          {statusLabel(status)}
        </Text>
      </View>
      {children}
    </View>
  );
}

function isRemotionCompositeError(message: string | undefined): boolean {
  return Boolean(message && /render-outdoor\.mjs/.test(message));
}

function narrationIsReady(alignRun: StageRunSummary | undefined): boolean {
  if (!alignRun) {
    return false;
  }
  if (alignRun.status === 'succeeded') {
    return true;
  }
  if (alignRun.artifacts?.narrationWav) {
    return true;
  }
  return isRemotionCompositeError(alignRun.error);
}

function NarrationAudio({ src }: { src: string }) {
  if (Platform.OS !== 'web') {
    return (
      <Text style={webModuleStyle(classes.meta)}>
        Narration ready — open on Mac web UI to preview audio.
      </Text>
    );
  }
  return (
    <audio
      className={classes.audio}
      controls
      preload="metadata"
      src={src}
    />
  );
}

export function VoxcpmPipelineResults({
  scriptId,
  take,
  refreshTick = 0,
}: VoxcpmPipelineResultsProps) {
  const { api, refreshKey, invalidateAll } = useOutdoorUi();
  const jobId = `job-${take.takeId}`;
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryingComposite, setRetryingComposite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<OutdoorJob | null>(null);
  const [compositeStage, setCompositeStage] = useState<StageResultPreview | null>(null);
  const [socialStage, setSocialStage] = useState<StageResultPreview | null>(null);
  const [covers, setCovers] = useState<CoversListResponse | null>(null);
  const [publish, setPublish] = useState<PublishState | null>(null);
  const [narrationSrc, setNarrationSrc] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<{
    percent: number;
    message: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await api.getJob(jobId);
      setJob(detail.job);
      const alignRunId = detail.job.selectedRuns.align;
      const alignRun = (detail.job.runs.align ?? []).find((run) => run.runId === alignRunId);
      if (alignRunId && detail.progress.align) {
        setVoiceProgress({
          percent: detail.progress.align.percent ?? 0,
          message: detail.progress.align.message ?? '',
        });
      } else if (alignRun?.status === 'succeeded') {
        setVoiceProgress({ percent: 100, message: 'Narration ready' });
      } else if (alignRun?.status === 'failed') {
        setVoiceProgress(null);
      }

      const composite =
        detail.results?.stages?.find((stage) => stage.stage === 'composite') ?? null;
      const social = detail.results?.stages?.find((stage) => stage.stage === 'social') ?? null;
      setCompositeStage(composite);
      setSocialStage(social);
      setPublish(detail.publish ?? null);
      setCovers(await api.getCovers(jobId).catch(() => null));

      if (alignRunId && alignRun && narrationIsReady(alignRun)) {
        const narrationPath = artifactPath(
          scriptId,
          take.takeId,
          'align',
          alignRunId,
          'narration.wav',
        );
        setNarrationSrc(await api.absoluteUrl(narrationPath));
      } else {
        setNarrationSrc(null);
      }
      setError(null);
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [api, jobId, scriptId, take.takeId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey, refreshTick]);

  const alignRun = (job?.runs.align ?? []).find((run) => run.runId === job?.selectedRuns.align);
  const narrationReady = narrationIsReady(alignRun);

  const voiceStatus = useMemo((): StepStatus => {
    if (narrationReady) {
      return 'succeeded';
    }
    const alignRunId = job?.selectedRuns.align;
    const run = (job?.runs.align ?? []).find((entry) => entry.runId === alignRunId);
    if (run?.status === 'failed') {
      return 'failed';
    }
    if (run?.status === 'cancelled') {
      return 'cancelled';
    }
    if (run?.status === 'running' || (job?.status === 'running' && !run?.finishedAt)) {
      return 'running';
    }
    return 'pending';
  }, [job, narrationReady]);

  const compositeStatus = useMemo((): StepStatus => {
    if (!narrationReady) {
      return 'waiting';
    }
    const status = compositeStage?.status ?? 'pending';
    if (status === 'failed') {
      return 'failed';
    }
    if (status === 'succeeded') {
      return 'succeeded';
    }
    if (status === 'cancelled') {
      return 'cancelled';
    }
    if (status === 'running') {
      return 'running';
    }
    if (job?.status === 'failed' && isRemotionCompositeError(alignRun?.error)) {
      return 'failed';
    }
    if (status === 'pending') {
      return job?.selectedRuns.composite ? 'running' : 'waiting';
    }
    return status;
  }, [alignRun?.error, compositeStage?.status, job?.selectedRuns.composite, job?.status, narrationReady]);

  const socialStatus = useMemo((): StepStatus => {
    if (compositeStatus !== 'succeeded') {
      return 'waiting';
    }
    const status = socialStage?.status ?? 'pending';
    if (status === 'failed') {
      return 'failed';
    }
    if (status === 'succeeded') {
      return 'succeeded';
    }
    if (status === 'cancelled') {
      return 'cancelled';
    }
    if (status === 'running') {
      return 'running';
    }
    if (status === 'pending') {
      return job?.selectedRuns.social ? 'running' : 'pending';
    }
    return status;
  }, [compositeStatus, job?.selectedRuns.social, socialStage?.status]);

  const pipelineActive = useMemo(() => {
    if (voiceStatus === 'running' || compositeStatus === 'running' || socialStatus === 'running') {
      return true;
    }
    return job?.status === 'running';
  }, [compositeStatus, job?.status, socialStatus, voiceStatus]);

  useEffect(() => {
    if (!pipelineActive) {
      return;
    }
    const timer = setInterval(() => {
      void load();
    }, 2500);
    return () => clearInterval(timer);
  }, [load, pipelineActive]);

  const voiceFailed = voiceStatus === 'failed' || voiceStatus === 'cancelled';
  const compositeFailed = compositeStatus === 'failed' || compositeStatus === 'cancelled';
  const voiceErrorTitle =
    alignRun?.error?.includes('VoxCPM') || alignRun?.errorTitle?.includes('Align slides')
      ? 'Voice assembly failed'
      : (alignRun?.errorTitle ?? 'Voice assembly failed');
  const compositeErrorMessage =
    compositeStage?.summary?.find((line) => line.trim().length > 0) ??
    alignRun?.error ??
    'Remotion composite failed';
  const agentDown =
    Boolean(error) &&
    (error.includes('Not found') ||
      error.includes('ECONNREFUSED') ||
      error.includes('Failed to fetch') ||
      error.includes('502') ||
      error.includes('503'));

  const handleRetryNarration = useCallback(async () => {
    setRetrying(true);
    setError(null);
    try {
      await api.retryVoxcpmTrial(jobId, { resynthesizeVoice: true, renderComposite: false });
      invalidateAll();
      await load();
    } catch (retryError) {
      setError(formatOutdoorApiError(retryError));
    } finally {
      setRetrying(false);
    }
  }, [api, invalidateAll, jobId, load]);

  const handleRetryComposite = useCallback(async () => {
    setRetryingComposite(true);
    setError(null);
    try {
      await api.runStage(jobId, 'composite', { rerun: true });
      invalidateAll();
      await load();
    } catch (retryError) {
      setError(formatOutdoorApiError(retryError));
    } finally {
      setRetryingComposite(false);
    }
  }, [api, invalidateAll, jobId, load]);

  if (loading && !job) {
    return <ActivityIndicator color={colors.orange} />;
  }

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Text style={webModuleStyle(classes.intro)}>
        AI clone post-processing — assemble voice from the beat editor, export Remotion, then publish.
        Edit spoken lines in the beat editor before generating a new take.
      </Text>
      {agentDown ? (
        <Text style={{ color: colors.offline, fontSize: typography.small, fontWeight: '700' }}>
          Outdoor agent is not running on :8789 — stop old terminals, then run npm run outdoor:all
          and wait for “Outdoor agent ready on :8789”.
        </Text>
      ) : null}
      {error && !agentDown ? (
        <Text style={{ color: colors.offline, fontSize: typography.small }}>{error}</Text>
      ) : null}

      {!narrationReady ? (
        <View style={{ gap: 8 }}>
          {voiceStatus === 'running' && voiceProgress ? (
            <View style={webModuleStyle(classes.progressRow)}>
              <ActivityIndicator color={colors.orange} size="small" />
              <Text style={{ color: colors.orange, fontSize: typography.small }}>
                {voiceProgress.message || 'Assembling voice from beat editor…'}
                {voiceProgress.percent > 0 ? ` (${Math.round(voiceProgress.percent)}%)` : ''}
              </Text>
            </View>
          ) : (
            <Text style={webModuleStyle(classes.meta)}>
              Assembling cached sentence audio from the beat editor…
            </Text>
          )}
          <VoxcpmServerLogs
            active={voiceStatus === 'running' || retrying}
            defaultOpen={voiceStatus === 'running' || retrying || voiceFailed}
          />
          {voiceFailed && alignRun ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.offline, fontWeight: '800', fontSize: typography.small }}>
                {voiceErrorTitle}
              </Text>
              <Text style={{ color: colors.offline, fontSize: typography.small }}>
                {alignRun.error ?? 'Voice assembly failed'}
              </Text>
              {alignRun.errorHint ? (
                <Text style={webModuleStyle(classes.meta)}>{alignRun.errorHint}</Text>
              ) : null}
              <Button
                label={retrying ? 'Retrying…' : 'Retry voice assembly'}
                variant="primary"
                disabled={retrying || retryingComposite}
                onPress={() => {
                  void handleRetryNarration();
                }}
              />
            </View>
          ) : null}
        </View>
      ) : narrationSrc ? (
        <View style={{ gap: 8 }}>
          <Text style={webModuleStyle(classes.meta)}>Voice ready from beat editor:</Text>
          <NarrationAudio src={narrationSrc} />
        </View>
      ) : null}

      <VoxcpmStepCard step={1} title="Remotion export" status={compositeStatus}>
        {compositeStatus === 'waiting' ? (
          <Text style={webModuleStyle(classes.meta)}>
            Starts after voice assembly finishes — portrait + landscape with burned captions.
          </Text>
        ) : null}
        {compositeFailed ? (
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.offline, fontWeight: '800', fontSize: typography.small }}>
              Remotion export failed
            </Text>
            <Text style={{ color: colors.offline, fontSize: typography.small }}>
              {compositeErrorMessage}
            </Text>
            <Text style={webModuleStyle(classes.meta)}>
              Voice is ready — this step only re-renders Remotion.
            </Text>
            <Button
              label={retryingComposite ? 'Rendering…' : 'Rerun Remotion export'}
              variant="primary"
              disabled={retrying || retryingComposite}
              onPress={() => {
                void handleRetryComposite();
              }}
            />
          </View>
        ) : null}
        {narrationReady && job ? (
          <CompositeBlock
            jobId={jobId}
            job={job}
            remotionPreviewOnly
            stage={
              compositeStage ?? {
                stage: 'composite',
                runId: job.selectedRuns.composite ?? null,
                status: compositeStatus === 'waiting' ? 'pending' : compositeStatus,
                videos: [],
                summary: [],
                socialTitles: [],
              }
            }
          />
        ) : null}
      </VoxcpmStepCard>

      <VoxcpmStepCard step={2} title="Publish" status={socialStatus}>
        {socialStatus === 'waiting' ? (
          <Text style={webModuleStyle(classes.meta)}>
            Run the publish pack stage after Remotion export finishes.
          </Text>
        ) : null}
        {compositeStatus === 'succeeded' && job ? (
          <>
            <SocialSetupPanel
              jobId={jobId}
              scriptId={scriptId}
              social={socialStage?.social ?? null}
              status={socialStage?.status ?? 'pending'}
              covers={covers}
              publish={publish}
            />
            <SocialPublishPreviewSection
              scriptId={scriptId}
              jobId={jobId}
              publish={publish}
            />
          </>
        ) : null}
      </VoxcpmStepCard>
    </View>
  );
}
