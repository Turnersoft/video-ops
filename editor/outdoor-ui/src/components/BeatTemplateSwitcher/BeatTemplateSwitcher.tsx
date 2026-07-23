export type { BeatTemplateSwitcherProps } from './BeatTemplateSwitcher.types';

import classes from './BeatTemplateSwitcher.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { BeatTemplateSwitcherProps } from './BeatTemplateSwitcher.types';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BEAT_TEMPLATE_KINDS, BEAT_TEMPLATE_REGISTRY } from '../../utils/beatTemplateRegistry';

export function BeatTemplateSwitcher({ value, onChange }: BeatTemplateSwitcherProps) {
  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Text style={webModuleStyle(classes.label)}>Beat template</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={webModuleStyle(classes.row)}
        keyboardShouldPersistTaps="handled"
      >
        {BEAT_TEMPLATE_KINDS.map((kind) => {
          const def = BEAT_TEMPLATE_REGISTRY[kind];
          const active = value === kind;
          return (
            <Pressable
              key={kind}
              accessibilityRole="button"
              onPress={() => onChange(kind)}
                      style={webModuleStyle(classes.chip, active ? classes.chipActive : null)}
            >
              <Text style={webModuleStyle(classes.chipText, active ? classes.chipTextActive : null)}>
                {def.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
