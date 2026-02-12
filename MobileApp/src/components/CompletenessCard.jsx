import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, ProgressBar, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Spacing } from '../theme';

export const CompletenessCard = ({ completeness }) => {
  const pct = Math.round(completeness * 100);
  const color =
    pct >= 80 ? Colors.riskLow : pct >= 40 ? Colors.riskModerate : Colors.riskHigh;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="clipboard-check-outline" size={20} color={Colors.primary} />
            <Text variant="titleSmall" style={styles.title}>
              Data Completeness
            </Text>
          </View>
          <Text variant="titleMedium" style={[styles.pct, { color }]}>
            {pct}%
          </Text>
        </View>
        <ProgressBar
          progress={completeness}
          color={color}
          style={styles.bar}
        />
        <View style={styles.hintRow}>
          <Icon name="information-outline" size={14} color={Colors.textSecondary} />
          <Text variant="bodySmall" style={styles.hint}>
            {pct < 100
              ? 'Complete the questionnaire for more accurate results'
              : 'All fields completed - predictions are at full accuracy'}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  pct: {
    fontWeight: '700',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.divider,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  hint: {
    color: Colors.textSecondary,
    flex: 1,
  },
});
