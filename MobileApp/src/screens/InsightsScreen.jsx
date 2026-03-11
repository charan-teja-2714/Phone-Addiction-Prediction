import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { InsightCard } from '../components/InsightCard';
import { SectionHeader } from '../components/SectionHeader';
import { collectPerAppUsage, collectUsageStats } from '../services/usageCollector';
import { runPrediction } from '../services/predictionService';
import { useAppStore } from '../store/useAppStore';
import { formatDuration, formatHours } from '../utils/formatTime';
import { Colors, Radius, Spacing } from '../theme';

// ── Category config ──
const CATEGORY_LIST = [
  'Social Media', 'Gaming', 'Education', 'Entertainment',
  'Communication', 'Browser', 'Shopping', 'Finance',
  'Productivity', 'Other',
];

const CATEGORY_META = {
  'Social Media':   { icon: 'forum-outline',                 color: Colors.categorySocial },
  'Gaming':         { icon: 'gamepad-variant-outline',        color: Colors.categoryGaming },
  'Education':      { icon: 'school-outline',                 color: Colors.categoryEducation },
  'Entertainment':  { icon: 'play-circle-outline',            color: '#E91E63' },
  'Communication':  { icon: 'message-text-outline',           color: '#2196F3' },
  'Browser':        { icon: 'web',                            color: '#FF9800' },
  'Shopping':       { icon: 'cart-outline',                   color: '#9C27B0' },
  'Finance':        { icon: 'bank-outline',                   color: '#00897B' },
  'Productivity':   { icon: 'briefcase-check-outline',        color: '#43A047' },
  'Other':          { icon: 'dots-horizontal-circle-outline', color: Colors.categoryOther },
};

