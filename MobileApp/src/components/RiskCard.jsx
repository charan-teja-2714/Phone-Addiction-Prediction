import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DonutChart } from './DonutChart';
import { formatDuration, formatHours } from '../utils/formatTime';
import { Colors, Radius, Spacing, getRiskColor } from '../theme';

// Distinct colors for individual app segments
const APP_COLORS = [
  '#7B68EE', '#FF7043', '#4DB6A9', '#E91E63', '#2196F3',
  '#FF9800', '#9C27B0', '#00897B', '#43A047', '#FFB300',
  '#5C6BC0', '#EF5350', '#26A69A', '#AB47BC', '#8D6E63',
];

/**
 * Hero card on the Home screen.
 *
 * Shows a donut chart of today's screen-time breakdown by individual app.
 * Top apps get their own segment; tiny apps are grouped into "Others".
 * Center: risk prediction label when available, or total screen time.
 */
export const RiskCard = ({ prediction, usage, perAppUsage = [] }) => {
  const total = usage?.dailyUsageHours ?? 0;

  // Build per-app segments from real data, or fall back to category-based
  const { segments, legendItems } = useMemo(() => {
    if (perAppUsage.length > 0) {
      const sorted = [...perAppUsage].sort((a, b) => b.usageMs - a.usageMs);
      const MAX_SEGMENTS = 8;
      const topApps = sorted.slice(0, MAX_SEGMENTS);
      const restApps = sorted.slice(MAX_SEGMENTS);
      const restMs = restApps.reduce((sum, a) => sum + a.usageMs, 0);

      const segs = topApps.map((app, i) => ({
        value: app.usageMs,
        color: APP_COLORS[i % APP_COLORS.length],
        label: app.appName,
      }));
      if (restMs > 0) {
        segs.push({
          value: restMs,
          color: Colors.categoryOther,
          label: `+${restApps.length} others`,
        });
      }

      // Legend shows top 4 + others (keeps it compact)
      const LEGEND_MAX = 4;
      const legend = segs.slice(0, LEGEND_MAX);
      if (segs.length > LEGEND_MAX) {
        const remaining = segs.slice(LEGEND_MAX).reduce((s, seg) => s + seg.value, 0);
        legend.push({ value: remaining, color: Colors.categoryOther, label: 'Others' });
      }

      return { segments: segs, legendItems: legend };
    }

    // Fallback: category-based when no per-app data
    const social = usage?.socialMediaHours ?? 0;
    const gaming = usage?.gamingHours ?? 0;
    const education = usage?.educationHours ?? 0;
    const other = Math.max(0, total - social - gaming - education);
    const segs = [
      { value: social, color: Colors.categorySocial, label: 'Social' },
      { value: gaming, color: Colors.categoryGaming, label: 'Gaming' },
      { value: education, color: Colors.categoryEducation, label: 'Education' },
      { value: other, color: Colors.categoryOther, label: 'Others' },
    ];
    return { segments: segs, legendItems: segs };
  }, [perAppUsage, usage, total]);

  const isPerApp = perAppUsage.length > 0;

  // ── Centre content ──
  const centerContent = prediction ? (
    <View style={styles.center}>
      <Icon name="shield-check" size={20} color={getRiskColor(prediction.label)} />
      <Text style={[styles.centerMain, { color: getRiskColor(prediction.label) }]}>
        {prediction.label.split(' ')[0]}
      </Text>
      <Text style={styles.centerSub}>Risk Level</Text>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.centerTime}>
        {total > 0 ? formatHours(total) : '0s'}
      </Text>
      <Text style={styles.centerSub}>{total > 0 ? 'today' : 'No data yet'}</Text>
    </View>
  );

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        {/* Donut chart */}
        <DonutChart
          size={180}
          strokeWidth={26}
          segments={segments}
          centerContent={centerContent}
        />

        {/* Legend */}
        <View style={styles.legendRow}>
          {legendItems.map((seg) => (
            <View key={seg.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text variant="labelSmall" style={styles.legendLabel} numberOfLines={1}>
                {seg.label}
              </Text>
              <Text variant="labelSmall" style={styles.legendValue}>
                {isPerApp ? formatDuration(seg.value) : formatHours(seg.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Prediction meta (confidence + time) */}
        {prediction && (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="target" size={14} color={Colors.textSecondary} />
              <Text variant="labelSmall" style={styles.metaText}>
                {Math.round(prediction.confidence * 100)}% confidence
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock-outline" size={14} color={Colors.textSecondary} />
              <Text variant="labelSmall" style={styles.metaText}>
                {prediction.timestamp}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    elevation: 2,
  },
  content: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  // Centre of donut
  center: { alignItems: 'center', justifyContent: 'center' },
  centerMain: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  centerTime: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  centerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  // Legend — 2-column grid
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '50%',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: Colors.textSecondary, fontSize: 11, flex: 1 },
  legendValue: { color: Colors.textPrimary, fontWeight: '600', fontSize: 11 },

  // Prediction meta
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: { color: Colors.textSecondary },
});
