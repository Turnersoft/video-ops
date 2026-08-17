export type { LanguageToggleProps } from './LanguageToggle.types';

import classes from '../VoiceEngineToggle/VoiceEngineToggle.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { LanguageToggleProps } from './LanguageToggle.types';
import { Pressable, Text, View } from 'react-native';

import {
  SCRIPT_LANGUAGE_IDS,
  SCRIPT_LANGUAGE_LABELS,
  type ScriptLanguageId,
} from '../../utils/scriptLanguage';

export function LanguageToggle({ value, onChange, disabled }: LanguageToggleProps) {
  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Text style={webModuleStyle(classes.label)}>Lang</Text>
      {SCRIPT_LANGUAGE_IDS.map((language: ScriptLanguageId) => {
        const active = value === language;
        return (
          <Pressable
            key={language}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onChange(language)}
            style={webModuleStyle(classes.chip, active ? classes.chipActive : null)}
          >
            <Text
              style={webModuleStyle(classes.chipText, active ? classes.chipTextActive : null)}
            >
              {language === 'zh' ? '中文' : 'EN'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
