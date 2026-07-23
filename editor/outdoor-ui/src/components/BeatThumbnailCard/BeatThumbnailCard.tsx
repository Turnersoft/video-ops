export type { BeatThumbnailCardProps } from './BeatThumbnailCard.types';

import classes from './BeatThumbnailCard.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { BeatThumbnailCardProps } from './BeatThumbnailCard.types';
import { Pressable, Text, View } from 'react-native';

import type { BeatTemplateKind } from '../../types/beatStudio';
import { beatPreviewLines } from '../../utils/beatVisual';
import {
  inferTemplateKind,
  templateShortLabel,
  visualKindForTemplate,
} from '../../utils/beatTemplateRegistry';
import { colors } from '../../theme';
import { KIT_CHROME, kindAccent } from '../kitThemes/kitThemes';

export function BeatThumbnailCard({
  beat,
  styleKit,
  template: templateProp,
  active,
  onPress,
  compact,
  candidateBadge,
}: BeatThumbnailCardProps) {
  const chrome = KIT_CHROME[styleKit];
  const template = templateProp ?? inferTemplateKind(beat, styleKit);
  const visualKind = visualKindForTemplate(template);
  const accent = kindAccent(visualKind, chrome.accent);
  const { primary, secondary } = beatPreviewLines(beat);
  const leanSnippet = beat.leanCode.trim().split('\n').find((line) => line.trim()) ?? '';
  const turnSnippet = beat.turnCode.trim().split('\n').find((line) => line.trim()) ?? '';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        webModuleStyle(classes.card, compact ? classes.cardCompact : null, active ? classes.cardActive : null),
        {
          borderColor: active ? accent : colors.cardBorder,
          backgroundColor: chrome.accentSoft,
        },
      ]}
    >
      <View style={[webModuleStyle(classes.preview), { backgroundColor: 'rgba(2, 6, 23, 0.72)' }]}>
          <View style={webModuleStyle(classes.previewHeader)}>
            <Text style={webModuleStyle(classes.index)}>
              {String(beat.index + 1).padStart(2, '0')}
            </Text>
            <Text style={[webModuleStyle(classes.kind), { color: accent }]}>
              {templateShortLabel(template)}
            </Text>
          </View>
          {renderTemplatePreview(template, beat, secondary, leanSnippet, turnSnippet)}
        </View>
        <View style={webModuleStyle(classes.meta)}>
          <View style={webModuleStyle(classes.metaText)}>
            <Text style={webModuleStyle(classes.title)} numberOfLines={1}>
              {primary}
            </Text>
            <Text style={webModuleStyle(classes.sub)} numberOfLines={4}>
              {secondary || '—'}
            </Text>
          </View>
          {candidateBadge ? (
            <Text style={webModuleStyle(classes.candidateBadge)}>{candidateBadge}</Text>
          ) : null}
        </View>
    </Pressable>
  );
}

function renderTemplatePreview(
  template: BeatTemplateKind,
  beat: BeatThumbnailCardProps['beat'],
  secondary: string,
  leanSnippet: string,
  turnSnippet: string,
) {
  switch (template) {
    case 'compare-dual':
      return (
        <View style={webModuleStyle(classes.dual)}>
          <View style={webModuleStyle(classes.pane)}>
            <Text style={webModuleStyle(classes.paneLabel)}>Lean</Text>
            <Text style={webModuleStyle(classes.paneCode)} numberOfLines={3}>
              {leanSnippet || '—'}
            </Text>
          </View>
          <View style={webModuleStyle(classes.paneDivider)} />
          <View style={webModuleStyle(classes.pane)}>
            <Text style={webModuleStyle(classes.paneLabel)}>Turn</Text>
            <Text style={webModuleStyle(classes.paneCode)} numberOfLines={3}>
              {turnSnippet || '—'}
            </Text>
          </View>
        </View>
      );
    case 'stickers':
    case 'composited':
      return (
        <Text style={webModuleStyle(classes.memeText)} numberOfLines={4}>
          {beat.say.trim() || secondary}
        </Text>
      );
    case 'presenter-overlay':
      return (
        <View style={webModuleStyle(classes.heroBlock)}>
          <Text style={webModuleStyle(classes.heroMark)}>▶</Text>
          <Text style={webModuleStyle(classes.heroText)} numberOfLines={3}>
            {beat.visualNotes?.trim() || secondary}
          </Text>
        </View>
      );
    case 'turn-focus':
      return (
        <Text style={webModuleStyle(classes.bodyPreview)} numberOfLines={4}>
          {turnSnippet || leanSnippet || beat.visualNotes?.trim() || secondary}
        </Text>
      );
    case 'screen-recording':
      return (
        <View style={webModuleStyle(classes.heroBlock)}>
          <Text style={webModuleStyle(classes.heroMark)}>⏺</Text>
          <Text style={webModuleStyle(classes.heroText)} numberOfLines={3}>
            {beat.say.trim() || beat.visualNotes?.trim() || secondary}
          </Text>
        </View>
      );
    case 'manim-motion':
      return (
        <Text style={webModuleStyle(classes.bodyPreview)} numberOfLines={4}>
          {beat.visualNotes?.trim() || secondary}
        </Text>
      );
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}
