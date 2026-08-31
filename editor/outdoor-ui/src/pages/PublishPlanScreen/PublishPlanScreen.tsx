import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Header } from '../../components/Header/Header';
import { SectionLabel } from '../../components/SectionLabel/SectionLabel';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import type { NewAccountPublishPlan, VideoOpsCatalogSeries } from '../../types';
import { webModuleStyle } from '../../utils/webClassName';
import classes from './PublishPlanScreen.module.scss';

const PLATFORMS = [
  'any',
  'xiaohongshu',
  'bilibili',
  'douyin',
  'weibo',
  'wechat_channels',
  'wechat',
  'kuaishou',
  'youtube',
  'instagram',
  'tiktok',
  'x',
  'linkedin',
  'facebook',
  'bluesky',
  'threads',
  'reddit',
] as const;

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PublishPlanScreen() {
  const { api } = useOutdoorUi();
  const {
    navigateToLibrary,
    navigateToPlatforms,
    navigateToMassPublish,
    navigateToBeatPosters,
    navigateToScript,
  } = useOutdoorRoute();
  const [seriesList, setSeriesList] = useState<VideoOpsCatalogSeries[]>([]);
  const [seriesId, setSeriesId] = useState('abstract_algebra_in_proof_assistant');
  const [platform, setPlatform] = useState('any');
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [replicaCount, setReplicaCount] = useState(1);
  const [plan, setPlan] = useState<NewAccountPublishPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPlan, seriesPayload] = await Promise.all([
        api.getNewAccountPublishPlan({ seriesId, platform, lang, replicaCount }),
        api.getSeries(),
      ]);
      setPlan(nextPlan);
      setSeriesList(seriesPayload);
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [api, lang, platform, replicaCount, seriesId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const seriesOptions = useMemo(() => {
    const options = [{ id: 'all', title: 'All series' }];
    for (const series of seriesList) {
      options.push({ id: series.id, title: series.title });
    }
    return options;
  }, [seriesList]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setNote(null);
    try {
      const saved = await api.saveNewAccountPublishPlan({
        seriesId,
        platform,
        lang,
        replicaCount,
      });
      setPlan(saved.plan);
      setNote(`Saved ${saved.id}`);
    } catch (saveError) {
      setError(formatOutdoorApiError(saveError));
    } finally {
      setSaving(false);
    }
  }, [api, lang, platform, replicaCount, seriesId]);

  const handleCopy = useCallback(async () => {
    if (!plan) {
      return;
    }
    const ok = await copyText(JSON.stringify(plan, null, 2));
    setNote(ok ? 'Plan JSON copied' : 'Could not copy');
  }, [plan]);

  return (
    <View style={webModuleStyle(classes.screen)}>
      <View style={webModuleStyle(classes.headerWrap)}>
        <Header
          title="New-account publish plan"
          subtitle="One chronological feed. Bind accounts later."
          actions={[
            { label: 'Library', onPress: navigateToLibrary, variant: 'back' },
            { label: 'Platforms', onPress: navigateToPlatforms },
            { label: 'Mass publish', onPress: navigateToMassPublish },
            {
              label: loading ? 'Planning…' : 'Rebuild',
              onPress: () => {
                void loadPlan();
              },
              disabled: loading,
            },
          ]}
        />
      </View>
      <ScrollView style={webModuleStyle(classes.pageScroll)} contentContainerStyle={webModuleStyle(classes.body)}>
        <Text style={webModuleStyle(classes.lead)}>
          Treat each social account as a product people open and scroll. This plan publishes
          episode 1 before episode 2, notes before the lecture. The same order applies to a
          platform you add later, or to matrix accounts that are not connected yet.
        </Text>

        <SectionLabel>Series</SectionLabel>
        <View style={webModuleStyle(classes.chipRow)}>
          {seriesOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setSeriesId(option.id)}
              style={webModuleStyle(
                classes.chip,
                seriesId === option.id ? classes.chipOn : null,
              )}
            >
              <Text style={webModuleStyle(classes.chipText)}>{option.title}</Text>
            </Pressable>
          ))}
        </View>

        <SectionLabel>Platform (or any — bind later)</SectionLabel>
        <View style={webModuleStyle(classes.chipRow)}>
          {PLATFORMS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setPlatform(id)}
              style={webModuleStyle(classes.chip, platform === id ? classes.chipOn : null)}
            >
              <Text style={webModuleStyle(classes.chipText)}>{id}</Text>
            </Pressable>
          ))}
        </View>

        <SectionLabel>Language</SectionLabel>
        <View style={webModuleStyle(classes.chipRow)}>
          <Pressable
            onPress={() => setLang('zh')}
            style={webModuleStyle(classes.chip, lang === 'zh' ? classes.chipOn : null)}
          >
            <Text style={webModuleStyle(classes.chipText)}>China</Text>
          </Pressable>
          <Pressable
            onPress={() => setLang('en')}
            style={webModuleStyle(classes.chip, lang === 'en' ? classes.chipOn : null)}
          >
            <Text style={webModuleStyle(classes.chipText)}>English</Text>
          </Pressable>
        </View>

        <SectionLabel>Matrix replicas</SectionLabel>
        <View style={webModuleStyle(classes.chipRow)}>
          {[1, 2, 3, 5].map((count) => (
            <Pressable
              key={count}
              onPress={() => setReplicaCount(count)}
              style={webModuleStyle(
                classes.chip,
                replicaCount === count ? classes.chipOn : null,
              )}
            >
              <Text style={webModuleStyle(classes.chipText)}>
                {count === 1 ? '1 account' : `${count} accounts`}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
        {note ? <Text style={webModuleStyle(classes.note)}>{note}</Text> : null}

        {loading && !plan ? (
          <ActivityIndicator style={webModuleStyle(classes.spinner)} />
        ) : null}

        {plan ? (
          <>
            <SectionLabel>Account slots (not connected)</SectionLabel>
            <View style={webModuleStyle(classes.slotRow)}>
              {plan.accountSlots.map((slot) => (
                <View key={slot.accountId} style={webModuleStyle(classes.slotCard)}>
                  <Text style={webModuleStyle(classes.slotTitle)}>{slot.label}</Text>
                  <Text style={webModuleStyle(classes.slotMeta)}>
                    {slot.platform} · bind when the login exists
                  </Text>
                </View>
              ))}
            </View>

            <View style={webModuleStyle(classes.summaryRow)}>
              <Badge label={`${plan.summary.episodeCount} episodes`} />
              <Badge label={`${plan.summary.postCount} posts`} />
              <Badge label={`${plan.summary.readyCount} ready`} />
              <Badge label={`${plan.summary.blockedCount} blocked`} />
            </View>

            <View style={webModuleStyle(classes.actions)}>
              <Button label={saving ? 'Saving…' : 'Save plan'} onPress={() => { void handleSave(); }} disabled={saving} />
              <Button label="Copy JSON" onPress={() => { void handleCopy(); }} />
            </View>

            <SectionLabel>Oldest first — this is the public feed</SectionLabel>
            {plan.posts.map((post) => (
              <Pressable
                key={`${post.index}-${post.scriptId}-${post.kind}`}
                onPress={() => {
                  if (post.kind === 'infographic') {
                    navigateToBeatPosters(post.scriptId);
                    return;
                  }
                  navigateToScript(post.scriptId);
                }}
                style={webModuleStyle(classes.postCard)}
              >
                <View style={webModuleStyle(classes.postHead)}>
                  <Text style={webModuleStyle(classes.postIndex)}>#{post.index}</Text>
                  <Badge label={post.kind} />
                  <Badge label={post.ready ? 'ready' : 'blocked'} />
                </View>
                <Text style={webModuleStyle(classes.postTitle)}>{post.title}</Text>
                <Text style={webModuleStyle(classes.postMeta)}>
                  {post.seriesTitle}
                  {post.episodeIndex !== null ? ` · ep ${post.episodeIndex}` : ''}
                  {` · ${post.scriptId}`}
                </Text>
                <Text style={webModuleStyle(classes.postReason)}>{post.reason}</Text>
                {post.blockers.length > 0 ? (
                  <Text style={webModuleStyle(classes.blockers)}>{post.blockers.join(' · ')}</Text>
                ) : null}
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
