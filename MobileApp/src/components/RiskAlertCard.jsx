import React, { useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Spacing } from '../theme';

/**
 * Personalized risk alert shown on the Home screen when ML predicts
 * Moderate or High addiction risk.
 *
 * Generates context-aware tips from actual usage data (social hours,
 * phone checks, night usage) rather than generic advice.
 */

// ── Tip library ──────────────────────────────────────────────────────────────
const HIGH_TIPS = [
  {
    icon: 'phone-off',
    title: 'Phone-Free Hours',
    body: 'Set 2 phone-free hours today — meal times are a great start. Use Do Not Disturb.',
  },
  {
    icon: 'bell-off-outline',
    title: 'Mute Non-Essential Notifications',
    body: 'Social media and shopping notifications drive impulsive phone checks. Silence them.',
  },
  {
    icon: 'run-fast',
    title: 'Replace Scrolling with Movement',
    body: 'Every time you feel the urge to open social media, do 10 push-ups or a 5-min walk instead.',
  },
  {
    icon: 'moon-waning-crescent',
    title: 'Phone Out of Bedroom',
    body: 'Charge your phone outside the bedroom tonight. Use an alarm clock instead.',
  },
  {
    icon: 'timer-outline',
    title: 'App Timer',
    body: 'Set a daily limit on your top apps in Settings → Digital Wellbeing → App timers.',
  },
];

const MODERATE_TIPS = [
  {
    icon: 'clock-check-outline',
    title: 'Schedule Check-In Times',
    body: 'Instead of checking your phone constantly, pick 3 fixed times per day to catch up.',
  },
  {
    icon: 'palette-outline',
    title: 'Grayscale Mode',
    body: 'Switch your display to grayscale. Color is a key driver of addictive app design.',
  },
  {
    icon: 'book-open-variant',
    title: 'Read Instead',
    body: 'Replace 30 min of social media with reading. Any book — fiction works just as well.',
  },
  {
    icon: 'nature-people',
    title: 'Outdoor Break',
    body: 'Take a 15-min outdoor walk without your phone. Fresh air resets dopamine levels.',
  },
];

// ── Context-aware tip generation ─────────────────────────────────────────────
function getContextTips(usage, label) {
  const tips = [];

  // Always add 2-3 label-specific tips first
  const pool = label === 'High Addiction' ? HIGH_TIPS : MODERATE_TIPS;
  tips.push(...pool.slice(0, 2));

  // Add usage-specific tips
  if (usage?.screenTimeBeforeBed > 1) {
    tips.push({
      icon: 'bed-clock',
      title: 'Late-Night Screen Time Detected',
      body: `You used your phone late at night. Blue light disrupts melatonin — try stopping by 10 PM.`,
    });
  }

  if (usage?.phoneChecks > 50) {
    tips.push({
      icon: 'gesture-tap-hold',
      title: 'Too Many Phone Checks',
      body: `${usage.phoneChecks} unlocks today. Try leaving your phone face-down and only checking on vibration.`,
    });
  } else if (usage?.phoneChecks > 30) {
    tips.push({
      icon: 'gesture-tap-hold',
      title: 'Frequent Phone Checks',
      body: `${usage.phoneChecks} unlocks today. Group your tasks into batches to reduce constant switching.`,
    });
  }

  if (usage?.socialMediaHours > 2) {
    tips.push({
      icon: 'account-group-outline',
      title: 'High Social Media Use',
      body: `${Math.round(usage.socialMediaHours * 60)} min on social media today. Try a 24-hour social media fast once a week.`,
    });
  }

  if (usage?.educationHours < 0.25) {
    tips.push({
      icon: 'school-outline',
      title: 'Boost Productive Screen Time',
      body: 'Try replacing 30 min of entertainment with a podcast, course, or audiobook.',
    });
  }

  // Return max 4 tips
  return tips.slice(0, 4);
}

