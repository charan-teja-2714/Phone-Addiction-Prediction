import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../theme';

export const SectionHeader = ({ icon, title }) => (
  <View style={styles.row}>
    <Icon name={icon} size={20} color={Colors.primary} />
    <Text variant="titleSmall" style={styles.title}>
      {title}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
