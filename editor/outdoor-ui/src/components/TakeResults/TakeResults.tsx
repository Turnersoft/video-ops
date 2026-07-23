export type { TakeResultsExtras, TakeResultsProps } from './TakeResults.types';

import classes from './TakeResults.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { TakeResultsExtras, TakeResultsProps } from './TakeResults.types';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { artifactPath, sourcePath } from '../../api/urls';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, spacing, typography } from '../../theme';
import type {
  AlignReviewPayload,
  CoversListResponse,
  CutReviewPayload,
  JobResultsPreview,
  OutdoorJob,
  PublishState,
  StageResultPreview,
  VideoOpsCatalogTake,
} from '../../types';
import { stableFingerprint } from '../../utils/stableFingerprint';
import { AbortStageButton } from '../AbortStageButton/AbortStageButton';
import { AlignReviewPanel } from '../AlignReviewPanel/AlignReviewPanel';
import { CompositeBlock } from '../CompositeBlock/CompositeBlock';
import { CutReviewPanel } from '../CutReviewPanel/CutReviewPanel';
import { PipelineVideo } from '../PipelineVideo/PipelineVideo';
import { SocialSetupPanel } from '../SocialSetupPanel/SocialSetupPanel';
import { StabilizePanel } from '../StabilizePanel/StabilizePanel';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';

function finishReviewStorageKey(jobId: string): string {
  return `outdoor-finish-review:${jobId}`;
}

function readFinishReview(jobId: string): boolean {
  try {
    return globalThis.sessionStorage?.getItem(finishReviewStorageKey(jobId)) === '1';
  } catch {
    return false;
  }
}

function writeFinishReview(jobId: string, finished: boolean): void {
  try {
    const key = finishReviewStorageKey(jobId);
    if (finished) {
      globalThis.sessionStorage?.setItem(key, '1');
    } else {
      globalThis.sessionStorage?.removeItem(key);
    }
  } catch {
    // Native / private mode — in-memory state only.
  }
}

