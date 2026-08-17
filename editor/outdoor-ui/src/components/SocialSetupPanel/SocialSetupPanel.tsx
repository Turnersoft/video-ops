export type { SocialSetupPanelProps } from './SocialSetupPanel.types';

import classes from './SocialSetupPanel.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { SocialSetupPanelProps } from './SocialSetupPanel.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { colors, radii, spacing, typography } from '../../theme';
import type {
  CoversListResponse,
  PlatformStatus,
  PublishPlan,
  PublishPlanPlatform,
  PublishRecord,
  PublishState,
  SocialPosts,
} from '../../types';
import { fmtDate, platformLabel, publishStatusLabel } from '../../utils/format';
import { cardsFromSocialPosts, type SocialPreviewCard } from '../../utils/socialPreviewCards';
import { pickSocialCopyForPreview } from '../../utils/socialCopyMerge';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';

type DraftCard = SocialPreviewCard;

function cardsFromSocial(social: SocialPosts): DraftCard[] {
  return cardsFromSocialPosts(social);
}

function postizSettingsSummary(
  settings: Record<string, unknown> | null | undefined,
): string {
  if (!settings) {
    return '';
  }
  return Object.entries(settings)
    .filter(([key, value]) => key !== '__type' && value !== null && value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length ? `${key}=${JSON.stringify(value)}` : '';
      }
      if (typeof value === 'object') {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${String(value)}`;
    })
    .filter(Boolean)
    .join(' · ');
}

function patchFromCards(cards: DraftCard[]) {
  const patch: {
    titleEnglish?: string;
    titleChina?: string;
    title?: string;
    english: Record<string, { title?: string; body?: string }>;
    china: Record<string, { title?: string; body?: string }>;
  } = {
    english: {},
    china: {},
  };
  for (const card of cards) {
    if (card.group === 'headline') {
      if (card.platform === 'EN') {
        patch.titleEnglish = card.title;
        patch.title = card.title;
      }
      if (card.platform === 'ZH') {
        patch.titleChina = card.title;
      }
      continue;
    }
    patch[card.group][card.platform] = {
      title: card.title,
      body: card.body,
    };
  }
  return patch;
}

function latestPublishPost(publish: PublishState | null | undefined, platform: string): PublishRecord | null {
  const posts = (publish?.posts ?? []).filter((entry) => entry.platform === platform);
  if (!posts.length) {
    return null;
  }
  const live = posts.find((entry) => entry.status === 'live');
  if (live) {
    return live;
  }
  return [...posts].sort((a, b) =>
    String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? '')),
  )[0];
}

function isPlatformPublishReady(
  plan: PublishPlanPlatform | null | undefined,
): boolean {
  return Boolean(plan?.canPublish);
}

export function SocialSetupPanel({
  jobId,
  scriptId,
  social: socialProp,
  status = 'review',
  covers: coversProp,
  publish: publishProp,
}: SocialSetupPanelProps) {
  const { layout,  api, invalidateAll  } = useOutdoorUi();
  const { navigateToPlatforms } = useOutdoorRoute();
  const layoutStyles = layoutStylesFor(layout);
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [social, setSocial] = useState<SocialPosts | null>(socialProp ?? null);
  const [covers, setCovers] = useState<CoversListResponse | null>(coversProp ?? null);
  const [publish, setPublish] = useState<PublishState | null>(publishProp ?? null);
  const [publishPlan, setPublishPlan] = useState<PublishPlan | null>(null);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(!socialProp);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [preparingPublish, setPreparingPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coversKey = useMemo(
    () =>
      (coversProp?.covers ?? [])
        .map((cover) => `${cover.id}:${cover.url}:${cover.label}`)
        .join('|'),
    [coversProp],
  );
  const socialKey = useMemo(
    () => JSON.stringify(socialProp ?? null),
    [socialProp],
  );

  // Parent may pass a new covers/social object each poll — only adopt when contents change.
  useEffect(() => {
    if (coversProp) {
      setCovers(coversProp);
    }
  }, [coversKey, coversProp]);

  useEffect(() => {
    if (socialProp) {
      setSocial(socialProp);
      setCards(cardsFromSocial(socialProp));
    }
  }, [socialKey, socialProp]);

  useEffect(() => {
    if (publishProp) {
      setPublish(publishProp);
    }
  }, [publishProp]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [
        takeSocial,
        scriptSocial,
        coverPack,
        jobDetail,
        plan,
        platformHealth,
      ] = await Promise.all([
        api.getSocial(jobId).catch(() => null),
        api.getScriptSocialPosts(scriptId).catch(() => null),
        api.getCovers(jobId).catch(() => ({
          covers: [],
          platformCovers: {},
        })),
        api.getJob(jobId).catch(() => null),
        api.getPublishPreview(jobId).catch(() => null),
        api.getPlatformsHealth().catch(() => null),
      ]);
      const socialPack = pickSocialCopyForPreview(takeSocial, scriptSocial);
      setSocial(socialPack);
      setCards(socialPack ? cardsFromSocial(socialPack) : []);
      setCovers(coverPack);
      setPublish(jobDetail && 'publish' in jobDetail ? jobDetail.publish : null);
      setPublishPlan(plan);
      setPlatformStatuses(platformHealth?.entries ?? platformHealth?.platforms ?? []);
    } catch (loadError) {
      setSocial(null);
      setCards([]);
      setError(loadError instanceof Error ? loadError.message : 'Social pack unavailable');
    } finally {
      setLoading(false);
    }
  }, [api, jobId, scriptId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!publishing) {
      return;
    }
    const timer = setInterval(() => {
      void api.getJob(jobId).then((detail) => {
        if ('publish' in detail) {
          setPublish(detail.publish);
        }
      }).catch(() => {
        // The active publish request remains the source of truth.
      });
    }, 750);
    return () => clearInterval(timer);
  }, [api, jobId, publishing]);

  const updateField = (
    group: DraftCard['group'],
    platform: string,
    field: 'title' | 'body',
    value: string,
  ) => {
    setCards((prev) =>
      prev.map((card) =>
        card.group === group && card.platform === platform ? { ...card, [field]: value } : card,
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const next = await api.patchSocial(jobId, patchFromCards(cards));
      setSocial(next);
      setCards(cardsFromSocial(next));
      invalidateAll();
      Alert.alert('Saved', 'Social edits saved to this take.');
    } catch (saveError) {
      Alert.alert('Save failed', saveError instanceof Error ? saveError.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  /** Persist UI edits so publish uses the same copy shown on screen. */
  const saveDraftSilent = async () => {
    const next = await api.patchSocial(jobId, patchFromCards(cards));
    setSocial(next);
    setCards(cardsFromSocial(next));
  };

  const publishAll = async () => {
    setPublishing(true);
    try {
      await saveDraftSilent();
      const summary = await api.publishAll(jobId);
      await api.refreshPublishStatus(jobId).catch(() => null);
      invalidateAll();
      await load();
      Alert.alert(
        'Publish all',
        [
          `Submitted: ${summary.published.map((entry) => entry.platform).join(', ') || 'none'}`,
          `Skipped already live/pending: ${summary.skippedLive.join(', ') || 'none'}`,
          `Skipped no title: ${summary.skippedNoTitle.join(', ') || 'none'}`,
          `Not connected/ready: ${summary.skippedUnavailable.map((entry) => `${entry.platform} (${entry.reason})`).join('; ') || 'none'}`,
          `Failed: ${summary.failed.map((entry) => `${entry.platform} (${entry.error})`).join('; ') || 'none'}`,
        ].join('\n'),
      );
    } catch (publishError) {
      Alert.alert(
        'Publish all',
        publishError instanceof Error ? publishError.message : 'Publish all failed',
      );
    } finally {
      setPublishing(false);
    }
  };

  const publishPlatform = async (platform: string, action: 'publish' | 'hide' | 'delete') => {
    setPublishing(true);
    try {
      if (action === 'publish') {
        await saveDraftSilent();
        await api.publishJob(jobId, platform);
        await api.refreshPublishStatus(jobId).catch(() => null);
      } else if (action === 'hide') {
        await api.hidePost(jobId, platform);
      } else {
        await api.deletePost(jobId, platform);
      }
      invalidateAll();
      await load();
    } catch (publishError) {
      Alert.alert(
        platform,
        publishError instanceof Error ? publishError.message : 'Publish action failed',
      );
    } finally {
      setPublishing(false);
    }
  };

  const preparePublishing = async () => {
    setPreparingPublish(true);
    try {
      await api.prepareForPublish();
      await load();
      Alert.alert(
        'Publishing enabled',
        'Postiz channels synced and live publish is on for Postiz and SAU.',
      );
    } catch (prepareError) {
      Alert.alert(
        'Enable publishing',
        prepareError instanceof Error ? prepareError.message : String(prepareError),
      );
    } finally {
      setPreparingPublish(false);
    }
  };

  const refreshPostizStatus = async () => {
    setRefreshingStatus(true);
    try {
      const next = await api.refreshPublishStatus(jobId);
      setPublish(next);
      invalidateAll();
    } catch (refreshError) {
      Alert.alert(
        'Postiz status',
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh Postiz status',
      );
    } finally {
      setRefreshingStatus(false);
    }
  };

  const englishCards = cards.filter(
    (card) => card.group === 'english' || (card.group === 'headline' && card.platform === 'EN'),
  );
  const chinaCards = cards.filter(
    (card) => card.group === 'china' || (card.group === 'headline' && card.platform === 'ZH'),
  );
  const planByPlatform = useMemo(
    () =>
      new Map(
        (publishPlan?.platforms ?? []).map((entry) => [entry.platform, entry]),
      ),
    [publishPlan],
  );
  const statusByPlatform = useMemo(
    () => new Map(platformStatuses.map((entry) => [entry.platform, entry])),
    [platformStatuses],
  );
  const publishableCount = (publishPlan?.platforms ?? []).filter((entry) =>
    isPlatformPublishReady(entry),
  ).length;
  const publishGateSummary = useMemo(() => {
    if (publishableCount > 0) {
      return null;
    }
    const blockers = new Set<string>();
    for (const entry of publishPlan?.platforms ?? []) {
      for (const blocker of entry.blockers) {
        blockers.add(blocker);
      }
    }
    if (blockers.size) {
      return [...blockers].slice(0, 3).join(' · ');
    }
    if (publishPlan?.error) {
      return publishPlan.error;
    }
    return 'Click Enable publishing below (syncs Postiz + turns on live mode).';
  }, [publishPlan, publishableCount]);

  if (loading) {
    return (
      <View style={webModuleStyle(classes.wrap)}>
        <SectionLabel>Social setup</SectionLabel>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (!social) {
    return (
      <View style={webModuleStyle(classes.wrap)}>
        <SectionLabel>Social setup · {status}</SectionLabel>
        <Text style={webModuleStyle(classes.meta)}>
          Social copy appears once the social stage finishes. Cut / Align / Composite above stay
          usable meanwhile.
        </Text>
        {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
        <Text style={webModuleStyle(classes.meta)}>
          Upload covers and preview titles in the Social publish preview section above.
        </Text>
      </View>
    );
  }

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <SectionLabel>Social setup · {status}</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>
        Edit AI copy lightly · Publish auto-saves first so Postiz gets what you see
        {social.updatedAt ? ` · updated ${fmtDate(social.updatedAt)}` : ''}
      </Text>
      <Text style={webModuleStyle(classes.meta)}>
        {publishableCount
          ? `${publishableCount} platform(s) ready to publish · upload and status stay visible here`
          : publishGateSummary ?? 'No platform is ready to publish yet.'}
      </Text>

      <View style={layoutStyles.pipelineToolbar}>
        <Button
          label={saving ? 'Saving…' : 'Save social edits'}
          onPress={() => void save()}
          variant="primary"
          disabled={saving || publishing}
        />
        <Button
          label={
            preparingPublish
              ? 'Enabling…'
              : publishableCount
                ? 'Publishing enabled'
                : 'Enable publishing'
          }
          onPress={() => void preparePublishing()}
          variant="primary"
          disabled={saving || publishing || preparingPublish || publishableCount > 0}
        />
        <Button
          label={publishing ? 'Submitting…' : 'Submit all connected'}
          onPress={() => void publishAll()}
          disabled={saving || publishing || publishableCount === 0}
        />
        <Button label="Manage connections" onPress={navigateToPlatforms} />
        <Button
          label={refreshingStatus ? 'Refreshing status…' : 'Refresh Postiz status'}
          onPress={() => void refreshPostizStatus()}
          disabled={refreshingStatus || publishing}
        />
      </View>

      <Text style={webModuleStyle(classes.groupLabel)}>English</Text>
      <View style={layoutStyles.socialGrid}>
        {englishCards.map((card) => (
          <View key={`en-${card.group}-${card.platform}`} style={layoutStyles.gridItemHalf}>
            <SocialFieldCard
              card={card}
              publish={publish}
              publishing={publishing}
              plan={planByPlatform.get(card.platform) ?? null}
              connection={statusByPlatform.get(card.platform) ?? null}
              cardStyle={layoutStyles.socialCard}
              onFieldChange={updateField}
              onPublish={(platform, action) => void publishPlatform(platform, action)}
            />
          </View>
        ))}
      </View>

      <Text style={webModuleStyle(classes.groupLabel)}>中文 / China</Text>
      <View style={layoutStyles.socialGrid}>
        {chinaCards.map((card) => (
          <View key={`zh-${card.group}-${card.platform}`} style={layoutStyles.gridItemHalf}>
            <SocialFieldCard
              card={card}
              publish={publish}
              publishing={publishing}
              plan={planByPlatform.get(card.platform) ?? null}
              connection={statusByPlatform.get(card.platform) ?? null}
              cardStyle={layoutStyles.socialCard}
              onFieldChange={updateField}
              onPublish={(platform, action) => void publishPlatform(platform, action)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SocialFieldCard({
  card,
  publish,
  publishing,
  plan,
  connection,
  cardStyle,
  onFieldChange,
  onPublish,
}: {
  card: DraftCard;
  publish: PublishState | null;
  publishing: boolean;
  plan: PublishPlanPlatform | null;
  connection: PlatformStatus | null;
  cardStyle: object;
  onFieldChange: (
    group: DraftCard['group'],
    platform: string,
    field: 'title' | 'body',
    value: string,
  ) => void;
  onPublish: (platform: string, action: 'publish' | 'hide' | 'delete') => void;
}) {
  const post = card.titleOnly ? null : latestPublishPost(publish, card.platform);
  const status = publishStatusLabel(post);
  const isLive = post?.status === 'live';
  const isPostiz =
    plan?.provider === 'postiz' || connection?.provider === 'postiz';
  const isSau =
    plan?.provider === 'social-auto-upload' ||
    connection?.provider === 'social-auto-upload';
  const interactive = card.titleOnly || isPlatformPublishReady(plan);
  const isConnected = isPlatformPublishReady(plan);
  const canManagePost = !isPostiz || isConnected;
  const blockedReason = !interactive
    ? plan?.blockers[0] ?? 'Platform is not ready to publish'
    : null;
  const connectionLabel = isPostiz
    ? connection?.status === 'connected' && connection.mode === 'live'
      ? `Connected · ${connection.accountLabel ?? 'Postiz channel'}`
      : connection?.status === 'configured'
        ? 'Connected in Postiz — Sync channels on Platforms'
        : 'Not connected'
    : isSau
      ? connection?.status === 'configured' || connection?.status === 'connected'
        ? connection.mode === 'live'
          ? `Logged in · ${connection.accountLabel ?? 'SAU'}`
          : `Logged in · enable SAU live on Platforms`
        : 'Not logged in — run sau login'
      : connection
        ? `${connection.status} · ${connection.accountLabel ?? connection.provider}`
        : null;

  return (
    <View style={[cardStyle, !interactive && !card.titleOnly ? { opacity: 0.62 } : null]}>
      <Text style={webModuleStyle(classes.platform)}>{platformLabel(card.platform, card.group)}</Text>
      {!card.titleOnly && connectionLabel ? (
        <Text
          style={webModuleStyle(
            isConnected ? classes.connectionReady : classes.connectionBlocked,
          )}
        >
          {connectionLabel}
        </Text>
      ) : null}
      {!card.titleOnly && plan ? (
        <Text style={webModuleStyle(classes.apiMeta)}>
          {plan.provider === 'postiz' ? 'Postiz' : 'SAU'} · {plan.format} ·{' '}
          {plan.videoFileName || 'video missing'}
          {plan.coverAppliesAsThumbnail ? ' · YouTube thumbnail attached' : ''}
        </Text>
      ) : null}
      <Text style={webModuleStyle(classes.fieldLabel)}>Title</Text>
      <TextInput
        style={webModuleStyle(classes.input, !interactive ? classes.inputDisabled : null)}
        value={card.title}
        onChangeText={(value) => onFieldChange(card.group, card.platform, 'title', value)}
        editable={interactive}
        placeholderTextColor={colors.muted2}
        multiline
      />
      {!card.titleOnly ? (
        <>
          <Text style={webModuleStyle(classes.fieldLabel)}>Body</Text>
          <TextInput
            style={webModuleStyle(
              classes.input,
              classes.bodyInput,
              !interactive ? classes.inputDisabled : null,
            )}
            value={card.body}
            onChangeText={(value) => onFieldChange(card.group, card.platform, 'body', value)}
            editable={interactive}
            placeholderTextColor={colors.muted2}
            multiline
            textAlignVertical="top"
          />
          <Text style={webModuleStyle(classes.charCount)}>{card.body.length} chars</Text>
          {plan?.provider === 'postiz' && plan.apiTitle ? (
            <Text style={webModuleStyle(classes.apiMeta)}>
              Postiz title setting: {plan.apiTitle}
            </Text>
          ) : null}
          {plan?.apiSettings ? (
            <Text style={webModuleStyle(classes.apiMeta)}>
              Postiz settings: {postizSettingsSummary(plan.apiSettings) || 'provider defaults'}
            </Text>
          ) : null}
          {!interactive && blockedReason ? (
            <Text style={webModuleStyle(classes.blockedReason)}>
              Disabled: {blockedReason}
            </Text>
          ) : null}
          {post?.progress ? (
            <View style={webModuleStyle(classes.progressBlock)}>
              <View style={webModuleStyle(classes.progressTrack)}>
                <View
                  style={[
                    webModuleStyle(classes.progressFill),
                    { width: `${Math.max(0, Math.min(100, post.progress.percent))}%` },
                  ]}
                />
              </View>
              <Text style={webModuleStyle(classes.apiMeta)}>
                {post.progress.message} · {post.progress.percent}%
              </Text>
              {post.error ? (
                <Text style={webModuleStyle(classes.blockedReason)}>{post.error}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={webModuleStyle(classes.publishRow)}>
            <Text style={webModuleStyle(classes.publishBadge)}>{status}</Text>
            {isLive ? (
              <>
                {post?.url ? (
                  <Button label="Open post" onPress={() => void Linking.openURL(post.url)} />
                ) : null}
                <Button
                  label="Hide"
                  onPress={() => onPublish(card.platform, 'hide')}
                  disabled={publishing || !canManagePost}
                />
                <Button
                  label="Delete"
                  onPress={() => onPublish(card.platform, 'delete')}
                  variant="danger"
                  disabled={publishing || !canManagePost}
                />
              </>
            ) : (
              <>
                <Button
                  label="Publish"
                  onPress={() => onPublish(card.platform, 'publish')}
                  variant="primary"
                  disabled={publishing || !interactive}
                />
                {post?.url && (post.status === 'hidden' || post.status === 'deleted') ? (
                  <Button label="Last link" onPress={() => void Linking.openURL(post.url)} />
                ) : null}
              </>
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}
