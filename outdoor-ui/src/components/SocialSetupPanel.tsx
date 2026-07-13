import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useOutdoorUi } from '../context/OutdoorUiContext';
import { colors, radii, spacing, typography } from '../theme';
import type { CoversListResponse, PublishRecord, PublishState, SocialPosts } from '../types';
import { fmtDate, platformLabel, publishStatusLabel } from '../utils/format';
import { CoverLibraryPanel } from './CoverLibraryPanel';
import { Button } from './ui/Button';
import { SectionLabel } from './ui/SectionLabel';

export type SocialSetupPanelProps = {
  jobId: string;
  social?: SocialPosts | null;
  status?: string;
  covers?: CoversListResponse | null;
  publish?: PublishState | null;
};

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
  const { api, layoutStyles, invalidateAll } = useOutdoorUi();
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
      <View style={styles.wrap}>
        <SectionLabel>Social setup</SectionLabel>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (!social) {
    return (
      <View style={styles.wrap}>
        <SectionLabel>Social setup · {status}</SectionLabel>
        <Text style={styles.meta}>
          Social copy appears once the social stage finishes. Cut / Align / Composite above stay
          usable meanwhile.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
    <View style={styles.wrap}>
      <SectionLabel>Social setup · {status}</SectionLabel>
      <Text style={styles.meta}>
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

      <Text style={styles.groupLabel}>English</Text>
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

      <Text style={styles.groupLabel}>中文 / China</Text>
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
      <Text style={styles.platform}>{platformLabel(card.platform, card.group)}</Text>
      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        style={styles.input}
        value={card.title}
        onChangeText={(value) => onFieldChange(card.group, card.platform, 'title', value)}
        placeholderTextColor={colors.muted2}
        multiline
      />
      {!card.titleOnly ? (
        <>
          <Text style={styles.fieldLabel}>Body</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={card.body}
            onChangeText={(value) => onFieldChange(card.group, card.platform, 'body', value)}
            placeholderTextColor={colors.muted2}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{card.body.length} chars</Text>

          <Text style={styles.fieldLabel}>Cover</Text>
          <View style={styles.coverSelectRow}>
            <Pressable
              style={styles.coverOption}
              onPress={() => onAssignCover(card.platform, null)}
            >
              <Text style={selectedCover ? styles.coverOptionText : styles.coverOptionTextActive}>
                None
              </Text>
            </Pressable>
            {coverOptions.map((cover) => (
              <Pressable
                key={cover.id}
                style={styles.coverOption}
                onPress={() => onAssignCover(card.platform, cover.id)}
              >
                <Text
                  style={
                    cover.id === selectedCover
                      ? styles.coverOptionTextActive
                      : styles.coverOptionText
                  }
                >
                  {cover.label || cover.id}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.publishRow}>
            <Text style={styles.publishBadge}>{status}</Text>
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

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  error: {
    color: colors.offline,
    fontSize: typography.small,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
    marginTop: 6,
  },
  platform: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 40,
  },
  bodyInput: {
    minHeight: 96,
  },
  charCount: {
    color: colors.muted2,
    fontSize: 11,
    textAlign: 'right',
  },
  coverSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  coverOption: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.pill,
  },
  coverOptionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  coverOptionTextActive: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: '800',
  },
  publishRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  publishBadge: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