// ── Config per risk level ─────────────────────────────────────────────────────
const RISK_CONFIG = {
  'High Addiction': {
    bg: Colors.riskHigh + '12',
    border: Colors.riskHigh,
    icon: 'alert-circle',
    iconColor: Colors.riskHigh,
    badge: 'HIGH RISK',
    badgeBg: Colors.riskHigh,
    headline: 'High Addiction Risk Detected',
    sub: 'Your usage patterns suggest a significant risk. Here\'s what to do right now:',
  },
  'Moderate Addiction': {
    bg: Colors.riskModerate + '12',
    border: Colors.riskModerate,
    icon: 'alert',
    iconColor: Colors.riskModerate,
    badge: 'MODERATE RISK',
    badgeBg: Colors.riskModerate,
    headline: 'Moderate Addiction Risk',
    sub: 'Your usage is trending upward. Small changes now prevent bigger problems later:',
  },
  'Low Addiction': {
    bg: Colors.riskLow + '10',
    border: Colors.riskLow,
    icon: 'check-circle',
    iconColor: Colors.riskLow,
    badge: 'LOW RISK',
    badgeBg: Colors.riskLow,
    headline: 'You\'re Doing Well!',
    sub: 'Keep up your healthy phone habits. Here are tips to stay on track:',
  },
};

// ── Main component ─────────────────────────────────────────────────────────────
export const RiskAlertCard = ({ prediction, usage }) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!prediction || dismissed) return null;

  // Only show for High and Moderate (Low is shown collapsed as a success card)
  const label = prediction.label;
  const config = RISK_CONFIG[label] || RISK_CONFIG['Low Addiction'];
  const tips = getContextTips(usage, label);
  const isLow = label === 'Low Addiction';

  // For Low risk, show a compact green success card instead
  if (isLow) {
    return (
      <View style={[styles.lowCard, { borderColor: config.border, backgroundColor: config.bg }]}>
        <Icon name={config.icon} size={20} color={config.iconColor} />
        <View style={styles.lowTextWrap}>
          <Text variant="bodyMedium" style={[styles.lowTitle, { color: config.iconColor }]}>
            {config.headline}
          </Text>
          <Text variant="labelSmall" style={styles.lowSub}>
            {Math.round(prediction.confidence * 100)}% confidence · Keep it up!
          </Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)}>
          <Icon name="close" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Card style={[styles.card, { borderColor: config.border, backgroundColor: config.bg }]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name={config.icon} size={22} color={config.iconColor} />
          <View style={styles.headerText}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
                <Text style={styles.badgeText}>{config.badge}</Text>
              </View>
              <Text variant="labelSmall" style={styles.confidence}>
                {Math.round(prediction.confidence * 100)}% confidence
              </Text>
            </View>
            <Text variant="titleSmall" style={[styles.headline, { color: config.iconColor }]}>
              {config.headline}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
          <Icon name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text variant="bodySmall" style={styles.sub}>{config.sub}</Text>

      {/* Tips list */}
      <View style={styles.tipsWrap}>
        {(expanded ? tips : tips.slice(0, 2)).map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={[styles.tipIcon, { backgroundColor: config.border + '18' }]}>
              <Icon name={tip.icon} size={16} color={config.iconColor} />
            </View>
            <View style={styles.tipText}>
              <Text variant="bodySmall" style={styles.tipTitle}>{tip.title}</Text>
              <Text variant="labelSmall" style={styles.tipBody}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {tips.length > 2 && (
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}>
          <Text variant="labelMedium" style={[styles.expandText, { color: config.iconColor }]}>
            {expanded ? 'Show less' : `Show ${tips.length - 2} more tips`}
          </Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={config.iconColor}
          />
        </TouchableOpacity>
      )}

      {/* Action row */}
      <View style={styles.actionRow}>
        <Icon name="clock-outline" size={12} color={Colors.textSecondary} />
        <Text variant="labelSmall" style={styles.timestamp}>
          Based on prediction at {prediction.timestamp}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  // ── High/Moderate alert card ──
  card: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  headerText: { flex: 1 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  confidence: { color: Colors.textSecondary },
  headline: { fontWeight: '700', fontSize: 14 },
  closeBtn: { padding: 4 },
  sub: { color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },

  // Tips
  tipsWrap: { gap: Spacing.sm, marginBottom: Spacing.sm },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface + 'CC',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1 },
  tipTitle: { fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  tipBody: { color: Colors.textSecondary, lineHeight: 17 },

  // Show more
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  expandText: { fontWeight: '600', fontSize: 13 },

  // Timestamp
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  timestamp: { color: Colors.textSecondary },

  // ── Low risk compact card ──
  lowCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lowTextWrap: { flex: 1 },
  lowTitle: { fontWeight: '600', fontSize: 13 },
  lowSub: { color: Colors.textSecondary, marginTop: 1 },
});
