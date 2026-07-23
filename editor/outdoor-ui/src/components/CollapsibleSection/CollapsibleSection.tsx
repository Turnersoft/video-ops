export type { CollapsibleSectionProps } from './CollapsibleSection.types';

import classes from './CollapsibleSection.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { CollapsibleSectionProps } from './CollapsibleSection.types';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          webModuleStyle(classes.header),
          pressed ? { opacity: 0.85 } : undefined,
        ]}
      >
        <Text style={webModuleStyle(classes.chevron)}>{open ? '▾' : '▸'}</Text>
        <View style={webModuleStyle(classes.headerText)}>
          <Text style={webModuleStyle(classes.title)}>{title}</Text>
          {!open && summary ? (
            <Text style={webModuleStyle(classes.summary)} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {open ? <View style={webModuleStyle(classes.body)}>{children}</View> : null}
    </View>
  );
}
