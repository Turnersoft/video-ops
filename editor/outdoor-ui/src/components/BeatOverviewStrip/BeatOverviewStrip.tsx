export type { BeatOverviewStripProps } from './BeatOverviewStrip.types';

import classes from './BeatOverviewStrip.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { BeatOverviewStripProps } from './BeatOverviewStrip.types';
import { ScrollView, Text, View } from 'react-native';

import { inferTemplateKind } from '../../utils/beatTemplateRegistry';
import { BeatThumbnailCard } from '../BeatThumbnailCard/BeatThumbnailCard';
import { KIT_CHROME } from '../kitThemes/kitThemes';

export function BeatOverviewStrip({
  beats,
  styleKit,
  activeIndex,
  onSelect,
  beatStudio,
}: BeatOverviewStripProps) {
  const chrome = KIT_CHROME[styleKit];
  const board = chrome.stripLayout === 'board';

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <View style={webModuleStyle(classes.header)}>
        <Text style={[webModuleStyle(classes.title), { color: chrome.accent }]}>
          {chrome.overviewTitle}
        </Text>
        <Text style={webModuleStyle(classes.hint)} numberOfLines={2}>
          {chrome.overviewHint}
        </Text>
      </View>
      <ScrollView
        horizontal={!board}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={webModuleStyle(classes.strip, board ? classes.board : null)}
      >
        {beats.map((beat, index) => {
          const beatState = beatStudio?.beats[String(index)];
          const selected = beatState?.candidates.find(
            (candidate) => candidate.id === beatState.selectedCandidateId,
          );
          const candidateBadge =
            selected && beatState && beatState.candidates.length > 0
              ? beatState.candidates.length > 1
                ? `${selected.label} · ${beatState.candidates.length}`
                : undefined
              : undefined;
          return (
            <BeatThumbnailCard
              key={beat.id}
              beat={beat}
              styleKit={styleKit}
              template={selected?.template ?? inferTemplateKind(beat, styleKit)}
              active={index === activeIndex}
              compact={chrome.stripLayout === 'filmstrip'}
              candidateBadge={candidateBadge}
              onPress={() => onSelect(index)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
