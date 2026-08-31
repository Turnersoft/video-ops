import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutStylesFor } from '../../layout';
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { createElement } from 'react';

import { formatOutdoorApiError } from '../../api/client';
import { BeatPosterCoverSlide } from '../../components/BeatPosterCoverSlide/BeatPosterCoverSlide';
import { BeatPosterSlide } from '../../components/BeatPosterSlide/BeatPosterSlide';
import { BeatPosterSocialFeedPreview } from '../../components/BeatPosterSocialFeedPreview/BeatPosterSocialFeedPreview';
import {
  BeatPosterPublishGlobalBar,
  BeatPosterPublishLifecycle,
} from '../../components/BeatPosterPublishLifecycle/BeatPosterPublishLifecycle';
import type { BeatPosterLang, BeatPosterSlideProps } from '../../components/BeatPosterSlide/BeatPosterSlide.types';
import type { BeatPosterCoverSlideProps } from '../../components/BeatPosterCoverSlide/BeatPosterCoverSlide.types';
import { Button } from '../../components/Button/Button';
import { Header } from '../../components/Header/Header';
import { SectionLabel } from '../../components/SectionLabel/SectionLabel';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { sharedStyles, colors, typography, spacing } from '../../theme';
import { StyleSheet } from 'react-native';
import type {
  BeatPosterGenerateProgress,
  BeatPosterPublishPreview,
  BeatPostersResponse,
  LiveBeat,
  LiveScript,
  VideoOpsCatalogScript,
} from '../../types';
import { buildBeatPosterCoverSlideProps } from '../../utils/beatPosterCoverModel';
import { liveBeatToPosterSlideProps } from '../../utils/beatPosterModel';
import { beatPosterMdCoverCopy, beatPosterMdEntryFor, parseBeatPosterMd } from '../../../../../src/beatPosterMd';
import type { BeatPosterMdDocument } from '../../../../../src/beatPosterMd';
import {
  buildBeatPosterPublishPreviewLocal,
  beatPosterPreviewJpegUrl,
  BEAT_POSTER_COVER_ID,
} from '../../../../../src/beatPosterPublishPreview';
import {
  captureBeatPosterSlidesFromDom,
  listBeatPosterExportRoots,
} from '../../utils/beatPosterSlideCapture';
import { platformLabel, publishStatusLabel } from '../../utils/format';
import {
  platformPublishKey,
  resolvePlatformPublishUi,
  type PlatformPublishUi,
} from '../../utils/beatPosterPublishLifecycle';
import { parsePublishErrorDetails, type PublishErrorDetails } from '../../utils/outdoorApiErrorDetails';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import classes from './BeatPosterPublishScreen.module.scss';

