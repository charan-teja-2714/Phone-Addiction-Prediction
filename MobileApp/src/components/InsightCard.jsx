import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Spacing } from '../theme';

export const InsightCard = ({
  icon,
  text,
  color = Colors.info,
}) => (
  <Card style={styles.card}>
    <Card.Content style={styles.content}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text variant="bodyMedium" style={styles.text}>
        {text}
      </Text>
    </Card.Content>
  </Card>
);



const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});
