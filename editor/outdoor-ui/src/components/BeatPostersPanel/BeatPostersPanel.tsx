export type { BeatPostersPanelProps } from './BeatPostersPanel.types';

import classes from './BeatPostersPanel.module.scss';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import type { BeatPostersPanelProps } from './BeatPostersPanel.types';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { BeatPosterSlide } from '../BeatPosterSlide/BeatPosterSlide';
import type { BeatPosterLang } from '../BeatPosterSlide/BeatPosterSlide.types';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import type { BeatPostersResponse } from '../../types';
import { liveBeatToPosterSlides, stampPosterSlidePages } from '../../utils/beatPosterModel';
import { platformLabel } from '../../utils/format';

const POSTIZ_IMAGE_PLATFORMS = [
  'x',
  'linkedin',
  'instagram',
  'facebook',
  'bluesky',
  'threads',
  'reddit',
  'tiktok',
] as const;

export function BeatPostersPanel({
  scriptId,
  liveBeats,
  seriesTitle,
  episodeTitleEn,
  episodeTitleZh,
}: BeatPostersPanelProps) {
  const { api } = useOutdoorUi();
  const [lang, setLang] = useState<BeatPosterLang>('en');
  const [data, setData] = useState<BeatPostersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.getBeatPosters(scriptId);
      setData(next);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, scriptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const posterByBeat = useMemo(() => {
    const map = new Map<string, { pngUrl: string; lang: BeatPosterLang }>();
    for (const poster of data?.posters ?? []) {
      if (poster.lang === lang) {
        map.set(poster.beatId, { pngUrl: poster.pngUrl, lang: poster.lang });
      }
    }
    return map;
  }, [data?.posters, lang]);

  const slides = useMemo(() => {
    return stampPosterSlidePages(
      liveBeats.flatMap((beat, index) =>
        liveBeatToPosterSlides({
          beat,
          nextBeat: liveBeats[index + 1] ?? null,
          lang,
          seriesTitle,
          episodeTitleEn,
          episodeTitleZh,
          beatCount: liveBeats.length,
        }),
      ),
    );
  }, [episodeTitleEn, episodeTitleZh, lang, liveBeats, seriesTitle]);

  const handleGenerateAll = useCallback(async () => {
    setBusy('generate-all');
    try {
      const next = await api.generateBeatPosters(scriptId);
      setData(next);
      Alert.alert(
        'Beat posters',
        `Generated ${next.posters.length} PNGs in beat-posters/english and beat-posters/chinese (${liveBeats.length} beats × EN + 中文).`,
      );
    } catch (error) {
      Alert.alert(
        'Generate failed',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(null);
    }
  }, [api, liveBeats.length, scriptId]);

  const handlePublish = useCallback(
    async (beatId: string, platform: string) => {
      setBusy(`publish-${beatId}-${platform}`);
      try {
        const result = await api.publishBeatPoster(scriptId, beatId, platform, lang);
        setData((prev) =>
          prev
            ? { ...prev, publishState: result.publishState }
            : prev,
        );
        Alert.alert('Published', `${platformLabel(platform)} · ${lang.toUpperCase()}`);
      } catch (error) {
        Alert.alert(
          'Publish failed',
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setBusy(null);
      }
    },
    [api, lang, scriptId],
  );

  const publishFor = (beatId: string, platform: string) => {
    return (data?.publishState?.posts ?? []).find(
      (entry) =>
        entry.beatId === beatId &&
        entry.platform === platform &&
        entry.lang === lang &&
        (entry.status === 'live' || entry.status === 'pending'),
    );
  };

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <View style={webModuleStyle(classes.headerRow)}>
        <SectionLabel>Beat posters (image workflow)</SectionLabel>
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
      <Text style={webModuleStyle(classes.meta)}>
        4:3 portrait cards per beat — read without watching the video. Separate from take/video
        publish. Postiz image platforms only (not YouTube). Soft turn-lang.com narrative in each
        poster.
      </Text>
      <View style={webModuleStyle(classes.actions)}>
        <Button
          label={busy === 'generate-all' ? 'Generating…' : 'Generate all beat posters'}
          variant="primary"
          onPress={() => {
            void handleGenerateAll();
          }}
          disabled={busy === 'generate-all' || !liveBeats.length}
        />
        <Button
          label="Refresh"
          onPress={() => {
            void load();
          }}
          disabled={loading}
        />
      </View>
      {loading ? <ActivityIndicator /> : null}
      {!loading && !liveBeats.length ? (
        <Text style={webModuleStyle(classes.meta)}>No beats in animation.md yet.</Text>
      ) : null}
      <ScrollView horizontal={false}>
        <View style={webModuleStyle(classes.grid)}>
          {slides.map((slide) => {
            const png = posterByBeat.get(slide.posterId);
            return (
              <View key={`${slide.posterId}-${lang}`} style={webModuleStyle(classes.card)}>
                <Text style={webModuleStyle(classes.cardTitle)}>
                  {slide.beatTitle}
                </Text>
                <Text style={webModuleStyle(classes.cardMeta)}>
                  {lang === 'zh' ? '中文 poster' : 'English poster'} · 1080×1440
                  {png ? ' · PNG ready' : ' · preview only until Generate'}
                </Text>
                <View style={webModuleStyle(classes.previewRow)}>
                  <BeatPosterSlide {...slide} compact />
                  {png && Platform.OS === 'web' ? (
                    createElement('img', {
                      src: api.absoluteUrl(png.pngUrl),
                      alt: `${slide.posterId}-${lang}`,
                      className: webClassName(classes.pngPreview),
                    })
                  ) : null}
                </View>
                <View style={webModuleStyle(classes.platformRow)}>
                  {POSTIZ_IMAGE_PLATFORMS.map((platform) => {
                    const published = publishFor(slide.posterId, platform);
                    const key = `publish-${slide.posterId}-${platform}`;
                    return (
                      <Pressable key={platform}>
                        <Button
                          label={
                            busy === key
                              ? '…'
                              : published
                                ? `${platformLabel(platform)} ✓`
                                : platformLabel(platform)
                          }
                          onPress={() => {
                            void handlePublish(slide.posterId, platform);
                          }}
                          disabled={Boolean(busy) || Boolean(published)}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
