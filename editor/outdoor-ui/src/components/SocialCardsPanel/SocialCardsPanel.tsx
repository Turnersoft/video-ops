export type { SocialCardsPanelProps } from './SocialCardsPanel.types';

import classes from './SocialCardsPanel.module.scss';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import type { SocialCardsPanelProps } from './SocialCardsPanel.types';
import { createElement, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';

import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import type { SocialCardsResponse } from '../../types';
import { platformLabel } from '../../utils/format';

const POSTIZ_IMAGE_HINT =
  'Postiz image posts: X, LinkedIn, Instagram, Facebook, Bluesky, Threads, Reddit, TikTok (photo). YouTube stays video-only.';

export function SocialCardsPanel({ jobId, publish = null }: SocialCardsPanelProps) {
  const { api, invalidateAll } = useOutdoorUi();
  const [cards, setCards] = useState<SocialCardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.getSocialCards(jobId);
      setCards(next);
    } catch {
      setCards(null);
    } finally {
      setLoading(false);
    }
  }, [api, jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = useCallback(async () => {
    setBusy('generate');
    try {
      const next = await api.generateSocialCards(jobId);
      setCards(next);
      Alert.alert('Social cards', 'HTML cards rendered to PNG (portrait + landscape × EN + 中文).');
    } catch (error) {
      Alert.alert(
        'Generate failed',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(null);
    }
  }, [api, jobId]);

  const handlePublishAll = useCallback(async () => {
    setBusy('publish-all');
    try {
      const result = await api.publishImagesAll(jobId);
      invalidateAll();
      Alert.alert(
        'Image publish',
        [
          `Published: ${result.published.map((entry) => entry.platform).join(', ') || 'none'}`,
          result.skippedUnavailable.length
            ? `Skipped: ${result.skippedUnavailable.map((entry) => `${entry.platform} (${entry.reason})`).join('; ')}`
            : '',
          result.failed.length
            ? `Failed: ${result.failed.map((entry) => `${entry.platform}: ${entry.error}`).join('; ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } catch (error) {
      Alert.alert(
        'Publish failed',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(null);
    }
  }, [api, invalidateAll, jobId]);

  const handlePublishOne = useCallback(
    async (platform: string) => {
      setBusy(`publish-${platform}`);
      try {
        await api.publishImageJob(jobId, platform);
        invalidateAll();
        Alert.alert('Image publish', `${platformLabel(platform)} image post submitted via Postiz.`);
      } catch (error) {
        Alert.alert(
          `Publish ${platformLabel(platform)}`,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setBusy(null);
      }
    },
    [api, invalidateAll, jobId],
  );

  const imageUrl = (path: string) => api.absoluteUrl(path);

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <SectionLabel>Static social cards (HTML → PNG)</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>{POSTIZ_IMAGE_HINT}</Text>
      <Text style={webModuleStyle(classes.meta)}>
        No composite video required — cards use social copy only. People can read the post without
        watching the video.
      </Text>
      <View style={webModuleStyle(classes.actions)}>
        <Button
          label={busy === 'generate' ? 'Generating…' : 'Generate cards'}
          onPress={() => {
            void handleGenerate();
          }}
          disabled={busy === 'generate'}
          variant="primary"
        />
        <Button
          label={busy === 'publish-all' ? 'Publishing…' : 'Publish all image posts'}
          onPress={() => {
            void handlePublishAll();
          }}
          disabled={busy === 'publish-all' || !cards?.cards.length}
        />
      </View>
      {loading ? <ActivityIndicator /> : null}
      {cards?.cards.length ? (
        <View style={webModuleStyle(classes.cardGrid)}>
          {cards.cards.map((card) => (
            <View key={card.id} style={webModuleStyle(classes.card)}>
              <Text style={webModuleStyle(classes.cardLabel)}>
                {card.format} · {card.lang} · {card.width}×{card.height}
              </Text>
              {Platform.OS === 'web' ? (
                createElement('img', {
                  src: imageUrl(card.pngUrl),
                  alt: card.id,
                  className: webClassName(classes.cardImage),
                })
              ) : null}
            </View>
          ))}
        </View>
      ) : !loading ? (
        <Text style={webModuleStyle(classes.meta)}>
          No cards yet — run Generate (needs social-posts.json + Chrome for headless screenshot).
        </Text>
      ) : null}
      {cards?.platforms.length ? (
        <View style={webModuleStyle(classes.platformGrid)}>
          {cards.platforms.map((row) => {
            const post = publish?.posts.find(
              (entry) => entry.platform === row.platform && entry.mediaKind === 'image',
            );
            return (
              <View key={row.platform} style={webModuleStyle(classes.platformRow)}>
                <Text style={webModuleStyle(classes.platformName)}>
                  {platformLabel(row.platform)}
                </Text>
                {row.imageUrl && Platform.OS === 'web' ? (
                  createElement('img', {
                    src: imageUrl(row.imageUrl),
                    alt: row.platform,
                    className: webClassName(classes.thumb),
                  })
                ) : null}
                <Text style={webModuleStyle(classes.platformMeta)}>
                  {row.cardId ? `${row.format} · ${row.lang}` : 'Generate cards first'}
                  {post?.status ? ` · ${post.status}` : ''}
                </Text>
                <Button
                  label={busy === `publish-${row.platform}` ? '…' : 'Publish image'}
                  onPress={() => {
                    void handlePublishOne(row.platform);
                  }}
                  disabled={!row.cardId || busy === `publish-${row.platform}`}
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
