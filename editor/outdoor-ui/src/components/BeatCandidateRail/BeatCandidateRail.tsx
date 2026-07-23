export type { BeatCandidateRailProps } from './BeatCandidateRail.types';

import classes from './BeatCandidateRail.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { BeatCandidateRailProps } from './BeatCandidateRail.types';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BEAT_TEMPLATE_REGISTRY } from '../../utils/beatTemplateRegistry';

export function BeatCandidateRail({
  candidates,
  selectedCandidateId,
  onSelect,
  onAdd,
  layout = 'horizontal',
}: BeatCandidateRailProps) {
  const vertical = layout === 'vertical';

  return (
    <View style={webModuleStyle(classes.wrap, vertical ? classes.wrapVertical : null)}>
      <View style={webModuleStyle(classes.header, vertical ? classes.headerVertical : null)}>
        <Text style={webModuleStyle(classes.title, vertical ? classes.titleVertical : null)}>
          {vertical ? 'Vars' : 'Variants'}
        </Text>
        {onAdd ? (
          <View
            style={webModuleStyle(classes.actions, vertical ? classes.actionsVertical : null)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add variant"
              onPress={onAdd}
              style={webModuleStyle(classes.chip, classes.chipAdd)}
            >
              <Text style={webModuleStyle(classes.chipAddText)}>
                {vertical ? '+' : '+ Add'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <ScrollView
        horizontal={!vertical}
        style={vertical ? webModuleStyle(classes.railScrollVertical) : undefined}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={webModuleStyle(vertical ? classes.railVertical : classes.rail)}
        keyboardShouldPersistTaps="handled"
      >
        {candidates.map((candidate) => {
          const active = candidate.id === selectedCandidateId;
          const template = BEAT_TEMPLATE_REGISTRY[candidate.template];
          return (
            <Pressable
              key={candidate.id}
              accessibilityRole="button"
              onPress={() => onSelect(candidate.id)}
              style={webModuleStyle(
                classes.card,
                vertical ? classes.cardVertical : null,
                active ? classes.cardActive : null,
              )}
            >
              <View style={webModuleStyle(classes.cardHeader)}>
                <Text style={webModuleStyle(classes.cardLabel, active ? classes.cardLabelActive : null)}>
                  {candidate.label}
                </Text>
              </View>
              <Text style={webModuleStyle(classes.cardTemplate)} numberOfLines={1}>
                {template.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
