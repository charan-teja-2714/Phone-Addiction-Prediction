import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CompletenessCard } from '../components/CompletenessCard';
import { InsightCard } from '../components/InsightCard';
import { RiskAlertCard } from '../components/RiskAlertCard';
import { RiskCard } from '../components/RiskCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { usePrediction } from '../hooks/usePrediction';
import { collectPerAppUsage, collectUsageStats } from '../services/usageCollector';
import { useAppStore } from '../store/useAppStore';
import { formatDuration, formatHours } from '../utils/formatTime';
import { Colors, Radius, Spacing } from '../theme';

// Category metadata for the screen-time modal
const CATEGORY_META = {
  'Social Media': { icon: 'forum-outline', color: Colors.categorySocial },
  'Gaming': { icon: 'gamepad-variant-outline', color: Colors.categoryGaming },
  'Education': { icon: 'school-outline', color: Colors.categoryEducation },
  'Entertainment': { icon: 'play-circle-outline', color: '#E91E63' },
  'Communication': { icon: 'message-text-outline', color: '#2196F3' },
  'Browser': { icon: 'web', color: '#FF9800' },
  'Shopping': { icon: 'cart-outline', color: '#9C27B0' },
  'Finance': { icon: 'bank-outline', color: '#00897B' },
  'Productivity': { icon: 'briefcase-check-outline', color: '#43A047' },
  'Other': { icon: 'dots-horizontal-circle-outline', color: Colors.categoryOther },
};

