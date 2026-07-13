import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export type CollapsibleSectionProps = {
  title: string;
  summary?: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed ? styles.headerPressed : null]}
      >
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!open && summary ? (
            <Text style={styles.summary} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  headerPressed: {
    opacity: 0.85,
  },
  chevron: {
    color: colors.orange,
    fontSize: typography.small,
    fontWeight: '900',
    width: 14,
    marginTop: 1,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  summary: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 15,
  },
  body: {
    gap: spacing.xs,
  },
});
