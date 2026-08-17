export type { SocialPublishPreviewGridProps } from './SocialPublishPreviewGrid.types';

import classes from './SocialPublishPreviewGrid.module.scss';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import type { SocialPublishPreviewGridProps } from './SocialPublishPreviewGrid.types';
import { createElement, useMemo } from 'react';
import { Image, Platform, ScrollView, Text, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import type { PublishPlanPlatform, ScriptCoverSlot, ScriptCoverSlotInfo } from '../../types';
import { platformLabel, publishStatusLabel } from '../../utils/format';
import { scriptCoverPreviewUrl } from '../../utils/scriptCoverPreviewUrl';
import { scriptCoverSlotForPlatform } from '../../utils/scriptCoverSlots';

const LANDSCAPE_PLATFORMS = new Set(['bilibili', 'wechat_channels', 'facebook', 'linkedin']);

type PreviewItem = {
  platform: string;
  group: 'english' | 'china' | 'fallback';
  title: string;
  body: string;
  apiContent: string;
  apiTitle: string | null;
  landscape: boolean;
  formatLabel: string;
  coverSlot: ScriptCoverSlot | null;
  coverUrlFromPlan: string | null;
  videoUrl: string | null;
  videoFileName: string | null;
  coverAppliesAsThumbnail: boolean;
  provider: string | null;
  postizMode?: 'stub' | 'live';
  blockers: string[];
  fromPlan: boolean;
};

function latestPublishPost(
  publish: SocialPublishPreviewGridProps['publish'],
  platform: string,
) {
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

function coverSlotInfo(
  scriptCovers: SocialPublishPreviewGridProps['scriptCovers'],
  slot: ScriptCoverSlot | null,
): ScriptCoverSlotInfo | null {
  if (!slot || !scriptCovers) {
    return null;
  }
  return scriptCovers.slots.find((entry) => entry.slot === slot) ?? null;
}

function itemFromPlan(plan: PublishPlanPlatform): PreviewItem {
  return {
    platform: plan.platform,
    group: plan.group === 'fallback' ? 'english' : plan.group,
    title: plan.title.trim(),
    body: plan.body.trim(),
    apiContent: plan.apiContent,
    apiTitle: plan.apiTitle,
    landscape: plan.format === 'landscape',
    formatLabel: plan.format === 'landscape' ? 'Landscape video' : 'Portrait video',
    coverSlot: null,
    coverUrlFromPlan: plan.coverUrl,
    videoUrl: plan.videoUrl,
    videoFileName: plan.videoFileName || null,
    coverAppliesAsThumbnail: plan.coverAppliesAsThumbnail,
    provider: plan.provider,
    postizMode: plan.postizMode,
    blockers: plan.blockers,
    fromPlan: true,
  };
}

export function SocialPublishPreviewGrid({
  cards,
  scriptCovers,
  planPlatforms = null,
  publish = null,
  showCaptions = true,
  embedded = false,
  emptyMessage = null,
}: SocialPublishPreviewGridProps) {
  const { api } = useOutdoorUi();

  const items = useMemo(() => {
    if (planPlatforms?.length) {
      return planPlatforms.map(itemFromPlan);
    }
    const next: PreviewItem[] = [];
    for (const card of cards) {
      if (card.titleOnly || card.group === 'headline') {
        continue;
      }
      next.push({
        platform: card.platform,
        group: card.group,
        title: card.title.trim(),
        body: card.body.trim(),
        apiContent: card.body.trim() || card.title.trim(),
        apiTitle: null,
        landscape: LANDSCAPE_PLATFORMS.has(card.platform),
        formatLabel: LANDSCAPE_PLATFORMS.has(card.platform)
          ? 'Landscape cover'
          : 'Portrait cover',
        coverSlot: scriptCoverSlotForPlatform(card.platform, card.group),
        coverUrlFromPlan: null,
        videoUrl: null,
        videoFileName: null,
        coverAppliesAsThumbnail: false,
        provider: null,
        blockers: [],
        fromPlan: false,
      });
    }
    return next;
  }, [cards, planPlatforms]);

  if (!items.length) {
    if (!emptyMessage) {
      return null;
    }
    return (
      <View style={webModuleStyle(classes.section, embedded ? classes.sectionEmbedded : null)}>
        <Text style={webModuleStyle(classes.meta)}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={webModuleStyle(classes.section, embedded ? classes.sectionEmbedded : null)}>
      {!embedded ? (
        <>
          <Text style={webModuleStyle(classes.groupLabel)}>Publish preview</Text>
          <Text style={webModuleStyle(classes.meta)}>
            {showCaptions
              ? 'Video + cover + exact API caption as each platform will receive on publish.'
              : 'Video / cover thumbnail + post title for each platform.'}
          </Text>
        </>
      ) : null}
      <View style={webModuleStyle(classes.grid)}>
        {items.map((item) => {
          const slot = coverSlotInfo(scriptCovers, item.coverSlot);
          const fallbackCoverUrl =
            slot?.exists && slot ? scriptCoverPreviewUrl(api, slot) : null;
          const coverUrl = item.coverUrlFromPlan
            ? api.absoluteUrl(item.coverUrlFromPlan)
            : fallbackCoverUrl;
          const videoUrl = item.videoUrl ? api.absoluteUrl(item.videoUrl) : null;
          const post = latestPublishPost(publish, item.platform);
          const status = publishStatusLabel(post);
          const isChina = item.group === 'china';

          const captionBlock = showCaptions ? (
            <View style={webModuleStyle(classes.bodyBlock)}>
              {item.apiTitle ? (
                <>
                  <Text style={webModuleStyle(classes.fieldLabel)}>API title (settings)</Text>
                  <Text style={webModuleStyle(classes.titleText)}>{item.apiTitle}</Text>
                </>
              ) : (
                <>
                  <Text style={webModuleStyle(classes.fieldLabel)}>Title</Text>
                  <Text
                    style={webModuleStyle(item.title ? classes.titleText : classes.emptyTitle)}
                  >
                    {item.title || 'No title'}
                  </Text>
                </>
              )}
              <Text style={webModuleStyle(classes.fieldLabel)}>
                {item.fromPlan
                  ? 'API content (exact Postiz / SAU text)'
                  : isChina
                    ? '简介'
                    : 'Caption / description'}
              </Text>
              {Platform.OS === 'web' ? (
                <Text
                  style={webModuleStyle(
                    item.apiContent ? classes.captionText : classes.emptyCaption,
                  )}
                >
                  {item.apiContent || (isChina ? '暂无中文简介' : 'No caption')}
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 140 }}>
                  <Text
                    style={webModuleStyle(
                      item.apiContent ? classes.captionText : classes.emptyCaption,
                    )}
                  >
                    {item.apiContent || (isChina ? '暂无中文简介' : 'No caption')}
                  </Text>
                </ScrollView>
              )}
            </View>
          ) : null;

          const mediaBlock = (
            <View style={webModuleStyle(classes.coverWrap)}>
              {videoUrl && Platform.OS === 'web' ? (
                createElement(
                  'div',
                  { className: webClassName(classes.coverFrame) },
                  createElement('video', {
                    src: videoUrl,
                    className: webClassName(classes.video),
                    controls: true,
                    playsInline: true,
                    preload: 'metadata',
                  }),
                )
              ) : coverUrl ? (
                Platform.OS === 'web' ? (
                  createElement(
                    'div',
                    { className: webClassName(classes.coverFrame) },
                    createElement('img', {
                      src: coverUrl,
                      alt: item.title || platformLabel(item.platform, item.group),
                      className: webClassName(classes.coverImage),
                    }),
                  )
                ) : (
                  <View style={webModuleStyle(classes.coverFrame)}>
                    <Image
                      source={{ uri: coverUrl }}
                      resizeMode="contain"
                      style={webModuleStyle(classes.coverImage)}
                    />
                  </View>
                )
              ) : (
                <View
                  style={webModuleStyle(
                    classes.coverMissing,
                    item.landscape ? classes.coverMissingLandscape : null,
                  )}
                >
                  <Text style={webModuleStyle(classes.coverMissingText)}>
                    {item.fromPlan ? 'Video missing' : (slot?.label ?? 'No cover')}
                  </Text>
                </View>
              )}
              {!videoUrl && coverUrl ? (
                <View style={webModuleStyle(classes.titleOverlay)}>
                  <Text
                    style={webModuleStyle(
                      item.title ? classes.titleOnCover : classes.titleOnCoverEmpty,
                    )}
                    numberOfLines={3}
                  >
                    {item.title || 'No title'}
                  </Text>
                </View>
              ) : null}
            </View>
          );

          return (
            <View key={`${item.group}-${item.platform}`} style={webModuleStyle(classes.card)}>
              <View style={webModuleStyle(classes.cardHeader)}>
                <Text style={webModuleStyle(classes.platform)}>
                  {platformLabel(item.platform, item.group)}
                </Text>
                <Text style={webModuleStyle(classes.badge)}>{item.formatLabel}</Text>
                {item.provider ? (
                  <Text style={webModuleStyle(classes.badge)}>{item.provider}</Text>
                ) : null}
                {item.postizMode === 'stub' ? (
                  <Text style={webModuleStyle(classes.badge, classes.badgeWarn)}>stub</Text>
                ) : null}
                <Text
                  style={webModuleStyle(
                    post?.status === 'live' ? classes.badgeLive : classes.badge,
                  )}
                >
                  {status}
                </Text>
                {item.coverAppliesAsThumbnail ? (
                  <Text style={webModuleStyle(classes.badge)}>YT thumb</Text>
                ) : coverUrl && item.fromPlan ? (
                  <Text style={webModuleStyle(classes.badge, classes.badgeMuted)}>
                    cover UI only
                  </Text>
                ) : null}
                {item.videoFileName ? (
                  <Text style={webModuleStyle(classes.badge, classes.badgeMuted)}>
                    {item.videoFileName}
                  </Text>
                ) : null}
                {item.blockers.length ? (
                  <Text style={webModuleStyle(classes.badge, classes.badgeMissing)}>
                    {item.blockers[0]}
                  </Text>
                ) : null}
              </View>

              {mediaBlock}
              {coverUrl && videoUrl ? (
                <View style={webModuleStyle(classes.thumbRow)}>
                  {Platform.OS === 'web' ? (
                    createElement('img', {
                      src: coverUrl,
                      alt: 'cover',
                      className: webClassName(classes.thumbImage),
                    })
                  ) : (
                    <Image
                      source={{ uri: coverUrl }}
                      resizeMode="cover"
                      style={webModuleStyle(classes.thumbImage)}
                    />
                  )}
                  <Text style={webModuleStyle(classes.thumbMeta)}>
                    {item.coverAppliesAsThumbnail
                      ? 'Uploaded as YouTube custom thumbnail'
                      : 'Cover shown in outdoor-ui (network may ignore)'}
                  </Text>
                </View>
              ) : null}
              {captionBlock}
            </View>
          );
        })}
      </View>
    </View>
  );
}