export const HomeScreen = () => {
  const prediction = useAppStore((s) => s.prediction);
  const completeness = useAppStore((s) => s.dataCompleteness);
  const usage = useAppStore((s) => s.usageStats);
  const perAppUsage = useAppStore((s) => s.perAppUsage);
  const customCategories = useAppStore((s) => s.customCategories);
  const setUsageStats = useAppStore((s) => s.setUsageStats);
  const setPerAppUsage = useAppStore((s) => s.setPerAppUsage);
  const [refreshing, setRefreshing] = useState(false);
  const [showScreenTime, setShowScreenTime] = useState(false);
  const { predict, loading: predicting } = usePrediction();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [stats, apps] = await Promise.all([
      collectUsageStats(),
      collectPerAppUsage(),
    ]);
    if (!stats.permissionDenied) {
      setUsageStats({
        dailyUsageHours: stats.dailyUsageHours,
        phoneChecks: stats.phoneChecksPerDay,
        screenTimeBeforeBed: stats.screenTimeBeforeBed,
        weekendUsage: stats.weekendUsageHours,
        socialMediaHours: stats.timeOnSocialMedia,
        gamingHours: stats.timeOnGaming,
        educationHours: stats.timeOnEducation,
        appsUsed: stats.appsUsedDaily,
      });
    }
    if (apps.length > 0) setPerAppUsage(apps);
    useAppStore.getState().refreshWeeklyHistory?.();
    await predict();
    setRefreshing(false);
  }, [setUsageStats, setPerAppUsage, predict]);

  // Per-app data for the screen time modal
  const allAppsSorted = useMemo(() => {
    return [...perAppUsage]
      .map((app) => ({
        ...app,
        category: customCategories[app.packageName] || app.category,
      }))
      .sort((a, b) => b.usageMs - a.usageMs);
  }, [perAppUsage, customCategories]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={styles.greeting}>
            Digital Wellbeing
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Your daily wellness overview
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Icon name="cellphone-check" size={28} color={Colors.primary} />
        </View>
      </View>

      {/* Hero Donut Card */}
      <RiskCard prediction={prediction} usage={usage} perAppUsage={perAppUsage} />

      {/* Risk Alert + Suggestions */}
      <RiskAlertCard prediction={prediction} usage={usage} />

      {/* Predict Button */}
      {!prediction && (
        <View style={styles.predictRow}>
          <Button
            mode="contained"
            onPress={predict}
            loading={predicting}
            disabled={predicting}
            icon="brain"
            style={styles.predictBtn}
            labelStyle={styles.predictBtnLabel}>
            {predicting ? 'Analyzing...' : 'Get Risk Prediction'}
          </Button>
        </View>
      )}

      {/* Data Completeness */}
      <CompletenessCard completeness={completeness} />

      {/* Quick Stats */}
      <SectionHeader icon="chart-box-outline" title="Quick Stats" />
      <View style={styles.sourceNote}>
        <Icon name="clock-outline" size={14} color={Colors.textSecondary} />
        <Text variant="labelSmall" style={styles.sourceText}>
          Today · Pull down to refresh
        </Text>
      </View>
      <View style={styles.grid}>
        <StatCard
          icon="clock-time-four-outline"
          label="Screen Time"
          value={formatHours(usage.dailyUsageHours)}
          iconColor={Colors.primary}
          onPress={() => setShowScreenTime(true)}
        />
        <StatCard
          icon="lock-open-outline"
          label="Phone Checks"
          value={`${usage.phoneChecks}`}
          iconColor={Colors.categorySocial}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          icon="moon-waning-crescent"
          label="Night Usage"
          value={formatHours(usage.screenTimeBeforeBed)}
          iconColor={Colors.riskModerate}
        />
        <StatCard
          icon="view-grid-outline"
          label="Apps Used"
          value={`${usage.appsUsed || perAppUsage.length}`}
          iconColor={Colors.categoryEducation}
        />
      </View>

      {/* Daily Insights */}
      <SectionHeader icon="lightbulb-on-outline" title="Today's Insights" />
      <InsightCard
        icon="bed-outline"
        text="Getting enough sleep helps regulate screen time. Aim for 7–8 hours nightly."
        color={Colors.accent}
      />

      <InsightCard
        icon="walk"
        text="Physical activity naturally reduces the urge to check your phone frequently."
        color={Colors.riskLow}
      />

      <InsightCard
        icon="school-outline"
        text="Spending time on educational content promotes healthier phone usage patterns."
        color={Colors.info}
      />

      <View style={styles.bottomSpacer} />

      {/* ── Screen Time Detail Modal ── */}
      <Modal
        visible={showScreenTime}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScreenTime(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} bounces={false}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Screen Time Breakdown
                </Text>
                <TouchableOpacity onPress={() => setShowScreenTime(false)}>
                  <Icon name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text variant="bodySmall" style={styles.modalSubtitle}>
                Today's usage — all apps
              </Text>

              {allAppsSorted.length > 0 ? (
                allAppsSorted.map((app, i) => {
                  const meta = CATEGORY_META[app.category] || CATEGORY_META['Other'];
                  return (
                    <View key={app.packageName} style={styles.modalRow}>
                      <Text variant="bodySmall" style={styles.modalRank}>{i + 1}</Text>
                      <View style={[styles.modalDot, { backgroundColor: meta.color }]} />
                      <View style={styles.modalAppInfo}>
                        <Text variant="bodyMedium" style={styles.modalAppName} numberOfLines={1}>
                          {app.appName}
                        </Text>
                        <Text variant="labelSmall" style={{ color: meta.color, fontSize: 10 }}>
                          {app.category}
                        </Text>
                      </View>
                      <Text variant="titleSmall" style={styles.modalCatValue}>
                        {formatDuration(app.usageMs)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text variant="bodySmall" style={styles.modalEmpty}>
                  No app data yet. Pull down to refresh on the home screen.
                </Text>
              )}

              <View style={styles.modalTotal}>
                <Icon name="sigma" size={18} color={Colors.textPrimary} />
                <Text variant="bodyMedium" style={styles.modalTotalLabel}>Total</Text>
                <Text variant="titleMedium" style={styles.modalTotalValue}>
                  {formatHours(usage.dailyUsageHours)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  greeting: { fontWeight: '700', color: Colors.textPrimary },
  subtitle: { color: Colors.textSecondary, marginTop: 2 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryLight + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  sourceNote: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  sourceText: { color: Colors.textSecondary },
  grid: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  predictRow: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  predictBtn: {
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  predictBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: { height: Spacing.lg },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalScroll: {
    maxHeight: '80%',
    marginTop: 'auto',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontWeight: '700', color: Colors.textPrimary },
  modalSubtitle: { color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.md },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  modalRank: {
    width: 20, textAlign: 'center', color: Colors.textSecondary, fontWeight: '600', fontSize: 11,
  },
  modalDot: { width: 8, height: 8, borderRadius: 4 },
  modalAppInfo: { flex: 1 },
  modalAppName: { color: Colors.textPrimary, fontWeight: '500' },
  modalCatValue: { fontWeight: '700', color: Colors.textPrimary },
  modalEmpty: { color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.lg },
  modalTotal: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md,
  },
  modalTotalLabel: { flex: 1, fontWeight: '600', color: Colors.textPrimary },
  modalTotalValue: { fontWeight: '700', color: Colors.primary },
});