export function TakeResults({
  scriptId,
  take,
  results: resultsProp,
  extras = {},
  refreshTick = 0,
}: TakeResultsProps) {
  const { layout,  api, refreshKey  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const jobId = extras.jobId ?? `job-${take.takeId}`;
  const [loading, setLoading] = useState(!resultsProp && !extras.cutReview && !extras.alignReview);
  const [results, setResults] = useState<JobResultsPreview | null>(resultsProp ?? null);
  const [cutReview, setCutReview] = useState<CutReviewPayload | null>(extras.cutReview ?? null);
  const [alignReview, setAlignReview] = useState<AlignReviewPayload | null>(
    extras.alignReview ?? null,
  );
  const [job, setJob] = useState<OutdoorJob | null>(extras.job ?? null);
  const [covers, setCovers] = useState<CoversListResponse | null>(extras.covers ?? null);
  const [publish, setPublish] = useState<PublishState | null>(extras.publish ?? null);
  const [fallbackVideos, setFallbackVideos] = useState<Array<{ label: string; url: string }>>([]);
  const [resolvedVideos, setResolvedVideos] = useState<Array<{ label: string; src: string }>>([]);
  const [cutRebuildPhase, setCutRebuildPhase] = useState<string | null>(null);
  const [reviewFinished, setReviewFinished] = useState(() => readFinishReview(jobId));
  const resultsKeyRef = useRef('');
  const jobKeyRef = useRef('');
  const cutKeyRef = useRef('');
  const alignKeyRef = useRef('');
  const coversKeyRef = useRef('');
  const selectedRunsKey = stableFingerprint(take.selectedRuns ?? {});

  useEffect(() => {
    setReviewFinished(readFinishReview(jobId));
  }, [jobId]);

  useEffect(() => {
    // Returning to a take that already has composite: don't hide the outputs.
    const hasComposite =
      Boolean(take.selectedRuns?.composite) ||
      Boolean(job?.selectedRuns?.composite) ||
      results?.stages?.some(
        (stage) => stage.stage === 'composite' && stage.status === 'succeeded',
      );
    if (hasComposite && !reviewFinished) {
      setReviewFinished(true);
      writeFinishReview(jobId, true);
    }
  }, [
    job?.selectedRuns?.composite,
    jobId,
    results?.stages,
    reviewFinished,
    take.selectedRuns?.composite,
  ]);

  const markReviewFinished = useCallback(() => {
    setReviewFinished(true);
    writeFinishReview(jobId, true);
  }, [jobId]);

  const backToReview = useCallback(() => {
    setReviewFinished(false);
    writeFinishReview(jobId, false);
  }, [jobId]);

  const load = useCallback(async (mode: 'full' | 'progress' = 'full') => {
    const hasContent = Boolean(resultsKeyRef.current || cutKeyRef.current || alignKeyRef.current);
    if (mode === 'full' && !hasContent) {
      setLoading(true);
    }
    try {
      const detail = await api.getJob(jobId).catch(() => null);
      const nextResults = resultsProp ?? detail?.results ?? null;
      const nextJob = extras.job ?? detail?.job ?? null;
      const nextPublish = extras.publish ?? detail?.publish ?? null;

      if (mode === 'progress') {
        if (nextResults) {
          const key = stableFingerprint(
            nextResults.stages?.map((stage) => ({
              stage: stage.stage,
              status: stage.status,
              runId: stage.runId,
              videos: stage.videos,
              summary: stage.summary,
              social: stage.social,
              stale: stage.stale,
              staleReason: stage.staleReason,
            })),
          );
          if (key !== resultsKeyRef.current) {
            resultsKeyRef.current = key;
            setResults(nextResults);
          }
        }
        if (nextJob) {
          const key = stableFingerprint({
            status: nextJob.status,
            selectedRuns: nextJob.selectedRuns,
            runs: nextJob.runs,
          });
          if (key !== jobKeyRef.current) {
            jobKeyRef.current = key;
            setJob(nextJob);
          }
        }
        if (nextPublish) {
          setPublish(nextPublish);
        }
        return;
      }

      const [nextCut, nextAlign, nextCovers] = await Promise.all([
        extras.cutReview !== undefined
          ? Promise.resolve(extras.cutReview)
          : api.getCutReview(jobId).catch(() => null),
        extras.alignReview !== undefined
          ? Promise.resolve(extras.alignReview)
          : api.getAlignReview(jobId).catch(() => null),
        extras.covers !== undefined
          ? Promise.resolve(extras.covers)
          : api.getCovers(jobId).catch(() => ({ covers: [], platformCovers: {} })),
      ]);

      if (nextResults) {
        const key = stableFingerprint(
          nextResults.stages?.map((stage) => ({
            stage: stage.stage,
            status: stage.status,
            runId: stage.runId,
            videos: stage.videos,
            summary: stage.summary,
            social: stage.social,
            stale: stage.stale,
            staleReason: stage.staleReason,
          })),
        );
        if (key !== resultsKeyRef.current) {
          resultsKeyRef.current = key;
          setResults(nextResults);
        }
      }
      if (nextJob) {
        const key = stableFingerprint({
          status: nextJob.status,
          selectedRuns: nextJob.selectedRuns,
          runs: nextJob.runs,
        });
        if (key !== jobKeyRef.current) {
          jobKeyRef.current = key;
          setJob(nextJob);
        }
      }
      setPublish(nextPublish);

      const cutKey = stableFingerprint(nextCut);
      if (cutKey !== cutKeyRef.current) {
        cutKeyRef.current = cutKey;
        setCutReview(nextCut);
      }
      const alignKey = stableFingerprint(nextAlign);
      if (alignKey !== alignKeyRef.current) {
        alignKeyRef.current = alignKey;
        setAlignReview(nextAlign);
      }
      const coversKey = stableFingerprint(nextCovers);
      if (coversKey !== coversKeyRef.current) {
        coversKeyRef.current = coversKey;
        setCovers(nextCovers);
      }

      const runs = take.selectedRuns ?? nextJob?.selectedRuns ?? {};
      const compositePreviewPath = runs.composite
        ? artifactPath(
            scriptId,
            take.takeId,
            'composite',
            runs.composite,
            'outdoor-landscape.mp4',
          )
        : null;

      if (!nextResults?.stages) {
        const videos: Array<{ label: string; url: string }> = [];
        if (take.hasSourceVideo) {
          videos.push({ label: 'Source', url: sourcePath(scriptId, take.takeId) });
        }
        if (runs.composite) {
          videos.push({
            label: 'Portrait',
            url: artifactPath(
              scriptId,
              take.takeId,
              'composite',
              runs.composite,
              'outdoor-portrait.mp4',
            ),
          });
          videos.push({
            label: 'Landscape',
            url: compositePreviewPath ?? '',
          });
        }
        setFallbackVideos(videos);
      } else {
        setFallbackVideos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [
    api,
    extras.alignReview,
    extras.covers,
    extras.cutReview,
    extras.job,
    extras.publish,
    jobId,
    resultsProp,
    scriptId,
    selectedRunsKey,
    take.hasSourceVideo,
    take.takeId,
  ]);

  useEffect(() => {
    void load('full');
  }, [load, refreshKey, refreshTick]);

  const pipelineIncomplete = Boolean(
    results?.stages?.some(
      (stage) => stage.status === 'running' || stage.status === 'pending',
    ),
  );
  const stageStatusKey =
    results?.stages?.map((stage) => `${stage.stage}:${stage.status}`).join('|') ?? '';

  useEffect(() => {
    if (!pipelineIncomplete) {
      return;
    }
    const timer = setInterval(() => {
      void load('progress');
    }, 5000);
    return () => clearInterval(timer);
  }, [load, pipelineIncomplete, stageStatusKey]);

  const compositePreviewUrl = useMemo(() => {
    const runs = take.selectedRuns ?? job?.selectedRuns ?? {};
    if (!runs.composite) {
      return null;
    }
    return artifactPath(
      scriptId,
      take.takeId,
      'composite',
      runs.composite,
      'outdoor-landscape.mp4',
    );
  }, [job?.selectedRuns, scriptId, take.selectedRuns, take.takeId]);

  useEffect(() => {
    void (async () => {
      const entries: Array<{ label: string; src: string }> = [];
      for (const video of fallbackVideos) {
        entries.push({
          label: video.label,
          src: await api.absoluteUrl(video.url),
        });
      }
      setResolvedVideos(entries);
    })();
  }, [api, fallbackVideos]);

  const renderStageBlock = (stage: StageResultPreview) => {
    if (stage.stage === 'stabilize' || stage.stage === 'cut' || stage.stage === 'align') {
      return null;
    }
    if (!reviewFinished && (stage.stage === 'composite' || stage.stage === 'social')) {
      return null;
    }
    if (stage.stage === 'social') {
      return (
        <SocialSetupPanel
          key={`social-${jobId}`}
          jobId={jobId}
          social={stage.social ?? null}
          status={stage.status}
          covers={covers}
          publish={publish}
        />
      );
    }
    if (stage.stage === 'composite') {
      return (
        <CompositeBlock
          key={`composite-${jobId}`}
          jobId={jobId}
          job={job}
          stage={stage}
        />
      );
    }

    return (
      <GenericStageBlock
        key={`${stage.stage}-${stage.runId ?? 'none'}`}
        stage={stage}
        resolveUrl={(path) => Promise.resolve(api.absoluteUrl(path))}
      />
    );
  };

  if (loading && !cutReview && !alignReview && !results) {
    return <ActivityIndicator color={colors.orange} style={webModuleStyle(classes.loader)} />;
  }

  const cutNeedsRebuild =
    Boolean(cutReview?.needsStabilizedApply) ||
    Boolean(cutReview?.stale && cutReview.staleReason);

  const parts: ReactNode[] = [];

  const stabilizeStage = results?.stages?.find((stage) => stage.stage === 'stabilize');
  if (stabilizeStage) {
    parts.push(
      <StabilizePanel
        key={`stabilize-${jobId}`}
        jobId={jobId}
        scriptId={scriptId}
        takeId={take.takeId}
        hasSourceVideo={take.hasSourceVideo}
        stage={stabilizeStage}
        onPipelineChange={() => void load('full')}
      />,
    );
  }

  const cutStage = results?.stages?.find((stage) => stage.stage === 'cut');
  if (cutReview || cutStage) {
    parts.push(
      <CutReviewPanel
        key={`cut-${jobId}`}
        jobId={jobId}
        scriptId={scriptId}
        takeId={take.takeId}
        reviewFromParent={cutReview}
        onRebuildPhase={(phase) => {
          setCutRebuildPhase(phase);
          if (!phase) {
            void load('full');
          }
        }}
      />,
    );
  }

  if (cutRebuildPhase) {
    parts.push(
      <View key="cut-rebuild-progress" style={webModuleStyle(classes.rebuildCard)}>
        <SectionLabel>Updating downstream stages</SectionLabel>
        <ActivityIndicator color={colors.orange} />
        <Text style={webModuleStyle(classes.meta)}>{cutRebuildPhase}</Text>
        <Text style={webModuleStyle(classes.meta)}>
          Align, Composite, and Social stay hidden until the new cut is applied.
        </Text>
        <AbortStageButton
          jobId={jobId}
          label="Abort rebuild"
          onAborted={() => setCutRebuildPhase(null)}
        />
      </View>,
    );
  } else {
    if (cutNeedsRebuild) {
      parts.push(
        <View key={`cut-blocked-${jobId}`} style={webModuleStyle(classes.rebuildCard)}>
          <SectionLabel>Align paused</SectionLabel>
          <Text style={webModuleStyle(classes.meta)}>
            {cutReview?.staleReason ??
              'Rebuild the edited cut from stabilized footage before reviewing Align or rendering Composite.'}
          </Text>
        </View>,
      );
    } else if (alignReview) {
      parts.push(
        <AlignReviewPanel
          key={`align-${jobId}`}
          jobId={jobId}
          compositeLandscapeUrl={compositePreviewUrl}
          onPipelineChange={() => void load('full')}
        />,
      );
    }

    parts.push(
      <View key={`finish-review-${jobId}`} style={webModuleStyle(classes.finishCard)}>
        <SectionLabel>Finish review</SectionLabel>
        <Text style={webModuleStyle(classes.meta)}>
          {reviewFinished
            ? 'Review unlocked Composite / Social. Composite render is slow — only start it when framing and cut look right.'
            : cutNeedsRebuild
              ? 'Finish Cut review first — apply selection from stabilized footage when prompted.'
              : 'Stay in Cut + Align until framing and keep/cut look right. Composite render is slow, so it stays hidden until you finish review.'}
        </Text>
        {reviewFinished ? (
          <Button label="Back to review (hide composite)" onPress={backToReview} />
        ) : (
          <Button
            label="Finish review → Render composite"
            variant="primary"
            onPress={markReviewFinished}
            disabled={cutNeedsRebuild}
          />
        )}
      </View>,
    );

    if (!results?.stages) {
      if (job && reviewFinished) {
        const selected = take.selectedRuns ?? job.selectedRuns ?? {};
        const compositeVideos = resolvedVideos.filter((video) => video.label !== 'Source');
        parts.push(
          <CompositeBlock
            key={`composite-fallback-${jobId}`}
            jobId={jobId}
            job={job}
            stage={{
              stage: 'composite',
              runId: selected.composite ?? null,
              status: (selected.composite ? 'succeeded' : 'pending') as StageResultPreview['status'],
              videos: compositeVideos.map((video) => ({ label: video.label, url: video.src })),
              summary: [],
              socialTitles: [],
            }}
          />,
        );
        const sourceVideo = resolvedVideos.find((video) => video.label === 'Source');
        if (sourceVideo) {
          parts.push(
            <View key="source-block">
              <SectionLabel>Source</SectionLabel>
              <PipelineVideo src={sourceVideo.src} label="Source" />
            </View>,
          );
        }
      } else if (!job && resolvedVideos.length) {
        parts.push(
          <View key="videos-fallback" style={layoutStyles.videos}>
            {resolvedVideos.map((video) => (
              <View key={`${video.label}-${video.src}`} style={layoutStyles.gridItemHalf}>
                <PipelineVideo src={video.src} label={video.label} />
              </View>
            ))}
          </View>,
        );
      }
      return <View style={webModuleStyle(classes.wrap)}>{parts}</View>;
    }

    for (const stage of results.stages) {
      const block = renderStageBlock(stage);
      if (block) {
        parts.push(block);
      }
    }
  }

  if (!parts.length) {
    return (
      <View style={webModuleStyle(classes.wrap)}>
        <Text style={webModuleStyle(classes.meta)}>No pipeline outputs yet. Run cut on Mac to see edited video here.</Text>
      </View>
    );
  }

  return <View style={webModuleStyle(classes.wrap)}>{parts}</View>;
}

function GenericStageBlock({
  stage,
  resolveUrl,
}: {
  stage: StageResultPreview;
  resolveUrl: (path: string) => Promise<string>;
}) {
  const { layout } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const [videos, setVideos] = useState<Array<{ label: string; src: string }>>([]);

  useEffect(() => {
    void (async () => {
      const resolved: Array<{ label: string; src: string }> = [];
      for (const video of stage.videos) {
        resolved.push({
          label: video.label,
          src: await resolveUrl(video.url),
        });
      }
      setVideos(resolved);
    })();
  }, [resolveUrl, stage.videos]);

  return (
    <View style={webModuleStyle(classes.stageBlock)}>
      <SectionLabel>
        {stage.stage} · {stage.status}
      </SectionLabel>
      {(stage.summary ?? []).length ? (
        <Text style={webModuleStyle(classes.meta)}>{(stage.summary ?? []).join(' · ')}</Text>
      ) : null}
      <View style={layoutStyles.videos}>
        {videos.length ? (
          videos.map((video) => (
            <View key={`${video.label}-${video.src}`} style={layoutStyles.gridItemHalf}>
              <PipelineVideo src={video.src} label={video.label} />
            </View>
          ))
        ) : (
          <Text style={webModuleStyle(classes.meta)}>No video yet</Text>
        )}
      </View>
    </View>
  );
}
