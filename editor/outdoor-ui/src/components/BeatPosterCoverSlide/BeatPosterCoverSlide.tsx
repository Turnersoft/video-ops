export type { BeatPosterCoverSlideProps } from './BeatPosterCoverSlide.types';

import classes from './BeatPosterCoverSlide.module.scss';
import type { BeatPosterCoverSlideProps } from './BeatPosterCoverSlide.types';
import { createElement } from 'react';
import { Platform, Text, View } from 'react-native';

import {
  BEAT_POSTER_COVER_AVATAR_URL,
  BEAT_POSTER_VS_BADGE_URL,
  beatPosterCoverSeriesHeaderUrl,
} from '../../utils/beatPosterCoverAssets';
import { webClassName, webModuleStyle } from '../../utils/webClassName';

function CoverBackgroundCode({
  leanCode,
  turnCode,
}: {
  leanCode: string;
  turnCode: string;
}) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const renderPanel = (code: string, panelClass: string) => {
    if (!code.trim()) {
      return null;
    }
    return createElement(
      'pre',
      { className: webClassName(classes.codePanel, panelClass), 'aria-hidden': true },
      code.trim(),
    );
  };

  return createElement(
    'div',
    { className: webClassName(classes.codeBackdrop), 'aria-hidden': true },
    renderPanel(leanCode, classes.codePanelLean),
    renderPanel(turnCode, classes.codePanelTurn),
  );
}

function renderCoverTaglineWeb(tagline: string) {
  const parts = tagline.split('=');
  if (parts.length < 2) {
    return createElement('p', { className: webClassName(classes.tagline) }, tagline);
  }

  const children: Array<string | ReturnType<typeof createElement>> = [];
  parts.forEach((part, index) => {
    if (part) {
      children.push(part);
    }
    if (index < parts.length - 1) {
      children.push(
        createElement('span', { className: webClassName(classes.taglineEquals), key: `eq-${index}` }, '='),
      );
    }
  });

  return createElement('p', { className: webClassName(classes.tagline) }, ...children);
}

export function BeatPosterCoverSlide({
  lang,
  coverHeadline,
  tagline,
  beatCountLabel,
  swipeHint,
  decorations,
  backgroundLeanCode,
  backgroundTurnCode,
  compact = false,
}: BeatPosterCoverSlideProps) {
  const seriesHeaderUrl = beatPosterCoverSeriesHeaderUrl(lang);

  return (
    <View
      style={webModuleStyle(classes.frame, compact ? classes.frameCompact : null)}
      accessibilityLabel={coverHeadline}
    >
      <View style={webModuleStyle(classes.poster, lang === 'zh' ? classes.posterZh : null)}>
        <CoverBackgroundCode leanCode={backgroundLeanCode} turnCode={backgroundTurnCode} />
        {Platform.OS === 'web'
          ? createElement('img', {
              src: BEAT_POSTER_COVER_AVATAR_URL,
              alt: '',
              'aria-hidden': true,
              className: webClassName(classes.coverAvatar),
            })
          : null}
        <Text style={webModuleStyle(classes.sparkle, classes.sparkleOne)}>
          {decorations.sparkle ? '✦' : '✧'}
        </Text>
        {decorations.sparkle ? (
          <Text style={webModuleStyle(classes.sparkle, classes.sparkleTwo)}>✧</Text>
        ) : null}

        <View style={webModuleStyle(classes.body)}>
          {Platform.OS === 'web'
            ? createElement('img', {
                src: seriesHeaderUrl,
                alt: lang === 'zh' ? '抽象代数系列' : 'Abstract Algebra in Proof Assistants',
                className: webClassName(classes.coverSeriesHeader),
              })
            : null}

          <View
            style={[
              webModuleStyle(classes.coverHeroTitle),
              { transform: [{ rotate: `${decorations.cardTilt * -0.65}deg` }] },
            ]}
          >
            {Platform.OS === 'web'
              ? createElement(
                  'p',
                  { className: webClassName(classes.coverHeroKicker) },
                  coverHeadline,
                )
              : (
                <Text style={webModuleStyle(classes.coverHeroKicker)}>
                  {coverHeadline}
                </Text>
              )}
            {Platform.OS === 'web'
              ? renderCoverTaglineWeb(tagline)
              : (
                <Text style={webModuleStyle(classes.tagline)}>
                  {tagline}
                </Text>
              )}
          </View>

          {Platform.OS === 'web'
            ? createElement('img', {
                src: BEAT_POSTER_VS_BADGE_URL,
                alt: 'Lean vs Turn-Lang',
                className: webClassName(classes.coverVsStrip),
              })
            : null}

          <View
            style={[
              webModuleStyle(classes.beatBadge),
              { transform: [{ rotate: `${decorations.cardTilt * 0.45}deg` }] },
            ]}
          >
            <Text style={webModuleStyle(classes.beatBadgeText)}>{beatCountLabel}</Text>
          </View>
        </View>

        <View style={webModuleStyle(classes.footer)}>
          <Text style={webModuleStyle(classes.swipeHint)}>{swipeHint}</Text>
        </View>
      </View>
    </View>
  );
}
