import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { openUsageAccessSettings } from '../services/usageCollector';
import { Colors, Radius, Spacing } from '../theme';

/**
 * Full-screen permission prompt shown ONCE when the app detects
 * that Usage Access has not been granted.
 *
 * Flow:
 *   1. User sees this screen explaining WHY the permission is needed.
 *   2. Taps "Grant Access" → Android Settings opens.
 *   3. User toggles the switch for this app.
 *   4. User returns to the app → the parent re-checks permission
 *      and hides this screen automatically.
 *
 * The "Skip for Now" button lets the user use the app without
 * usage tracking (predictions will use default/zero values).
 */
export const PermissionScreen = ({ onSkip }) => {
  const handleGrantAccess = () => {
    openUsageAccessSettings();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Icon name="chart-timeline-variant" size={56} color={Colors.primary} />
        </View>

        {/* Title */}
        <Text variant="headlineSmall" style={styles.title}>
          Usage Access Required
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          To accurately predict smartphone addiction, the app needs
          permission to read app usage data.
        </Text>

        {/* What we track card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="check-circle-outline" size={20} color={Colors.riskLow} />
              <Text variant="titleSmall" style={styles.cardTitle}>
                What we access
              </Text>
            </View>
            <BulletItem text="How long each app category is used (Social, Gaming, Education)" />
            <BulletItem text="Number of times you pick up your phone" />
            <BulletItem text="Late-night and weekend usage patterns" />
          </Card.Content>
        </Card>

        {/* What we DON'T track card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="shield-lock-outline" size={20} color={Colors.primary} />
              <Text variant="titleSmall" style={styles.cardTitle}>
                What we never access
              </Text>
            </View>
            <BulletItem text="No messages, chats, or notification content" />
            <BulletItem text="No browsing history or passwords" />
            <BulletItem text="No photos, contacts, or location" />
            <BulletItem text="All data stays on your device" />
          </Card.Content>
        </Card>

        {/* How to grant - instruction */}
        <Card style={[styles.card, { backgroundColor: Colors.infoBg }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="information-outline" size={20} color={Colors.info} />
              <Text variant="titleSmall" style={styles.cardTitle}>
                How to grant access
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.instruction}>
              1. Tap "Grant Access" below{'\n'}
              2. Find "MobileApp" in the list{'\n'}
              3. Toggle the switch ON{'\n'}
              4. Come back to this app
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleGrantAccess}
          style={styles.grantButton}
          contentStyle={styles.grantButtonContent}
          labelStyle={styles.grantButtonLabel}
          icon="cog-outline">
          Grant Access
        </Button>
        <Button
          mode="text"
          onPress={onSkip}
          style={styles.skipButton}
          labelStyle={styles.skipLabel}>
          Skip for Now
        </Button>
      </View>
    </View>
  );
};

const BulletItem = ({ text }) => (
  <View style={styles.bulletRow}>
    <View style={styles.bullet} />
    <Text variant="bodySmall" style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: '100%',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    elevation: 1,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.disabled,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  instruction: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  grantButton: {
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  grantButtonContent: {
    paddingVertical: Spacing.sm,
  },
  grantButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  skipButton: {
    marginTop: Spacing.sm,
  },
  skipLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
