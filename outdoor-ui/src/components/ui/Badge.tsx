import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../../theme';

export type BadgeProps = {
  label: string;
  filmed?: boolean;
};

export function Badge({ label, filmed = false }: BadgeProps) {
  return (
    <View style={[styles.badge, filmed ? styles.filmed : null]}>
      <Text style={[styles.text, filmed ? styles.filmedText : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.badgePending,
  },
  filmed: {
    backgroundColor: colors.badgeFilmed,
  },
  text: {
    fontSize: typography.tiny,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  filmedText: {
    color: colors.badgeFilmedText,
  },
});
