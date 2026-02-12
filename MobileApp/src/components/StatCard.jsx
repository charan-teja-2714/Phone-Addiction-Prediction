import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Spacing } from '../theme';

export const StatCard = ({
  icon,
  label,
  value,
  iconColor = Colors.primary,
  onPress,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7, style: styles.wrapper } : { style: styles.wrapper };

  return (
    <Wrapper {...wrapperProps}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '15' }]}>
            <Icon name={icon} size={22} color={iconColor} />
          </View>
          <Text variant="titleMedium" style={styles.value}>
            {value}
          </Text>
          <Text variant="bodySmall" style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </Card.Content>
      </Card>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    elevation: 1,
    minWidth: '45%',
  },
  content: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  label: {
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