// ── Weekly trend chart ──
const RISK_COLORS = [Colors.riskLow, Colors.riskModerate, Colors.riskHigh];
const BAR_MAX_HEIGHT = 110;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WeeklyTrendChart = ({ weeklyHistory }) => {
  const todayName = DAY_NAMES[new Date().getDay()];
  return (
    <View style={styles.chartWrapper}>
      <View style={styles.yAxis}>
        <Text variant="labelSmall" style={styles.yLabel}>High</Text>
        <Text variant="labelSmall" style={styles.yLabel}>Med</Text>
        <Text variant="labelSmall" style={styles.yLabel}>Low</Text>
      </View>
      <View style={styles.barsContainer}>
        <View style={[styles.gridLine, { bottom: '33%' }]} />
        <View style={[styles.gridLine, { bottom: '66%' }]} />
        <View style={styles.barsRow}>
          {weeklyHistory.map((entry) => {
            const level = Math.min(Math.max(entry.riskLevel, 0), 2);
            const color = RISK_COLORS[level];
            const heightPct = ((level + 1) / 3) * 100;
            const isToday = entry.day === todayName;
            return (
              <View key={entry.day} style={styles.barColumn}>
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.vertBar,
                      { height: `${heightPct}%`, backgroundColor: color },
                      isToday && styles.vertBarToday,
                    ]}>
                    <View style={[styles.barDot, { borderColor: color }]} />
                  </View>
                </View>
                <Text
                  variant="labelSmall"
                  style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {entry.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ── Expandable category card ──
const CategoryCard = ({ category, apps, totalMs, onAppPress }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[category] || CATEGORY_META['Other'];

  return (
    <Card style={styles.catCard}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={styles.catCardHeader}>
        <View style={[styles.catIconWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.catCardInfo}>
          <Text variant="bodyMedium" style={styles.catCardLabel}>{category}</Text>
          <Text variant="labelSmall" style={styles.catCardCount}>
            {apps.length} {apps.length === 1 ? 'app' : 'apps'}
          </Text>
        </View>
        <Text variant="titleSmall" style={[styles.catCardTime, { color: meta.color }]}>
          {formatDuration(totalMs)}
        </Text>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.catCardApps}>
          {apps.map((app) => (
            <TouchableOpacity
              key={app.packageName}
              style={styles.catAppRow}
              onPress={() => onAppPress(app)}
              activeOpacity={0.7}>
              <View style={[styles.catAppDot, { backgroundColor: meta.color }]} />
              <Text variant="bodySmall" style={styles.catAppName} numberOfLines={1}>
                {app.appName}
              </Text>
              <Icon name="folder-move-outline" size={14} color={Colors.textSecondary} />
              <Text variant="bodySmall" style={styles.catAppTime}>
                {formatDuration(app.usageMs)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );
};

// ── Main screen ──
export const InsightsScreen = () => {
  const usage = useAppStore((s) => s.usageStats);
  const weeklyHistory = useAppStore((s) => s.weeklyHistory);
  const perAppUsage = useAppStore((s) => s.perAppUsage);
  const customCategories = useAppStore((s) => s.customCategories);
  const setAppCategory = useAppStore((s) => s.setAppCategory);
  const setUsageStats = useAppStore((s) => s.setUsageStats);
  const setPerAppUsage = useAppStore((s) => s.setPerAppUsage);
  const [refreshing, setRefreshing] = useState(false);
  const [reassignApp, setReassignApp] = useState(null); // app to reassign
  const [showAllApps, setShowAllApps] = useState(false);

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
    const state = useAppStore.getState();
    runPrediction({
      usageStats: state.usageStats,
      questionnaire: state.questionnaire,
      userProfile: state.userProfile,
    }).then((result) => {
      if (result) useAppStore.getState().setPrediction(result);
    });
    setRefreshing(false);
  }, [setUsageStats, setPerAppUsage]);

  // Apply custom category overrides and group
  const appsWithOverrides = useMemo(() => {
    return perAppUsage.map((app) => ({
      ...app,
      category: customCategories[app.packageName] || app.category,
    }));
  }, [perAppUsage, customCategories]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const app of appsWithOverrides) {
      const cat = app.category || 'Other';
      if (!groups[cat]) groups[cat] = { apps: [], totalMs: 0 };
      groups[cat].apps.push(app);
      groups[cat].totalMs += app.usageMs;
    }
    for (const g of Object.values(groups)) {
      g.apps.sort((a, b) => b.usageMs - a.usageMs);
    }
    return Object.entries(groups)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalMs - a.totalMs);
  }, [appsWithOverrides]);

  // Flat list of all apps sorted by usage
  const allAppsSorted = useMemo(() => {
    return [...appsWithOverrides].sort((a, b) => b.usageMs - a.usageMs);
  }, [appsWithOverrides]);

  const maxCategoryMs = grouped.length > 0 ? grouped[0].totalMs : 0;
  const totalApps = perAppUsage.length;
  const totalMs = grouped.reduce((sum, g) => sum + g.totalMs, 0);

  const handleReassign = useCallback(
    (category) => {
      if (reassignApp) {
        setAppCategory(reassignApp.packageName, category);
        setReassignApp(null);
      }
    },
    [reassignApp, setAppCategory],
  );

  const handleAppLongPress = useCallback((app) => {
    setReassignApp(app);
  }, []);

  // Dynamic insights
  const insights = [];
  if (usage.screenTimeBeforeBed > 1) {
    insights.push({
      icon: 'moon-waning-crescent',
      text: `You used your phone for ${formatHours(usage.screenTimeBeforeBed)} between 10 PM and 6 AM. Late-night usage can affect sleep quality.`,
      color: Colors.riskModerate,
    });
  } else {
    insights.push({
      icon: 'moon-waning-crescent',
      text: 'Your late-night phone usage is low. Keep it up for better sleep quality!',
      color: Colors.riskLow,
    });
  }
  if (usage.phoneChecks > 50) {
    insights.push({
      icon: 'lock-open-outline',
      text: `You checked your phone ${usage.phoneChecks} times today. Try keeping it out of reach during focused activities.`,
      color: Colors.riskHigh,
    });
  } else if (usage.phoneChecks > 20) {
    insights.push({
      icon: 'lock-open-outline',
      text: `You checked your phone ${usage.phoneChecks} times today. That's moderate — setting specific check-in times can help.`,
      color: Colors.riskModerate,
    });
  } else {
    insights.push({
      icon: 'lock-open-outline',
      text: `Only ${usage.phoneChecks} phone checks today. Great self-control!`,
      color: Colors.riskLow,
    });
  }
  if (usage.socialMediaHours > usage.educationHours && usage.socialMediaHours > 0.5) {
    insights.push({
      icon: 'swap-horizontal-bold',
      text: `Social media (${formatHours(usage.socialMediaHours)}) outweighs education (${formatHours(usage.educationHours)}). Try swapping 30 min of scrolling for learning.`,
      color: Colors.info,
    });
  }
  if (usage.educationHours > 0.5) {
    insights.push({
      icon: 'school-outline',
      text: `You spent ${formatHours(usage.educationHours)} on educational apps. That's time well invested!`,
      color: Colors.riskLow,
    });
  }

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
        <Text variant="headlineSmall" style={styles.title}>Insights</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Based on today's usage · Pull down to refresh
        </Text>
      </View>

      {/* Weekly Risk Trend */}
      <SectionHeader icon="chart-timeline-variant" title="Weekly Risk Trend" />
      <Card style={styles.card}>
        <Card.Content>
          <WeeklyTrendChart weeklyHistory={weeklyHistory} />
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Colors.riskLow }]} />
            <Text variant="labelSmall" style={styles.legendText}>Low</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.riskModerate }]} />
            <Text variant="labelSmall" style={styles.legendText}>Moderate</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.riskHigh }]} />
            <Text variant="labelSmall" style={styles.legendText}>High</Text>
          </View>
        </Card.Content>
      </Card>

      {/* App Usage — Category Cards */}
      <SectionHeader icon="shape-outline" title="Categories" />
      <View style={styles.sourceRow}>
        <Icon name="information-outline" size={14} color={Colors.textSecondary} />
        <Text variant="labelSmall" style={styles.sourceText}>
          {totalApps} apps · Tap to expand · Tap app to reassign
        </Text>
      </View>

      {grouped.length > 0 ? (
        grouped.map((g) => (
          <CategoryCard
            key={g.category}
            category={g.category}
            apps={g.apps}
            totalMs={g.totalMs}
            onAppPress={handleAppLongPress}
          />
        ))
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.emptyState}>
              <Icon name="chart-bar" size={32} color={Colors.disabled} />
              <Text variant="bodySmall" style={styles.emptyText}>
                No app data yet. Pull down to refresh.
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {grouped.length > 0 && (
        <View style={styles.totalRow}>
          <Icon name="sigma" size={16} color={Colors.textPrimary} />
          <Text variant="bodyMedium" style={styles.totalLabel}>Total Screen Time</Text>
          <Text variant="titleMedium" style={styles.totalValue}>
            {formatDuration(totalMs) || formatHours(usage.dailyUsageHours)}
          </Text>
        </View>
      )}

      {/* All Apps — Flat list */}
      <SectionHeader icon="format-list-bulleted" title="All Apps" />
      <Card style={styles.card}>
        <Card.Content>
          {allAppsSorted.length > 0 ? (
            <>
              {(showAllApps ? allAppsSorted : allAppsSorted.slice(0, 10)).map((app, i) => {
                const meta = CATEGORY_META[app.category] || CATEGORY_META['Other'];
                return (
                  <TouchableOpacity
                    key={app.packageName}
                    style={styles.flatAppRow}
                    onPress={() => handleAppLongPress(app)}
                    activeOpacity={0.7}>
                    <Text variant="bodySmall" style={styles.flatRank}>{i + 1}</Text>
                    <View style={styles.flatAppInfo}>
                      <Text variant="bodyMedium" style={styles.flatAppName} numberOfLines={1}>
                        {app.appName}
                      </Text>
                      <View style={styles.flatCatBadge}>
                        <View style={[styles.flatCatDot, { backgroundColor: meta.color }]} />
                        <Text variant="labelSmall" style={styles.flatCatText}>
                          {app.category}
                        </Text>
                      </View>
                    </View>
                    <Text variant="bodyMedium" style={styles.flatAppTime}>
                      {formatDuration(app.usageMs)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {allAppsSorted.length > 10 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setShowAllApps(!showAllApps)}>
                  <Text variant="labelMedium" style={styles.showMoreText}>
                    {showAllApps
                      ? 'Show less'
                      : `Show all ${allAppsSorted.length} apps`}
                  </Text>
                  <Icon
                    name={showAllApps ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodySmall" style={styles.emptyText}>
                No app data yet. Pull down to refresh.
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Pattern Insights */}
      <SectionHeader icon="brain" title="Pattern Insights" />
      {insights.map((insight, i) => (
        <InsightCard key={i} icon={insight.icon} text={insight.text} color={insight.color} />
      ))}

      {insights.length === 0 && (
        <InsightCard
          icon="check-circle-outline"
          text="Not enough data yet. Use your phone normally and check back later."
          color={Colors.textSecondary}
        />
      )}

      <View style={styles.bottomSpacer} />

      {/* ── Category Reassignment Modal ── */}
      <Modal
        visible={!!reassignApp}
        transparent
        animationType="slide"
        onRequestClose={() => setReassignApp(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Move App to Category
              </Text>
              <TouchableOpacity onPress={() => setReassignApp(null)}>
                <Icon name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {reassignApp && (
              <Text variant="bodyMedium" style={styles.modalAppName}>
                {reassignApp.appName}
              </Text>
            )}

            <Text variant="bodySmall" style={styles.modalHint}>
              Choose a category for this app:
            </Text>

            {CATEGORY_LIST.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isCurrentCat = reassignApp?.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalCatRow, isCurrentCat && styles.modalCatRowActive]}
                  onPress={() => handleReassign(cat)}>
                  <View style={[styles.modalCatIcon, { backgroundColor: meta.color + '15' }]}>
                    <Icon name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <Text variant="bodyMedium" style={styles.modalCatLabel}>{cat}</Text>
                  {isCurrentCat && (
                    <Icon name="check" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  title: { fontWeight: '700', color: Colors.textPrimary },
  subtitle: { color: Colors.textSecondary, marginTop: 2 },
  card: {
    marginHorizontal: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.surface, elevation: 1, marginBottom: Spacing.sm,
  },

  // ── Weekly trend chart ──
  chartWrapper: { flexDirection: 'row', paddingTop: Spacing.sm },
  yAxis: {
    justifyContent: 'space-between', paddingBottom: 24,
    marginRight: Spacing.sm, alignItems: 'flex-end',
  },
  yLabel: { color: Colors.textSecondary, fontSize: 10 },
  barsContainer: { flex: 1, position: 'relative' },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.divider,
  },
  barsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'flex-end', height: BAR_MAX_HEIGHT,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barArea: {
    height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', alignItems: 'center', width: '100%',
  },
  vertBar: {
    width: 28, borderTopLeftRadius: 8, borderTopRightRadius: 8,
    minHeight: 10, alignItems: 'center',
  },
  vertBarToday: { borderWidth: 2, borderColor: Colors.primaryDark, borderBottomWidth: 0 },
  barDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.surface, borderWidth: 2,
    position: 'absolute', top: -4,
  },
  dayLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: Spacing.xs },
  dayLabelToday: { color: Colors.primary, fontWeight: '700' },
  legendRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: Colors.textSecondary, marginRight: Spacing.sm },

  // ── Category cards ──
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  sourceText: { color: Colors.textSecondary },
  catCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    elevation: 1,
  },
  catCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md,
  },
  catIconWrap: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  catCardInfo: { flex: 1 },
  catCardLabel: { fontWeight: '600', color: Colors.textPrimary },
  catCardCount: { color: Colors.textSecondary, fontSize: 11, marginTop: 1 },
  catCardTime: { fontWeight: '700', marginRight: Spacing.xs },
  catCardApps: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  catAppRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6,
  },
  catAppDot: { width: 6, height: 6, borderRadius: 3 },
  catAppName: { flex: 1, color: Colors.textPrimary, fontSize: 13 },
  catAppTime: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },

  // ── Flat all-apps list ──
  flatAppRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  flatRank: {
    width: 22, textAlign: 'center', color: Colors.textSecondary, fontWeight: '600', fontSize: 12,
  },
  flatAppInfo: { flex: 1 },
  flatAppName: { color: Colors.textPrimary, fontWeight: '500' },
  flatCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  flatCatDot: { width: 6, height: 6, borderRadius: 3 },
  flatCatText: { color: Colors.textSecondary, fontSize: 10 },
  flatAppTime: { fontWeight: '700', color: Colors.textPrimary, fontSize: 13 },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.md,
  },
  showMoreText: { color: Colors.primary, fontWeight: '600' },

  // ── Empty state ──
  emptyState: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary },

  // ── Total row ──
  totalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm,
  },
  totalLabel: { flex: 1, color: Colors.textPrimary, fontWeight: '600' },
  totalValue: { fontWeight: '700', color: Colors.primary },

  // ── Reassignment modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontWeight: '700', color: Colors.textPrimary },
  modalAppName: {
    color: Colors.primary, fontWeight: '600', marginTop: Spacing.sm, fontSize: 15,
  },
  modalHint: { color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md },
  modalCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm, marginBottom: 4,
  },
  modalCatRowActive: { backgroundColor: Colors.primaryLight + '15' },
  modalCatIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  modalCatLabel: { flex: 1, color: Colors.textPrimary, fontWeight: '500' },

  bottomSpacer: { height: Spacing.lg },
});
