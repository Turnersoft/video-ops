import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '../../theme';

export type SectionLabelProps = TextProps & {
  children: ReactNode;
};

export function SectionLabel({ children, style, ...rest }: SectionLabelProps) {
  return (
    <Text style={[styles.label, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 22,
    marginBottom: 10,
    color: colors.section,
    fontSize: typography.section,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
