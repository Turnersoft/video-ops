import { StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles, spacing, typography } from '../theme';

export type FilmScreenProps = {
  scriptId: string;
};

/** Native builds use the iOS teleprompter FilmScreen — this stub is for non-web only. */
export function FilmScreen(_props: FilmScreenProps) {
  return (
    <View style={sharedStyles.screen}>
      <Text style={styles.copy}>Filming is available in the iPhone teleprompter app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.muted,
    fontSize: typography.body,
    padding: spacing.lg,
    lineHeight: 22,
  },
});
