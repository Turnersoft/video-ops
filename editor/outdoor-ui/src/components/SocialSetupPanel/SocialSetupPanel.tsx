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
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { CoversListResponse, PublishRecord, PublishState, SocialPosts } from '../../types';
import { fmtDate, platformLabel, publishStatusLabel } from '../../utils/format';
import { CoverLibraryPanel } from '../CoverLibraryPanel/CoverLibraryPanel';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';

type DraftCard = {
  group: 'headline' | 'english' | 'china';
  platform: string;
  title: string;
  body: string;
  titleOnly: boolean;
};

function cardsFromSocial(social: SocialPosts): DraftCard[] {
  const cards: DraftCard[] = [
    {
      group: 'headline',
      platform: 'EN',
      title: social.titleEnglish ?? social.title ?? '',
      body: '',
      titleOnly: true,
    },
  ];
  for (const [platform, fields] of Object.entries(social.english ?? {})) {
    cards.push({
      group: 'english',
      platform,
      title: fields?.title ?? '',
      body: fields?.body ?? '',
      titleOnly: false,
    });
  }
  cards.push({
    group: 'headline',
    platform: 'ZH',
    title: social.titleChina ?? '',
    body: '',
    titleOnly: true,
  });
  for (const [platform, fields] of Object.entries(social.china ?? {})) {
    cards.push({
      group: 'china',
      platform,
      title: fields?.title ?? '',
      body: fields?.body ?? '',
      titleOnly: false,
    });
  }
  return cards;
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

export function SocialSetupPanel({
  jobId,
  social: socialProp,
  status = 'review',
  covers: coversProp,
  publish: publishProp,
}: SocialSetupPanelProps) {
  const { layout,  api, invalidateAll  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [social, setSocial] = useState<SocialPosts | null>(socialProp ?? null);
  const [covers, setCovers] = useState<CoversListResponse | null>(coversProp ?? null);
  const [publish, setPublish] = useState<PublishState | null>(publishProp ?? null);
  const [loading, setLoading] = useState(!socialProp);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
      const [socialPack, coverPack, jobDetail] = await Promise.all([
        api.getSocial(jobId).catch(() => null),
        api.getCovers(jobId).catch(() => ({
          covers: [],
          platformCovers: {},
        })),
        api.getJob(jobId).catch(() => null),
      ]);
      setSocial(socialPack);
      setCards(socialPack ? cardsFromSocial(socialPack) : []);
      setCovers(coverPack);
      setPublish(jobDetail && 'publish' in jobDetail ? jobDetail.publish : null);
    } catch (loadError) {
      setSocial(null);
      setCards([]);
      setError(loadError instanceof Error ? loadError.message : 'Social pack unavailable');
    } finally {
      setLoading(false);
    }
  }, [api, jobId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const publishAll = async () => {
    setPublishing(true);
    try {
      const summary = await api.publishAll(jobId);
      invalidateAll();
      await load();
      Alert.alert(
        'Publish all',
        [
          `Published: ${summary.published.map((entry) => entry.platform).join(', ') || 'none'}`,
          `Skipped live: ${summary.skippedLive.join(', ') || 'none'}`,
          `Skipped no title: ${summary.skippedNoTitle.join(', ') || 'none'}`,
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
        await api.publishJob(jobId, platform);
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

  const assignCover = async (platform: string, coverId: string | null) => {
    try {
      const next = await api.patchCoverPlatformMap(jobId, {
        platformCovers: { [platform]: coverId },
      });
      setCovers(next);
      invalidateAll();
    } catch (coverError) {
      Alert.alert(
        'Cover',
        coverError instanceof Error ? coverError.message : 'Could not assign cover',
      );
    }
  };

  const englishCards = cards.filter(
    (card) => card.group === 'english' || (card.group === 'headline' && card.platform === 'EN'),
  );
  const chinaCards = cards.filter(
    (card) => card.group === 'china' || (card.group === 'headline' && card.platform === 'ZH'),
  );
  const englishPlatforms = cards.filter((card) => card.group === 'english').map((card) => card.platform);
  const chinaPlatforms = cards.filter((card) => card.group === 'china').map((card) => card.platform);

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
        <CoverLibraryPanel
          jobId={jobId}
          covers={covers}
          englishPlatforms={englishPlatforms}
          chinaPlatforms={chinaPlatforms}
          onCoversChange={setCovers}
        />
      </View>
    );
  }

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <SectionLabel>Social setup · {status}</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>
        Edit AI copy lightly · saves to this take’s social run (not the script template)
        {social.updatedAt ? ` · updated ${fmtDate(social.updatedAt)}` : ''}
      </Text>

      <View style={layoutStyles.pipelineToolbar}>
        <Button
          label={saving ? 'Saving…' : 'Save social edits'}
          onPress={() => void save()}
          variant="primary"
          disabled={saving || publishing}
        />
        <Button
          label={publishing ? 'Publishing…' : 'Publish all'}
          onPress={() => void publishAll()}
          disabled={saving || publishing}
        />
      </View>

      <CoverLibraryPanel
        jobId={jobId}
        covers={covers}
        englishPlatforms={englishPlatforms}
        chinaPlatforms={chinaPlatforms}
        onCoversChange={setCovers}
      />

      <Text style={webModuleStyle(classes.groupLabel)}>English</Text>
      <View style={layoutStyles.socialGrid}>
        {englishCards.map((card) => (
          <View key={`en-${card.group}-${card.platform}`} style={layoutStyles.gridItemHalf}>
            <SocialFieldCard
              card={card}
              covers={covers}
              publish={publish}
              publishing={publishing}
              cardStyle={layoutStyles.socialCard}
              onFieldChange={updateField}
              onAssignCover={assignCover}
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
              covers={covers}
              publish={publish}
              publishing={publishing}
              cardStyle={layoutStyles.socialCard}
              onFieldChange={updateField}
              onAssignCover={assignCover}
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
  covers,
  publish,
  publishing,
  cardStyle,
  onFieldChange,
  onAssignCover,
  onPublish,
}: {
  card: DraftCard;
  covers: CoversListResponse | null;
  publish: PublishState | null;
  publishing: boolean;
  cardStyle: object;
  onFieldChange: (
    group: DraftCard['group'],
    platform: string,
    field: 'title' | 'body',
    value: string,
  ) => void;
  onAssignCover: (platform: string, coverId: string | null) => void;
  onPublish: (platform: string, action: 'publish' | 'hide' | 'delete') => void;
}) {
  const post = card.titleOnly ? null : latestPublishPost(publish, card.platform);
  const status = publishStatusLabel(post);
  const isLive = post?.status === 'live';
  const coverOptions = covers?.covers ?? [];
  const selectedCover = covers?.platformCovers?.[card.platform] ?? '';

  return (
    <View style={cardStyle}>
      <Text style={webModuleStyle(classes.platform)}>{platformLabel(card.platform, card.group)}</Text>
      <Text style={webModuleStyle(classes.fieldLabel)}>Title</Text>
      <TextInput
        style={webModuleStyle(classes.input)}
        value={card.title}
        onChangeText={(value) => onFieldChange(card.group, card.platform, 'title', value)}
        placeholderTextColor={colors.muted2}
        multiline
      />
      {!card.titleOnly ? (
        <>
          <Text style={webModuleStyle(classes.fieldLabel)}>Body</Text>
          <TextInput
            style={webModuleStyle(classes.input, classes.bodyInput)}
            value={card.body}
            onChangeText={(value) => onFieldChange(card.group, card.platform, 'body', value)}
            placeholderTextColor={colors.muted2}
            multiline
            textAlignVertical="top"
          />
          <Text style={webModuleStyle(classes.charCount)}>{card.body.length} chars</Text>

          <Text style={webModuleStyle(classes.fieldLabel)}>Cover</Text>
          <View style={webModuleStyle(classes.coverSelectRow)}>
            <Pressable
              style={webModuleStyle(classes.coverOption)}
              onPress={() => onAssignCover(card.platform, null)}
            >
              <Text
                style={webModuleStyle(
                  selectedCover ? classes.coverOptionText : classes.coverOptionTextActive,
                )}
              >
                None
              </Text>
            </Pressable>
            {coverOptions.map((cover) => (
              <Pressable
                key={cover.id}
                style={webModuleStyle(classes.coverOption)}
                onPress={() => onAssignCover(card.platform, cover.id)}
              >
                <Text
                  style={webModuleStyle(
                    cover.id === selectedCover
                      ? classes.coverOptionTextActive
                      : classes.coverOptionText,
                  )}
                >
                  {cover.label || cover.id}
                </Text>
              </Pressable>
            ))}
          </View>

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
                  disabled={publishing}
                />
                <Button
                  label="Delete"
                  onPress={() => onPublish(card.platform, 'delete')}
                  variant="danger"
                  disabled={publishing}
                />
              </>
            ) : (
              <>
                <Button
                  label="Publish"
                  onPress={() => onPublish(card.platform, 'publish')}
                  variant="primary"
                  disabled={publishing}
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