export type BeatPosterPublishScreenProps = {
  scriptId: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function readCarouselIndex(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  itemWidth: number,
): number {
  const offset = event.nativeEvent.contentOffset.x;
  return Math.max(0, Math.round(offset / Math.max(itemWidth, 1)));
}

export function BeatPosterPublishScreen({ scriptId }: BeatPosterPublishScreenProps) {
  const { layout, api, refreshKey } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const { navigateToPostProcess, navigateToAnimation, navigateToPlatforms } = useOutdoorRoute();

  const [lang, setLang] = useState<BeatPosterLang>('en');
  const [live, setLive] = useState<LiveScript | null>(null);
  const [meta, setMeta] = useState<VideoOpsCatalogScript | null>(null);
  const [seriesTitle, setSeriesTitle] = useState('Turn-Lang');
  const [episodeTitleEn, setEpisodeTitleEn] = useState('');
  const [episodeTitleZh, setEpisodeTitleZh] = useState('');
  const [promotionalDescriptionEn, setPromotionalDescriptionEn] = useState('');
  const [promotionalDescriptionZh, setPromotionalDescriptionZh] = useState('');
  const [posters, setPosters] = useState<BeatPostersResponse | null>(null);
  const [posterMd, setPosterMd] = useState<BeatPosterMdDocument | null>(null);
  const [preview, setPreview] = useState<BeatPosterPublishPreview | null>(null);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  const [capturingPreview, setCapturingPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<BeatPosterGenerateProgress | null>(
    null,
  );
  const [posterIndex, setPosterIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const [error, setError] = useState<string | null>(null);
  const [platformPublishUi, setPlatformPublishUi] = useState<Record<string, PlatformPublishUi>>({});
  const [platformPublishErrors, setPlatformPublishErrors] = useState<Record<string, string>>({});
  const [globalPublishStatus, setGlobalPublishStatus] = useState<{
    tone: 'active' | 'success' | 'error' | 'idle';
    title: string;
    detail?: string;
    postUrl?: string;
    errorDetails?: PublishErrorDetails;
  } | null>(null);

  const posterItemWidth = 320;

  const load = useCallback(async () => {
    setError(null);
    setPreviewWarning(null);
    const loadErrors: string[] = [];
    try {
      const [catalog, liveScript, animationMd, posterMdDoc, posterPayload, previewPayload, socialPayload] =
        await Promise.all([
          api.getCatalog().catch((catalogError) => {
            loadErrors.push(`Catalog: ${formatOutdoorApiError(catalogError)}`);
            return null;
          }),
          api.getLiveScript(scriptId).catch((liveError) => {
            loadErrors.push(`Live script: ${formatOutdoorApiError(liveError)}`);
            return null;
          }),
          api.getAnimationMd(scriptId).catch(() => null),
          api.getBeatPosterMd(scriptId).catch(() => null),
          api.getBeatPosters(scriptId).catch(() => null),
          api.getBeatPosterPublishPreview(scriptId, lang).catch(() => null),
          api.getScriptSocialPosts(scriptId).catch(() => null),
        ]);

      if (!liveScript) {
        setError(
          loadErrors.join(' · ') ||
            'Outdoor agent is offline — restart npm run outdoor:all on the Mac, then click Refresh.',
        );
        setLive(null);
        setPreview(null);
        setPosters(null);
        return;
      }

      if (loadErrors.length > 0) {
        setPreviewWarning(
          `${loadErrors.join(' · ')} — showing beat posters from live script; some API features may be limited until the agent is fully up.`,
        );
      }

      const catalogMeta =
        (catalog?.scripts ?? []).find((entry) => entry.scriptId === scriptId) ?? null;
      setMeta(catalogMeta);
      setLive(liveScript);
      const seriesEntry = (catalog?.series ?? []).find(
        (entry) => entry.id === catalogMeta?.seriesId,
      );
      setSeriesTitle(seriesEntry?.title?.trim() || 'Turn-Lang');
      const fm = animationMd?.markdown?.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = fm?.[1] ?? '';
      const socialEn =
        frontmatter.match(/^socialTitleEnglish:\s*"([^"]+)"/m)?.[1]?.trim() ??
        frontmatter.match(/^socialTitleEnglish:\s*(.+)$/m)?.[1]?.trim();
      const socialZh =
        frontmatter.match(/^socialTitleChina:\s*"([^"]+)"/m)?.[1]?.trim() ??
        frontmatter.match(/^socialTitleChina:\s*(.+)$/m)?.[1]?.trim();
      const promoEn =
        frontmatter.match(/^promotionalDescription:\s*"([^"]+)"/m)?.[1]?.trim() ??
        frontmatter.match(/^promotionalDescription:\s*(.+)$/m)?.[1]?.trim();
      const promoZh =
        frontmatter.match(/^promotionalDescriptionChina:\s*"([^"]+)"/m)?.[1]?.trim() ??
        frontmatter.match(/^promotionalDescriptionChina:\s*(.+)$/m)?.[1]?.trim();
      const parsedPosterMd = posterMdDoc?.markdown ? parseBeatPosterMd(posterMdDoc.markdown) : null;
      setPosterMd(parsedPosterMd);
      const coverEn = beatPosterMdCoverCopy(parsedPosterMd, 'en');
      const coverZh = beatPosterMdCoverCopy(parsedPosterMd, 'zh');
      setEpisodeTitleEn(socialEn || catalogMeta?.title || liveScript.title);
      setEpisodeTitleZh(socialZh || socialEn || catalogMeta?.title || liveScript.title);
      setPromotionalDescriptionEn(coverEn || promoEn || '');
      setPromotionalDescriptionZh(coverZh || promoZh || coverEn || promoEn || '');
      setPosters(posterPayload);

      const beatIds = (liveScript.beats ?? []).map((beat) => beat.id);
      const jpegImageUrls = [
        beatPosterPreviewJpegUrl(scriptId, BEAT_POSTER_COVER_ID, lang),
        ...beatIds.map((beatId) => beatPosterPreviewJpegUrl(scriptId, beatId, lang)),
      ];
      await api.syncBeatPosterPreviewJpegs(scriptId).catch(() => null);

      const apiImageUrls = (posterPayload?.posters ?? [])
        .filter((poster) => poster.lang === lang)
        .sort((a, b) => a.beatIndex - b.beatIndex)
        .map((poster) => beatPosterPreviewJpegUrl(scriptId, poster.beatId, lang));

      const imageUrlsForPreview = apiImageUrls.length > 0 ? apiImageUrls : jpegImageUrls;

      if (previewPayload?.preview?.platforms?.length) {
        setPreview({
          ...previewPayload.preview,
          platforms: previewPayload.preview.platforms.map((row) => ({
            ...row,
            imageUrls: imageUrlsForPreview,
            imageCount: imageUrlsForPreview.length,
          })),
        });
      } else {
        setPreview(
          buildBeatPosterPublishPreviewLocal({
            scriptId,
            lang,
            beatIds,
            social: socialPayload,
            fallbacks: {
              socialTitleEnglish: socialEn || catalogMeta?.title || liveScript.title,
              socialTitleChina: socialZh || socialEn || catalogMeta?.title || liveScript.title,
              promotionalDescription: promoEn || '',
              promotionalDescriptionChina: promoZh || promoEn || '',
              scriptTitle: catalogMeta?.title || liveScript.title,
            },
            imageUrls: imageUrlsForPreview,
          }),
        );
        if (!previewPayload?.preview) {
          setPreviewWarning(
            'Publish-preview API unavailable (restart outdoor_agent for auto-publish). Using JPEG preview paths + live DOM capture.',
          );
        }
      }
      setPreviewImageUrls([]);
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [api, lang, scriptId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    setGenerateProgress(null);
  }, [scriptId]);

  const beats = live?.beats ?? [];
  const coverSlide = useMemo(
    () =>
      buildBeatPosterCoverSlideProps({
        scriptId,
        lang,
        seriesTitle,
        episodeTitleEn: episodeTitleEn || meta?.title || live?.title || scriptId,
        episodeTitleZh: episodeTitleZh || episodeTitleEn || meta?.title || live?.title || scriptId,
        promotionalDescriptionEn,
        promotionalDescriptionZh,
        beatCount: beats.length,
        seed: `${scriptId}:cover:${lang}`,
      }),
    [
      beats.length,
      episodeTitleEn,
      episodeTitleZh,
      lang,
      live?.title,
      meta?.title,
      promotionalDescriptionEn,
      promotionalDescriptionZh,
      scriptId,
      seriesTitle,
    ],
  );
  const beatPosterSlides = useMemo(() => {
    return beats.map((beat: LiveBeat, index: number) =>
      liveBeatToPosterSlideProps({
        beat,
        nextBeat: beats[index + 1] ?? null,
        lang,
        seriesTitle,
        episodeTitleEn: episodeTitleEn || meta?.title || live?.title || scriptId,
        episodeTitleZh: episodeTitleZh || episodeTitleEn || meta?.title || live?.title || scriptId,
        poster: beatPosterMdEntryFor(posterMd, beat.index),
      }),
    );
  }, [
    beats,
    episodeTitleEn,
    episodeTitleZh,
    lang,
    live?.title,
    meta?.title,
    posterMd,
    scriptId,
    seriesTitle,
  ]);
  const carouselSlides = useMemo(
    () => [{ kind: 'cover' as const, cover: coverSlide }, ...beatPosterSlides.map((slide) => ({ kind: 'beat' as const, slide }))],
    [beatPosterSlides, coverSlide],
  );
  const exportPacks = useMemo(() => {
    const langs: BeatPosterLang[] = ['en', 'zh'];
    return langs.map((packLang) => {
      const cover: BeatPosterCoverSlideProps = buildBeatPosterCoverSlideProps({
        scriptId,
        lang: packLang,
        seriesTitle,
        episodeTitleEn: episodeTitleEn || meta?.title || live?.title || scriptId,
        episodeTitleZh: episodeTitleZh || episodeTitleEn || meta?.title || live?.title || scriptId,
        promotionalDescriptionEn,
        promotionalDescriptionZh,
        beatCount: beats.length,
        seed: `${scriptId}:cover:${packLang}`,
      });
      const slides: BeatPosterSlideProps[] = beats.map((beat: LiveBeat, index: number) =>
        liveBeatToPosterSlideProps({
          beat,
          nextBeat: beats[index + 1] ?? null,
          lang: packLang,
          seriesTitle,
          episodeTitleEn: episodeTitleEn || meta?.title || live?.title || scriptId,
          episodeTitleZh: episodeTitleZh || episodeTitleEn || meta?.title || live?.title || scriptId,
          poster: beatPosterMdEntryFor(posterMd, beat.index),
        }),
      );
      return { lang: packLang, cover, slides };
    });
  }, [
    beats,
    episodeTitleEn,
    episodeTitleZh,
    live?.title,
    meta?.title,
    posterMd,
    promotionalDescriptionEn,
    promotionalDescriptionZh,
    scriptId,
    seriesTitle,
  ]);

  useEffect(() => {
    setPosterIndex(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [lang, scriptId, carouselSlides.length]);

  useEffect(() => {
    if (loading || Platform.OS !== 'web' || carouselSlides.length === 0) {
      return;
    }
    let cancelled = false;
    const capture = async () => {
      setCapturingPreview(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const roots = listBeatPosterExportRoots();
      if (roots.length < carouselSlides.length) {
        setCapturingPreview(false);
        return;
      }
      try {
        const urls = await captureBeatPosterSlidesFromDom(roots.slice(0, carouselSlides.length));
        if (cancelled || urls.length === 0) {
          return;
        }
        setPreviewImageUrls(urls);
        setPreview((prev) =>
          prev
            ? {
                ...prev,
                platforms: prev.platforms.map((row) => ({
                  ...row,
                  imageUrls: urls,
                  imageCount: urls.length,
                })),
              }
            : prev,
        );
      } finally {
        if (!cancelled) {
          setCapturingPreview(false);
        }
      }
    };
    void capture();
    return () => {
      cancelled = true;
    };
  }, [carouselSlides.length, lang, loading, scriptId]);

  const resolvePreviewSrc = useCallback(
    (url: string) => {
      if (url.startsWith('data:') || url.startsWith('http')) {
        return url;
      }
      return api.absoluteUrl(url);
    },
    [api],
  );

  const platformRows = preview?.platforms ?? [];
  const platformPublishMode = (row: (typeof platformRows)[number]) =>
    row.publishMode ?? (row.postizImageSupported ? 'auto' : 'manual');
  const autoPlatforms = platformRows.filter((row) => platformPublishMode(row) === 'auto');
  const manualPlatforms = platformRows.filter((row) => platformPublishMode(row) === 'manual');

  const publishRecordFor = (platform: string) =>
    (posters?.publishState?.posts ?? []).find(
      (entry) =>
        entry.platform === platform &&
        entry.lang === lang &&
        entry.beatId === 'album' &&
        (entry.status === 'live' || entry.status === 'pending'),
    );

  const uiForPlatform = useCallback(
    (platform: string, publishMode: 'auto' | 'manual') => {
      const key = platformPublishKey(platform, lang);
      return resolvePlatformPublishUi({
        publishMode,
        ui: platformPublishUi[key],
        record: publishRecordFor(platform),
        lastError: platformPublishErrors[key],
      });
    },
    [lang, platformPublishErrors, platformPublishUi, posters?.publishState?.posts],
  );

  const patchPlatformUi = useCallback(
    (platform: string, patch: Partial<PlatformPublishUi>) => {
      const key = platformPublishKey(platform, lang);
      setPlatformPublishUi((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...patch,
        },
      }));
    },
    [lang],
  );

  const startPublishPhaseTimers = useCallback(
    (platform: string) => {
      patchPlatformUi(platform, {
        phase: 'preparing',
        message: 'Preparing album images…',
        error: undefined,
      });
      if (typeof globalThis.setTimeout !== 'function') {
        return () => {};
      }
      const uploadTimer = globalThis.setTimeout(() => {
        patchPlatformUi(platform, {
          phase: 'uploading',
          message: 'Uploading images…',
        });
      }, 500);
      const submitTimer = globalThis.setTimeout(() => {
        patchPlatformUi(platform, {
          phase: 'submitting',
          message: 'Submitting post to platform…',
        });
      }, 2500);
      return () => {
        globalThis.clearTimeout(uploadTimer);
        globalThis.clearTimeout(submitTimer);
      };
    },
    [patchPlatformUi],
  );

  const handleGenerate = useCallback(async () => {
    setBusy('generate');
    setGenerateProgress({
      scriptId,
      status: 'clearing',
      current: 0,
      total: 0,
      percent: 0,
      label: 'Starting…',
      updatedAt: new Date().toISOString(),
    });
    const pollId = globalThis.setInterval(() => {
      void api
        .getBeatPosterGenerateProgress(scriptId)
        .then((progress) => {
          setGenerateProgress(progress);
        })
        .catch(() => null);
    }, 400);
    try {
      const next = await api.generateBeatPosters(scriptId);
      setPosters(next);
      await api.syncBeatPosterPreviewJpegs(scriptId).catch(() => null);
      const previewPayload = await api.getBeatPosterPublishPreview(scriptId, lang).catch(() => null);
      if (previewPayload?.preview) {
        setPreview(previewPayload.preview);
      }
      const finalProgress = await api.getBeatPosterGenerateProgress(scriptId).catch(() => null);
      if (finalProgress) {
        setGenerateProgress(finalProgress);
      } else {
        setGenerateProgress({
          scriptId,
          status: 'done',
          current: next.posters.length,
          total: next.posters.length,
          percent: 100,
          label: `Done — ${next.posters.length} posters`,
          updatedAt: new Date().toISOString(),
        });
      }
      Alert.alert(
        'Infographics ready',
        `Wrote ${next.posters.length} PNGs to beat-posters/english and beat-posters/chinese (cover + ${next.beats.length} beats × EN + 中文).`,
      );
    } catch (generateError) {
      const failedProgress = await api.getBeatPosterGenerateProgress(scriptId).catch(() => null);
      if (failedProgress) {
        setGenerateProgress(failedProgress);
      }
      Alert.alert('Generate failed', formatOutdoorApiError(generateError));
    } finally {
      globalThis.clearInterval(pollId);
      setBusy(null);
    }
  }, [api, lang, scriptId]);

  const handlePublishPlatform = useCallback(
    async (platform: string) => {
      const key = platformPublishKey(platform, lang);
      setBusy(`publish-${platform}`);
      setGlobalPublishStatus({
        tone: 'active',
        title: `Publishing ${platformLabel(platform)} (${lang.toUpperCase()})`,
        detail: `Uploading ${carouselSlides.length} infographic slides via ${platform === 'xiaohongshu' || platform === 'douyin' || platform === 'kuaishou' ? 'SAU' : 'Postiz'}…`,
      });
      const clearTimers = startPublishPhaseTimers(platform);
      try {
        const result = await api.publishBeatPosterAlbum(scriptId, platform, lang);
        clearTimers();
        setPosters((prev) =>
          prev ? { ...prev, publishState: result.publishState } : prev,
        );
        const record =
          result.record ??
          result.publishState.posts.find(
            (entry) =>
              entry.platform === platform &&
              entry.lang === lang &&
              entry.beatId === 'album',
          );
        if (!record?.postId) {
          throw new Error('Publish API returned no post record — restart outdoor_agent');
        }
        const phase = record.status === 'live' ? 'live' : 'pending';
        patchPlatformUi(platform, {
          phase,
          message:
            phase === 'live'
              ? record.url && !record.url.includes('example.invalid')
                ? 'Published — post is live'
                : 'Published via SAU — check 小红书 creator studio'
              : 'Submitted — waiting for platform approval',
          postUrl: record.url && !record.url.includes('example.invalid') ? record.url : undefined,
          postId: record.postId,
          updatedAt: record.publishedAt,
          error: undefined,
        });
        setPlatformPublishErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setGlobalPublishStatus({
          tone: 'success',
          title: `${platformLabel(platform)} published`,
          detail: `${carouselSlides.length} images · ${
            record.url && !record.url.includes('example.invalid')
              ? phase === 'live'
                ? 'Live on platform'
                : 'Pending on platform queue'
              : 'Submitted via SAU — confirm in creator app'
          }`,
          postUrl: record.url && !record.url.includes('example.invalid') ? record.url : undefined,
        });
      } catch (publishError) {
        clearTimers();
        const errorDetails = parsePublishErrorDetails(publishError);
        patchPlatformUi(platform, {
          phase: 'failed',
          message: 'Publish failed',
          error: errorDetails.summary,
          errorDetails,
        });
        setPlatformPublishErrors((prev) => ({ ...prev, [key]: errorDetails.summary }));
        setGlobalPublishStatus({
          tone: 'error',
          title: `${platformLabel(platform)} publish failed`,
          detail: errorDetails.summary,
          errorDetails,
        });
      } finally {
        setBusy(null);
      }
    },
    [
      api,
      carouselSlides.length,
      lang,
      patchPlatformUi,
      scriptId,
      startPublishPhaseTimers,
    ],
  );

  const handlePublishAll = useCallback(async () => {
    setBusy('publish-all');
    setGlobalPublishStatus({
      tone: 'active',
      title: `Publishing all connected platforms (${lang.toUpperCase()})`,
      detail: 'Submitting infographic albums to Postiz one platform at a time…',
    });
    for (const row of autoPlatforms) {
      patchPlatformUi(row.platform, {
        phase: 'preparing',
        message: 'Queued for publish-all…',
      });
    }
    try {
      const result = await api.publishBeatPosterAlbumAll(scriptId, lang);
      setPosters((prev) =>
        prev ? { ...prev, publishState: result.publishState } : prev,
      );
      const published = result.published ?? [];
      const failed = result.failed ?? [];
      const skipped = result.skipped ?? [];
      for (const entry of published) {
        patchPlatformUi(entry.platform, {
          phase: entry.status === 'live' ? 'live' : 'pending',
          message:
            entry.status === 'live'
              ? 'Published — post is live'
              : 'Submitted — waiting for platform approval',
          postUrl: entry.url,
          postId: entry.postId,
          error: undefined,
        });
        setPlatformPublishErrors((prev) => {
          const next = { ...prev };
          delete next[platformPublishKey(entry.platform, lang)];
          return next;
        });
      }
      for (const entry of failed) {
        const errorDetails: PublishErrorDetails = {
          summary: entry.error,
          platform: entry.platform,
          step: entry.step,
          hint: entry.hint,
          details: entry.details ?? entry.error,
        };
        patchPlatformUi(entry.platform, {
          phase: 'failed',
          message: 'Publish failed',
          error: entry.error,
          errorDetails,
        });
        setPlatformPublishErrors((prev) => ({
          ...prev,
          [platformPublishKey(entry.platform, lang)]: entry.error,
        }));
      }
      for (const entry of skipped) {
        patchPlatformUi(entry.platform, {
          phase: 'idle',
          message: entry.reason,
        });
      }
      const successCount = published.length;
      const failCount = failed.length;
      setGlobalPublishStatus({
        tone: failCount > 0 && successCount === 0 ? 'error' : 'success',
        title:
          successCount > 0
            ? `Published ${successCount} platform${successCount === 1 ? '' : 's'}`
            : 'Publish all finished',
        detail:
          failCount > 0
            ? `${successCount} succeeded · ${failCount} failed · ${skipped.length} skipped`
            : `${successCount} submitted · ${skipped.length} skipped (already live)`,
        postUrl: published[0]?.url,
      });
    } catch (publishError) {
      const errorDetails = parsePublishErrorDetails(publishError);
      setGlobalPublishStatus({
        tone: 'error',
        title: 'Publish all failed',
        detail: errorDetails.summary,
        errorDetails,
      });
    } finally {
      setBusy(null);
    }
  }, [api, autoPlatforms, lang, patchPlatformUi, scriptId]);

  const handleRevertPlatform = useCallback(
    async (platform: string) => {
      const key = platformPublishKey(platform, lang);
      setBusy(`revert-${platform}`);
      setGlobalPublishStatus({
        tone: 'active',
        title: `Reverting ${platformLabel(platform)}`,
        detail: 'Deleting post from Postiz queue and clearing local publish record…',
      });
      try {
        const result = await api.revertBeatPosterPublish(scriptId, platform, lang);
        setPosters((prev) =>
          prev ? { ...prev, publishState: result.publishState } : prev,
        );
        patchPlatformUi(platform, {
          phase: 'idle',
          message: 'Ready to publish',
          error: undefined,
          errorDetails: undefined,
          postUrl: undefined,
          postId: undefined,
        });
        setPlatformPublishErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setGlobalPublishStatus({
          tone: 'success',
          title: `${platformLabel(platform)} reverted`,
          detail: 'Removed from Postiz. You can publish again with freshly generated PNGs.',
        });
      } catch (revertError) {
        const errorDetails = parsePublishErrorDetails(revertError);
        setGlobalPublishStatus({
          tone: 'error',
          title: `Revert ${platformLabel(platform)} failed`,
          detail: errorDetails.summary,
          errorDetails,
        });
      } finally {
        setBusy(null);
      }
    },
    [api, lang, patchPlatformUi, scriptId],
  );

  const handleCopyCaption = useCallback(async (row: (typeof platformRows)[number]) => {
    const text = `${row.title}\n\n${row.body}`.trim();
    const copied = await copyToClipboard(text);
    Alert.alert(
      copied ? 'Copied' : 'Copy failed',
      copied ? `${platformLabel(row.platform)} caption copied.` : 'Clipboard unavailable.',
    );
  }, []);

  const handlePreviewSlideIndexChange = useCallback(
    (index: number) => {
      setPosterIndex(index);
      carouselRef.current?.scrollTo({
        x: index * (posterItemWidth + 16),
        animated: true,
      });
    },
    [posterItemWidth],
  );

  return (
    <View style={sharedStyles.screen}>
      <Header
        title="Infographic publish"
        actions={[
          {
            label: 'Post hub',
            onPress: () => navigateToPostProcess(scriptId),
            variant: 'back',
          },
          {
            label: 'Edit script',
            onPress: () => navigateToAnimation(scriptId),
          },
          { label: 'Platforms', onPress: navigateToPlatforms },
        ]}
      />
      <ScrollView contentContainerStyle={layoutStyles.main}>
        <View style={webModuleStyle(classes.screen)}>
          <Text style={webModuleStyle(classes.meta)}>
            One social post per platform — all beat infographics as a swipeable album. English and
            中文 are separate workflows. Upload actions are at the bottom.
          </Text>
          {error ? (
            <View style={webModuleStyle(classes.agentOfflineBanner)}>
              <Text style={styles.error}>{error}</Text>
              <Text style={webModuleStyle(classes.meta)}>
                Posters and the social publish UI need the outdoor agent on :8789. Vite on :8788 alone
                is not enough — run npm run outdoor:all, wait for [outdoor-agent] API, then Refresh.
              </Text>
              <Button
                label={loading ? 'Refreshing…' : 'Retry connection'}
                variant="primary"
                onPress={() => {
                  void load();
                }}
                disabled={loading}
              />
            </View>
          ) : null}
          {previewWarning ? <Text style={styles.warning}>{previewWarning}</Text> : null}
          {loading ? <ActivityIndicator /> : null}

          <View style={webModuleStyle(classes.sectionHeader)}>
            <SectionLabel>Language</SectionLabel>
            <View style={webModuleStyle(classes.langRow)}>
              <Button
                label="English"
                variant={lang === 'en' ? 'primary' : undefined}
                onPress={() => setLang('en')}
              />
              <Button
                label="中文"
                variant={lang === 'zh' ? 'primary' : undefined}
                onPress={() => setLang('zh')}
              />
            </View>
          </View>

          <View style={webModuleStyle(classes.actions)}>
            <Button
              label={busy === 'generate' ? 'Generating…' : 'Generate infographics'}
              variant="primary"
              onPress={() => {
                void handleGenerate();
              }}
              disabled={Boolean(busy) || !beats.length}
            />
            <Button
              label="Refresh"
              onPress={() => {
                void load();
              }}
              disabled={loading || busy === 'generate'}
            />
          </View>
          {generateProgress &&
          (busy === 'generate' ||
            generateProgress.status === 'done' ||
            generateProgress.status === 'error' ||
            generateProgress.status === 'running' ||
            generateProgress.status === 'clearing') ? (
            <View style={webModuleStyle(classes.progressCard)}>
              <View style={webModuleStyle(classes.progressTop)}>
                {busy === 'generate' ? <ActivityIndicator color={colors.orange} /> : null}
                <Text style={webModuleStyle(classes.progressLabel)}>
                  {generateProgress.percent > 0 ? `${generateProgress.percent}% · ` : ''}
                  {generateProgress.label}
                  {generateProgress.total > 0
                    ? ` (${generateProgress.current}/${generateProgress.total})`
                    : ''}
                </Text>
              </View>
              <View style={webModuleStyle(classes.progressTrack)}>
                <View
                  style={[
                    webModuleStyle(classes.progressFill),
                    {
                      width: `${Math.max(
                        0,
                        Math.min(100, generateProgress.percent || (busy === 'generate' ? 4 : 0)),
                      )}%`,
                    },
                  ]}
                />
              </View>
              {generateProgress.error ? (
                <Text style={webModuleStyle(classes.progressError)}>{generateProgress.error}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={webModuleStyle(classes.section)}>
            <SectionLabel>Publish checklist</SectionLabel>
            <View style={webModuleStyle(classes.checklist)}>
              <Text style={webModuleStyle(classes.checklistItem)}>
                1. Generate infographics — writes cover + every beat into beat-posters/english and
                beat-posters/chinese (EN + 中文), and removes leftover root PNGs/HTML.
              </Text>
              <Text style={webModuleStyle(classes.checklistItem)}>
                2. Pick language — English and 中文 are separate albums with separate captions.
              </Text>
              <Text style={webModuleStyle(classes.checklistItem)}>
                3. Review every platform caption below — copy title + body before you upload.
              </Text>
              <Text style={webModuleStyle(classes.checklistItem)}>
                4. English: connect Postiz on #/platforms (live mode), then Publish all connected.
              </Text>
              <Text style={webModuleStyle(classes.checklistItem)}>
                5. 中文: manual upload in 小红书 / 哔哩哔哩 / 抖音 etc. — same image order as the carousel.
              </Text>
            </View>
          </View>

          <View style={webModuleStyle(classes.section)}>
            <SectionLabel>Infographic set ({carouselSlides.length})</SectionLabel>
            <Text style={webModuleStyle(classes.meta)}>
              Cover + beat cards — swipe to preview the full album (cover is slide 1 in publish order).
            </Text>
            <ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={posterItemWidth + 16}
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                setPosterIndex(readCarouselIndex(event, posterItemWidth + 16));
              }}
              style={webModuleStyle(classes.carousel)}
            >
              {carouselSlides.map((entry, index) => {
                if (entry.kind === 'cover') {
                  return (
                    <View key={`cover-${lang}`} style={webModuleStyle(classes.carouselItem)}>
                      <Text style={webModuleStyle(classes.slideKindLabel)}>Cover · slide 1</Text>
                      {Platform.OS === 'web'
                        ? createElement(
                            'div',
                            {
                              className: webClassName(classes.posterExportRoot),
                              'data-beat-poster-export': 'true',
                            },
                            createElement(BeatPosterCoverSlide, entry.cover),
                          )
                        : <BeatPosterCoverSlide {...entry.cover} />}
                    </View>
                  );
                }
                const beat = beats[index - 1];
                const slide = entry.slide;
                return (
                  <View
                    key={beat?.id ?? `slide-${index}`}
                    style={webModuleStyle(classes.carouselItem)}
                  >
                    {Platform.OS === 'web'
                      ? createElement(
                          'div',
                          {
                            className: webClassName(classes.posterExportRoot),
                            'data-beat-poster-export': 'true',
                          },
                          createElement(BeatPosterSlide, slide),
                        )
                      : <BeatPosterSlide {...slide} />}
                  </View>
                );
              })}
            </ScrollView>
            <View style={webModuleStyle(classes.carouselDots)}>
              {carouselSlides.map((entry, index) => (
                <View
                  key={entry.kind === 'cover' ? `cover-dot-${lang}` : `dot-${entry.slide.beatTitle}-${index}`}
                  style={webModuleStyle(classes.dot, index === posterIndex ? classes.dotActive : null)}
                />
              ))}
            </View>
          </View>

          {Platform.OS === 'web'
            ? createElement(
                'div',
                {
                  className: webClassName(classes.exportRack),
                  'aria-hidden': true,
                },
                ...exportPacks.flatMap((pack) => [
                  createElement(
                    'div',
                    {
                      key: `export-cover-${pack.lang}`,
                      className: webClassName(classes.exportRackItem),
                      'data-beat-poster-full-export': 'true',
                      'data-beat-id': BEAT_POSTER_COVER_ID,
                      'data-lang': pack.lang,
                    },
                    createElement(BeatPosterCoverSlide, pack.cover),
                  ),
                  ...pack.slides.map((slide, slideIndex) =>
                    createElement(
                      'div',
                      {
                        key: `export-${pack.lang}-${beats[slideIndex]?.id ?? slideIndex}`,
                        className: webClassName(classes.exportRackItem),
                        'data-beat-poster-full-export': 'true',
                        'data-beat-id': beats[slideIndex]?.id,
                        'data-lang': pack.lang,
                      },
                      createElement(BeatPosterSlide, slide),
                    ),
                  ),
                ]),
              )
            : null}

          <View style={webModuleStyle(classes.section)}>
            <SectionLabel>Social feed preview</SectionLabel>
            {capturingPreview ? (
              <Text style={webModuleStyle(classes.meta)}>Exporting poster frames to JPEG for preview…</Text>
            ) : previewImageUrls.length > 0 ? (
              <Text style={webModuleStyle(classes.meta)}>
                Using live JPEG exports from the carousel ({previewImageUrls.length} slides).
              </Text>
            ) : null}
            <BeatPosterSocialFeedPreview
              lang={lang}
              platforms={platformRows}
              absoluteUrl={resolvePreviewSrc}
              slideIndex={posterIndex}
              onSlideIndexChange={handlePreviewSlideIndexChange}
              platformLifecycle={(platform, publishMode) => uiForPlatform(platform, publishMode)}
            />
          </View>

          <View style={webModuleStyle(classes.section)}>
            <SectionLabel>Caption review ({platformRows.length} platforms)</SectionLabel>
            <Text style={webModuleStyle(classes.meta)}>
              {lang === 'zh'
                ? `中文专辑 — 小红书 / 抖音 / 快手可通过 SAU 自动发图文（需 #/platforms 开启 SAU live）。哔哩 / 微博 / 视频号仍手动上传。`
                : 'English album — Postiz auto-publish when connected; copy captions to double-check before posting.'}
            </Text>
            {autoPlatforms.length > 0 ? (
              <Text style={webModuleStyle(classes.reviewGroupLabel)}>
                Auto via Postiz ({autoPlatforms.length})
              </Text>
            ) : null}
            {autoPlatforms.map((row) => {
              const published = publishRecordFor(row.platform);
              const lifecycle = uiForPlatform(row.platform, 'auto');
              const isPublishing = busy === `publish-${row.platform}`;
              return (
                <View key={row.platform} style={webModuleStyle(classes.reviewCard)}>
                  <View style={webModuleStyle(classes.reviewHeader)}>
                    <Text style={webModuleStyle(classes.reviewPlatform)}>{platformLabel(row.platform)}</Text>
                    <Text style={webModuleStyle(classes.reviewBadge, classes.reviewBadgeAuto)}>
                      {row.provider === 'sau' ? 'SAU · auto' : 'Postiz · auto'}
                    </Text>
                    {published ? (
                      <Text style={webModuleStyle(classes.reviewBadge, classes.reviewBadgeLive)}>
                        {publishStatusLabel(published)}
                      </Text>
                    ) : null}
                  </View>
                  <BeatPosterPublishLifecycle
                    platform={row.platform}
                    publishMode="auto"
                    ui={lifecycle}
                    compact={isPublishing}
                    canRevert={Boolean(published?.postId)}
                    revertBusy={busy === `revert-${row.platform}`}
                    onRevert={() => {
                      void handleRevertPlatform(row.platform);
                    }}
                  />
                  <Text style={webModuleStyle(classes.reviewMeta)}>
                    {row.imageCount} images · {(row.characterCount ?? `${row.title}\n\n${row.body}`.length)} chars
                  </Text>
                  <Text style={webModuleStyle(classes.reviewTitleLabel)}>Title</Text>
                  <Text style={webModuleStyle(classes.reviewTitle)}>{row.title}</Text>
                  <Text style={webModuleStyle(classes.reviewTitleLabel)}>Caption</Text>
                  <Text style={webModuleStyle(classes.reviewBody)}>{row.body}</Text>
                  {(row.reviewNotes ?? []).map((note) => (
                    <Text key={`${row.platform}-${note}`} style={webModuleStyle(classes.reviewNote)}>
                      · {note}
                    </Text>
                  ))}
                  <View style={webModuleStyle(classes.thumbStrip)}>
                    {row.imageUrls.slice(0, 6).map((url, index) =>
                      Platform.OS === 'web' ? (
                        createElement('img', {
                          key: `${row.platform}-${index}`,
                          src: resolvePreviewSrc(previewImageUrls[index] ?? url),
                          alt: `${row.platform}-${index + 1}`,
                          className: webClassName(classes.thumb),
                        })
                      ) : null,
                    )}
                    {row.imageUrls.length > 6 ? (
                      <Text style={webModuleStyle(classes.reviewMeta)}>+{row.imageUrls.length - 6} more</Text>
                    ) : null}
                  </View>
                  <View style={webModuleStyle(classes.reviewActions)}>
                    <Button
                      label="Copy caption"
                      onPress={() => {
                        void handleCopyCaption(row);
                      }}
                    />
                    <Button
                      label={
                        busy === `publish-${row.platform}`
                          ? 'Publishing…'
                          : published
                            ? `${platformLabel(row.platform)} ✓`
                            : `Publish ${platformLabel(row.platform)}`
                      }
                      variant="primary"
                      onPress={() => {
                        void handlePublishPlatform(row.platform);
                      }}
                      disabled={Boolean(busy) || Boolean(published)}
                    />
                  </View>
                </View>
              );
            })}
            {manualPlatforms.length > 0 ? (
              <Text style={webModuleStyle(classes.reviewGroupLabel)}>
                Manual upload ({manualPlatforms.length})
              </Text>
            ) : null}
            {manualPlatforms.map((row) => {
              const published = publishRecordFor(row.platform);
              const lifecycle = uiForPlatform(row.platform, 'manual');
              return (
              <View key={row.platform} style={webModuleStyle(classes.reviewCard)}>
                <View style={webModuleStyle(classes.reviewHeader)}>
                  <Text style={webModuleStyle(classes.reviewPlatform)}>{platformLabel(row.platform)}</Text>
                  <Text style={webModuleStyle(classes.reviewBadge, classes.reviewBadgeManual)}>Manual</Text>
                </View>
                <BeatPosterPublishLifecycle
                  platform={row.platform}
                  publishMode="manual"
                  ui={lifecycle}
                  compact
                />
                <Text style={webModuleStyle(classes.reviewMeta)}>
                  {row.imageCount} images · {row.characterCount} chars
                </Text>
                <Text style={webModuleStyle(classes.reviewTitleLabel)}>Title</Text>
                <Text style={webModuleStyle(classes.reviewTitle)}>{row.title}</Text>
                <Text style={webModuleStyle(classes.reviewTitleLabel)}>Caption</Text>
                <Text style={webModuleStyle(classes.reviewBody)}>{row.body}</Text>
                {(row.reviewNotes ?? []).map((note) => (
                  <Text key={`${row.platform}-${note}`} style={webModuleStyle(classes.reviewNote)}>
                    · {note}
                  </Text>
                ))}
                <View style={webModuleStyle(classes.thumbStrip)}>
                  {row.imageUrls.slice(0, 6).map((url, index) =>
                    Platform.OS === 'web' ? (
                      createElement('img', {
                        key: `${row.platform}-m-${index}`,
                        src: resolvePreviewSrc(previewImageUrls[index] ?? url),
                        alt: `${row.platform}-${index + 1}`,
                        className: webClassName(classes.thumb),
                      })
                    ) : null,
                  )}
                </View>
                <View style={webModuleStyle(classes.reviewActions)}>
                  <Button
                    label="Copy caption"
                    variant="primary"
                    onPress={() => {
                      void handleCopyCaption(row);
                    }}
                  />
                </View>
              </View>
              );
            })}
          </View>

          {globalPublishStatus ? (
            <BeatPosterPublishGlobalBar
              title={globalPublishStatus.title}
              detail={globalPublishStatus.detail}
              tone={globalPublishStatus.tone}
              postUrl={globalPublishStatus.postUrl}
              errorDetails={globalPublishStatus.errorDetails}
            />
          ) : null}

          <View style={webModuleStyle(classes.publishBar)}>
            <SectionLabel>Publish album</SectionLabel>
            <Text style={webModuleStyle(classes.meta)}>
              {lang === 'en'
                ? `Posts all ${carouselSlides.length} infographics (cover + beats) to Postiz using the PNGs from Generate. Connect platforms on #/platforms first.`
                : `中文专辑 — SAU 自动发 12 张图文到已登录的小红书 / 抖音 / 快手（#/platforms 开启 SAU live）。每次发布会重新生成 PNG。`}
            </Text>
            {autoPlatforms.length > 0 ? (
              <View style={webModuleStyle(classes.platformPublishRow)}>
                <Button
                  label={
                    busy === 'publish-all'
                      ? 'Publishing…'
                      : lang === 'zh'
                        ? 'Publish all connected (中文)'
                        : 'Publish all connected (EN)'
                  }
                  variant="primary"
                  onPress={() => {
                    void handlePublishAll();
                  }}
                  disabled={Boolean(busy)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.offline,
    marginBottom: spacing.md,
    fontSize: typography.small,
  },
  warning: {
    color: '#fcd34d',
    marginBottom: spacing.md,
    fontSize: typography.small,
    lineHeight: 18,
  },
});
