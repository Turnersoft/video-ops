export type { BeatPosterSocialFeedPreviewProps } from './BeatPosterSocialFeedPreview.types';

import classes from './BeatPosterSocialFeedPreview.module.scss';
import type { BeatPosterSocialFeedPreviewProps } from './BeatPosterSocialFeedPreview.types';
import { createElement, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import type { BeatPosterPlatformPreview } from '../../types';
import { platformLabel } from '../../utils/format';
import { isPublishPhaseActive } from '../../utils/beatPosterPublishLifecycle';
import { BeatPosterPublishLifecycle } from '../BeatPosterPublishLifecycle/BeatPosterPublishLifecycle';
import { webClassName, webModuleStyle } from '../../utils/webClassName';

const CHINA_CAROUSEL_PLATFORMS = new Set([
  'xiaohongshu',
  'bilibili',
  'douyin',
  'weibo',
  'wechat_channels',
  'kuaishou',
]);

const CAROUSEL_PLATFORMS = new Set([
  'instagram',
  'tiktok',
  'threads',
  'facebook',
  'linkedin',
  'bluesky',
  'reddit',
  ...CHINA_CAROUSEL_PLATFORMS,
]);

function handleForPlatform(platform: string, lang: 'en' | 'zh'): string {
  if (lang === 'zh') {
    return platform === 'xiaohongshu' ? 'Turn-Lang 户外数学' : 'Turn-Lang';
  }
  if (platform === 'linkedin') return 'Turn-Lang · Formal Math';
  if (platform === 'reddit') return 'u/turn_lang';
  return '@turn_lang';
}

function shellClass(platform: string): string | null {
  if (platform === 'xiaohongshu') return classes.phoneScreenXhs;
  if (platform === 'linkedin') return classes.phoneScreenLinkedin;
  return null;
}

function truncateCaption(body: string, max = 180): { text: string; truncated: boolean } {
  const normalized = body.trim();
  if (normalized.length <= max) {
    return { text: normalized, truncated: false };
  }
  return { text: `${normalized.slice(0, max).trim()}…`, truncated: true };
}

function PlatformTab({
  platform,
  active,
  lifecyclePhase,
  onPress,
}: {
  platform: string;
  active: boolean;
  lifecyclePhase?: string;
  onPress: () => void;
}) {
  const dotClass =
    lifecyclePhase === 'live'
      ? classes.platformTabDotLive
      : lifecyclePhase === 'failed'
        ? classes.platformTabDotFailed
        : lifecyclePhase === 'pending' || isPublishPhaseActive(lifecyclePhase as never)
          ? classes.platformTabDotPending
          : lifecyclePhase === 'manual'
            ? classes.platformTabDotManual
            : null;
  return (
    <Pressable
      onPress={onPress}
      style={webModuleStyle(classes.platformTab, active ? classes.platformTabActive : null)}
    >
      {dotClass ? <View style={webModuleStyle(classes.platformTabDot, dotClass)} /> : null}
      <Text style={webModuleStyle(classes.platformTabLabel)}>{platformLabel(platform)}</Text>
    </Pressable>
  );
}

function FeedPhone({
  row,
  lang,
  absoluteUrl,
  slideIndex,
  onSlideIndexChange,
}: {
  row: BeatPosterPlatformPreview;
  lang: 'en' | 'zh';
  absoluteUrl: (path: string) => string;
  slideIndex: number;
  onSlideIndexChange: (index: number) => void;
}) {
  const imageUrls = row.imageUrls ?? [];
  const imageCount = Math.max(imageUrls.length, row.imageCount ?? 0);
  const safeIndex = imageCount > 0 ? Math.min(slideIndex, imageCount - 1) : 0;
  const currentUrl = imageUrls[safeIndex] ?? null;
  const showCarousel = CAROUSEL_PLATFORMS.has(row.platform) && imageCount > 1;
  const caption = truncateCaption(row.body);
  const isXhs = row.platform === 'xiaohongshu';
  const srcForUrl = (url: string) =>
    url.startsWith('data:') || url.startsWith('http') ? url : absoluteUrl(url);

  const goPrev = () => {
    if (imageCount <= 0) return;
    onSlideIndexChange(safeIndex <= 0 ? imageCount - 1 : safeIndex - 1);
  };
  const goNext = () => {
    if (imageCount <= 0) return;
    onSlideIndexChange(safeIndex >= imageCount - 1 ? 0 : safeIndex + 1);
  };

  return (
    <View style={webModuleStyle(classes.phone)}>
      <View style={webModuleStyle(classes.phoneNotch)} />
      <View style={webModuleStyle(classes.phoneScreen, shellClass(row.platform))}>
        <View style={webModuleStyle(classes.postHeader)}>
          <View style={webModuleStyle(classes.avatar, isXhs ? classes.avatarXhs : null)} />
          <View style={webModuleStyle(classes.headerText)}>
            <Text style={webModuleStyle(classes.handle)}>{handleForPlatform(row.platform, lang)}</Text>
            <Text style={webModuleStyle(classes.subline)}>
              {platformLabel(row.platform)}
              {showCarousel ? ` · ${safeIndex + 1}/${imageCount}` : ''}
            </Text>
          </View>
          <Text style={webModuleStyle(classes.headerMenu)}>···</Text>
        </View>

        {isXhs ? (
          <Text style={webModuleStyle(classes.albumHint)}>
            左滑看图 · {imageCount} 张信息图
          </Text>
        ) : null}

        <View style={webModuleStyle(classes.mediaWrap)}>
          {currentUrl && Platform.OS === 'web' ? (
            createElement('img', {
              src: srcForUrl(currentUrl),
              alt: `${row.platform}-${safeIndex + 1}`,
              className: webClassName(classes.mediaImage),
            })
          ) : (
            <Text style={webModuleStyle(classes.mediaMissing)}>
              Generate infographics to preview PNGs in the feed mock.
            </Text>
          )}
          {showCarousel && imageCount > 0 ? (
            <>
              <Text style={webModuleStyle(classes.carouselBadge)}>
                {safeIndex + 1} / {imageCount}
              </Text>
              {Platform.OS === 'web' ? (
                <>
                  {createElement(
                    'button',
                    {
                      type: 'button',
                      className: webClassName(classes.carouselNav, classes.carouselNavPrev),
                      onClick: goPrev,
                      'aria-label': 'Previous slide',
                    },
                    '‹',
                  )}
                  {createElement(
                    'button',
                    {
                      type: 'button',
                      className: webClassName(classes.carouselNav, classes.carouselNavNext),
                      onClick: goNext,
                      'aria-label': 'Next slide',
                    },
                    '›',
                  )}
                </>
              ) : null}
              <View style={webModuleStyle(classes.carouselDots)}>
                {Array.from({ length: Math.min(imageCount, 8) }).map((_, index) => (
                  <View
                    key={`dot-${row.platform}-${index}`}
                    style={webModuleStyle(
                      classes.carouselDot,
                      index === safeIndex ? classes.carouselDotActive : null,
                    )}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>

        <View style={webModuleStyle(classes.postActions, isXhs ? classes.postActionsXhs : null)}>
          <Text>{isXhs ? '♡ 收藏' : '♡'}</Text>
          <Text>{isXhs ? '💬 评论' : '💬'}</Text>
          <Text>{isXhs ? '↗ 分享' : '↗'}</Text>
        </View>

        <View style={webModuleStyle(classes.captionBlock)}>
          <Text style={webModuleStyle(classes.captionTitle)}>{row.title}</Text>
          <Text style={webModuleStyle(classes.captionBody)}>
            {caption.text}
            {caption.truncated ? (
              <Text style={webModuleStyle(classes.captionMore)}> more</Text>
            ) : null}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function BeatPosterSocialFeedPreview({
  lang,
  platforms,
  absoluteUrl,
  slideIndex,
  onSlideIndexChange,
  platformLifecycle,
}: BeatPosterSocialFeedPreviewProps) {
  const [platform, setPlatform] = useState(platforms[0]?.platform ?? '');

  useEffect(() => {
    if (!platforms.length) {
      setPlatform('');
      return;
    }
    if (!platforms.some((row) => row.platform === platform)) {
      setPlatform(platforms[0].platform);
    }
  }, [platform, platforms]);

  const activeRow = useMemo(
    () => platforms.find((row) => row.platform === platform) ?? platforms[0] ?? null,
    [platform, platforms],
  );

  if (!platforms.length || !activeRow) {
    return (
      <Text style={webModuleStyle(classes.meta)}>
        Generate infographics and refresh to preview how the album looks in a social feed.
      </Text>
    );
  }

  const activePublishMode =
    (activeRow.publishMode ?? (activeRow.postizImageSupported ? 'auto' : 'manual')) as
      | 'auto'
      | 'manual';
  const activeLifecycle = platformLifecycle
    ? platformLifecycle(activeRow.platform, activePublishMode)
    : null;

  return (
    <View style={webModuleStyle(classes.shell)}>
      <Text style={webModuleStyle(classes.meta)}>
        Pseudo feed preview — pick a platform, swipe the in-phone carousel (synced with slide{' '}
        {slideIndex + 1}).
      </Text>
      <View style={webModuleStyle(classes.platformTabs)}>
        {platforms.map((row) => {
          const mode = (row.publishMode ?? (row.postizImageSupported ? 'auto' : 'manual')) as
            | 'auto'
            | 'manual';
          const lifecycle = platformLifecycle?.(row.platform, mode);
          return (
            <PlatformTab
              key={row.platform}
              platform={row.platform}
              active={row.platform === activeRow.platform}
              lifecyclePhase={lifecycle?.phase}
              onPress={() => setPlatform(row.platform)}
            />
          );
        })}
      </View>
      <View style={webModuleStyle(classes.layoutRow)}>
        <FeedPhone
          row={activeRow}
          lang={lang}
          absoluteUrl={absoluteUrl}
          slideIndex={slideIndex}
          onSlideIndexChange={onSlideIndexChange}
        />
        <View style={webModuleStyle(classes.sidePanel)}>
          <Text style={webModuleStyle(classes.sideLabel)}>Platform</Text>
          <Text style={webModuleStyle(classes.sideValue)}>{platformLabel(activeRow.platform)}</Text>
          <Text style={webModuleStyle(classes.sideLabel)}>Post title</Text>
          <Text style={webModuleStyle(classes.sideValue)}>{activeRow.title}</Text>
          <Text style={webModuleStyle(classes.sideLabel)}>Caption sent on publish</Text>
          <Text style={webModuleStyle(classes.sideValue)}>{activeRow.body}</Text>
          <Text style={webModuleStyle(classes.sideMeta)}>
            {activeRow.imageCount} images ·{' '}
            {(activeRow.characterCount ?? `${activeRow.title}\n\n${activeRow.body}`.length)} chars ·{' '}
            {activePublishMode === 'auto' ? 'Postiz auto' : 'Manual upload'}
          </Text>
          {activeLifecycle ? (
            <BeatPosterPublishLifecycle
              platform={activeRow.platform}
              publishMode={activePublishMode}
              ui={activeLifecycle}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
