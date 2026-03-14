import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { InsightCard } from '../components/InsightCard';
import { SectionHeader } from '../components/SectionHeader';
import { collectPerAppUsage, collectPerAppUsageForDate, collectUsageStats } from '../services/usageCollector';
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

// data = [{ day, riskLevel, dateKey, hours }]
const WeeklyTrendChart = ({ data, onDayPress }) => {
  const todayName = DAY_NAMES[new Date().getDay()];
  const maxHours = Math.max(...data.map((d) => d.hours ?? 0), 0.5);
  const topLabel = `${Math.ceil(maxHours)}h`;
  const midLabel = `${Math.round(maxHours / 2)}h`;

  return (
    <View style={styles.chartWrapper}>
      {/* Y-axis labels aligned to BAR_MAX_HEIGHT */}
      <View style={styles.yAxis}>
        <Text variant="labelSmall" style={styles.yLabel}>{topLabel}</Text>
        <Text variant="labelSmall" style={styles.yLabel}>{midLabel}</Text>
        <Text variant="labelSmall" style={styles.yLabel}>0h</Text>
      </View>
      <View style={styles.barsOuter}>
        {/* Grid lines overlay only the bar area (not labels below) */}
        <View style={styles.gridLayer} pointerEvents="none">
          <View style={[styles.gridLine, { top: Math.round(BAR_MAX_HEIGHT / 2) }]} />
        </View>
        {/* Bars row — no fixed height so labels don't overflow */}
        <View style={styles.barsRow}>
          {data.map((entry) => {
            const level = Math.min(Math.max(entry.riskLevel, 0), 2);
            const color = RISK_COLORS[level];
            const hours = entry.hours ?? 0;
            const heightPct = hours > 0 ? Math.max((hours / maxHours) * 100, 6) : 0;
            const isToday = entry.day === todayName;
            return (
              <TouchableOpacity
                key={entry.day}
                style={styles.barColumn}
                onPress={() => onDayPress?.(entry)}
                activeOpacity={0.7}>
                <View style={styles.barArea}>
                  {hours > 0 ? (
                    <View
                      style={[
                        styles.vertBar,
                        { height: `${heightPct}%`, backgroundColor: color },
                        isToday && styles.vertBarToday,
                      ]}>
                      <View style={[styles.barDot, { borderColor: color }]} />
                    </View>
                  ) : (
                    <View style={styles.vertBarEmpty} />
                  )}
                </View>
                <Text
                  variant="labelSmall"
                  style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {entry.day}
                </Text>
                {hours > 0 && (
                  <Text style={styles.barHourLabel}>
                    {hours >= 1 ? `${Math.floor(hours)}h` : `${Math.round(hours * 60)}m`}
                  </Text>
                )}
              </TouchableOpacity>
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
              <Icon name="swap-horizontal" size={14} color={Colors.textSecondary} />
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
  const dailyHistory = useAppStore((s) => s.dailyHistory);
  const perAppUsage = useAppStore((s) => s.perAppUsage);
  const customCategories = useAppStore((s) => s.customCategories);
  const setAppCategory = useAppStore((s) => s.setAppCategory);
  const excludedPackages = useAppStore((s) => s.excludedPackages);
  const toggleExcludePackage = useAppStore((s) => s.toggleExcludePackage);
  const setUsageStats = useAppStore((s) => s.setUsageStats);
  const setPerAppUsage = useAppStore((s) => s.setPerAppUsage);
  const [refreshing, setRefreshing] = useState(false);
  const [reassignApp, setReassignApp] = useState(null);
  const [showAllApps, setShowAllApps] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // { day, dateKey, riskLevel }
  const [showDayApps, setShowDayApps] = useState(false);
  const [dayApps, setDayApps] = useState([]); // per-app list for selected day
  const [dayAppsLoading, setDayAppsLoading] = useState(false);

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
      if (result) {
        useAppStore.getState().setPrediction(result);
        useAppStore.getState().refreshWeeklyHistory?.();
      }
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

  // Enrich weeklyHistory with actual hours from dailyHistory for the chart
  const weeklyDisplayData = useMemo(() => {
    return weeklyHistory.map((entry) => {
      const hist = dailyHistory[entry.dateKey];
      const hours = hist?.usage?.dailyUsageHours ?? 0;
      return { ...entry, hours };
    });
  }, [weeklyHistory, dailyHistory]);

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

  const handleExcludeToggle = useCallback((pkg, appName, isCurrentlyExcluded) => {
    if (isCurrentlyExcluded) {
      // Re-include without confirmation
      toggleExcludePackage(pkg);
    } else {
      Alert.alert(
        'Exclude from Prediction?',
        `"${appName}" usage will no longer count toward your addiction risk score. Your screen time display is not affected.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exclude', style: 'destructive', onPress: () => toggleExcludePackage(pkg) },
        ],
      );
    }
  }, [toggleExcludePackage]);

  const handleDayPress = useCallback((entry) => {
    setSelectedDay(entry);
    setDayApps([]);
    setDayAppsLoading(true);

    const today = new Date().toISOString().split('T')[0];
    const isToday = entry.dateKey === today;

    const dedup = (apps) => {
      const map = {};
      for (const app of apps) {
        if (map[app.packageName]) {
          map[app.packageName].usageMs += app.usageMs;
        } else {
          map[app.packageName] = { ...app };
        }
      }
      return Object.values(map).sort((a, b) => b.usageMs - a.usageMs);
    };

    if (isToday) {
      // Today: use already-loaded perAppUsage from store
      const apps = useAppStore.getState().perAppUsage;
      setDayApps(dedup(apps));
      setDayAppsLoading(false);
    } else {
      // Past day: fetch from native module (queryUsageStats — accurate)
      collectPerAppUsageForDate(entry.dateKey).then((apps) => {
        setDayApps(dedup(apps));
        setDayAppsLoading(false);
      });
    }
  }, []);

  const showExcludeInfo = useCallback(() => {
    Alert.alert(
      'Exclude from Prediction',
      'When an app is excluded, its usage time is removed from the data sent to the AI model. This lets you mark apps like work tools or fitness apps that should not influence your addiction risk score.\n\nYour screen time display is unaffected.',
      [{ text: 'Got it' }],
    );
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
      icon: 'scale-unbalanced',
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
          <WeeklyTrendChart data={weeklyDisplayData} onDayPress={handleDayPress} />
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
          <Icon name="clock-time-four-outline" size={16} color={Colors.textPrimary} />
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
                const isExcluded = excludedPackages.includes(app.packageName);
                return (
                  <TouchableOpacity
                    key={app.packageName}
                    style={[styles.flatAppRow, isExcluded && styles.flatAppRowExcluded]}
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
                        {isExcluded && (
                          <View style={styles.excludedBadge}>
                            <Icon name="eye-off-outline" size={10} color={Colors.textSecondary} />
                            <Text variant="labelSmall" style={styles.excludedBadgeText}>excluded</Text>
                          </View>
                        )}
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
      <SectionHeader icon="lightbulb-on-outline" title="Pattern Insights" />
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
              <TouchableOpacity onPress={() => setReassignApp(null)} hitSlop={12}>
                <Icon name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {reassignApp && (
              <Text variant="bodyMedium" style={styles.modalAppName}>
                {reassignApp.appName}
              </Text>
            )}

            {/* Exclude from prediction — native Switch */}
            {reassignApp && (() => {
              const isExcluded = excludedPackages.includes(reassignApp.packageName);
              return (
                <View style={[styles.excludeToggleRow, isExcluded && styles.excludeToggleRowActive]}>
                  <View style={styles.excludeToggleInfo}>
                    <Text variant="bodyMedium" style={[
                      styles.excludeToggleLabel,
                      isExcluded && { color: Colors.riskModerate },
                    ]}>
                      Exclude from prediction
                    </Text>
                    <Text variant="labelSmall" style={styles.excludeToggleHint}>
                      {isExcluded ? "App is hidden from risk analysis" : "App usage counts toward risk score"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={showExcludeInfo} hitSlop={12} style={{ marginRight: Spacing.sm }}>
                    <Icon name="information-outline" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <Switch
                    value={isExcluded}
                    onValueChange={() => handleExcludeToggle(reassignApp.packageName, reassignApp.appName, isExcluded)}
                    thumbColor={isExcluded ? Colors.riskModerate : Colors.surface}
                    trackColor={{ false: Colors.divider, true: Colors.riskModerate + '60' }}
                  />
                </View>
              );
            })()}

            <Text variant="bodySmall" style={styles.modalHint}>
              Choose a category for this app:
            </Text>

            <ScrollView style={styles.modalCatList} showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* ── Day Detail — Full Screen Modal ── */}
      <Modal
        visible={!!selectedDay}
        transparent={false}
        animationType="slide"
        onRequestClose={() => { setSelectedDay(null); setShowDayApps(false); setDayApps([]); }}>
        {selectedDay && (() => {
          const hist = dailyHistory[selectedDay.dateKey];
          const u = hist?.usage;
          const p = hist?.prediction;
          const RISK_COLORS_MAP = [Colors.riskLow, Colors.riskModerate, Colors.riskHigh];
          const RISK_LABELS_MAP = ['Low Risk', 'Moderate Risk', 'High Risk'];
          const riskLevel = Math.min(Math.max(selectedDay.riskLevel, 0), 2);
          const riskColor = RISK_COLORS_MAP[riskLevel];
          const dayDate = new Date(selectedDay.dateKey + 'T12:00:00');
          const dateStr = dayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

          // Map stored usage keys (backfill stores raw Java keys, today uses store keys)
          const screenTime   = u?.dailyUsageHours   ?? 0;
          const socialMedia  = u?.socialMediaHours  ?? u?.timeOnSocialMedia  ?? 0;
          const gaming       = u?.gamingHours        ?? u?.timeOnGaming       ?? 0;
          const education    = u?.educationHours     ?? u?.timeOnEducation    ?? 0;
          const nightUse     = u?.screenTimeBeforeBed ?? 0;
          const phoneChecks  = u?.phoneChecks        ?? u?.phoneChecksPerDay  ?? null;
          const appsUsed     = u?.appsUsed           ?? u?.appsUsedDaily      ?? null;

          return (
            <ScrollView style={styles.dayScreen} contentContainerStyle={styles.dayScreenContent}>
              {/* Header */}
              <View style={styles.dayScreenHeader}>
                <TouchableOpacity onPress={() => { setSelectedDay(null); setShowDayApps(false); setDayApps([]); }} style={styles.dayBackBtn} hitSlop={12}>
                  <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.dayScreenTitles}>
                  <Text variant="headlineSmall" style={styles.dayScreenTitle}>{selectedDay.day}</Text>
                  <Text variant="bodySmall" style={styles.dayScreenDate}>{dateStr}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedDay(null); setShowDayApps(false); setDayApps([]); }} style={styles.dayCloseBtn} hitSlop={12}>
                  <Icon name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Risk prediction card */}
              <Card style={[styles.dayRiskCard, { borderLeftColor: riskColor, borderLeftWidth: 4 }]}>
                <Card.Content style={styles.dayRiskCardContent}>
                  <View style={[styles.dayRiskIconWrap, { backgroundColor: riskColor + '18' }]}>
                    <Icon name="shield-account-outline" size={28} color={riskColor} />
                  </View>
                  <View style={styles.dayRiskInfo}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Addiction Risk</Text>
                    <Text variant="titleMedium" style={[styles.dayRiskTitle, { color: riskColor }]}>
                      {p?.label ?? RISK_LABELS_MAP[riskLevel]}
                    </Text>
                    {p?.confidence != null && (
                      <Text variant="labelSmall" style={{ color: Colors.textSecondary }}>
                        {Math.round(p.confidence * 100)}% model confidence
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>

              {/* Stats grid — 2 columns like HomeScreen */}
              <SectionHeader icon="chart-box-outline" title="Usage Summary" />

              {u ? (
                <>
                  <View style={styles.dayStatsRow}>
                    {[
                      { icon: 'cellphone-clock', color: Colors.primary,         value: formatHours(screenTime), label: 'Screen Time', tappable: true },
                      phoneChecks !== null && { icon: 'lock-open-outline', color: Colors.categorySocial,   value: phoneChecks,             label: 'Phone Checks', tappable: false },
                      appsUsed    !== null && { icon: 'apps',              color: Colors.categoryEducation, value: appsUsed,                label: 'Apps Used',    tappable: true },
                    ].filter(Boolean).map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.dayStatCard, item.tappable && styles.dayStatCardTappable]}
                        onPress={item.tappable ? () => setShowDayApps(true) : undefined}
                        activeOpacity={item.tappable ? 0.7 : 1}>
                        <View style={styles.dayStatCardContent}>
                          <Icon name={item.icon} size={20} color={item.color} />
                          <Text style={styles.dayStatNum}>{item.value}</Text>
                          <Text style={styles.dayStatCardLabel}>{item.label}</Text>
                          {item.tappable && (
                            <Icon name="chevron-right" size={12} color={Colors.textSecondary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <SectionHeader icon="shape-outline" title="By Category" />
                  <Card style={[styles.card, { marginBottom: Spacing.sm }]}>
                    <Card.Content>
                      {[
                        { label: 'Social Media', value: socialMedia,  icon: 'account-group-outline',   color: Colors.categorySocial },
                        { label: 'Gaming',        value: gaming,       icon: 'gamepad-variant-outline', color: Colors.categoryGaming },
                        { label: 'Education',     value: education,    icon: 'school-outline',           color: Colors.categoryEducation },
                        { label: 'Late Night Use',value: nightUse,     icon: 'moon-waning-crescent',    color: Colors.riskModerate },
                      ].map((item) => (
                        <View key={item.label} style={styles.dayCatRow}>
                          <View style={[styles.dayCatIcon, { backgroundColor: item.color + '18' }]}>
                            <Icon name={item.icon} size={16} color={item.color} />
                          </View>
                          <Text variant="bodyMedium" style={styles.dayCatLabel}>{item.label}</Text>
                          <Text variant="bodyMedium" style={[styles.dayCatValue, { color: item.color }]}>
                            {formatHours(item.value)}
                          </Text>
                        </View>
                      ))}
                    </Card.Content>
                  </Card>
                </>
              ) : (
                <Card style={[styles.card, { marginTop: Spacing.md }]}>
                  <Card.Content style={styles.emptyState}>
                    <Icon name="calendar-remove-outline" size={40} color={Colors.disabled} />
                    <Text variant="bodyMedium" style={styles.emptyText}>
                      No data available for this day.{'\n'}Open the app daily to build your history.
                    </Text>
                  </Card.Content>
                </Card>
              )}

              <View style={styles.bottomSpacer} />

              {/* ── Per-app breakdown modal (tap Screen Time or Apps Used) ── */}
              <Modal
                visible={showDayApps}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDayApps(false)}>
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { paddingBottom: Spacing.xxl }]}>
                    <View style={styles.modalHeader}>
                      <Text variant="titleMedium" style={styles.modalTitle}>
                        Apps Used · {selectedDay?.day}
                      </Text>
                      <TouchableOpacity onPress={() => setShowDayApps(false)} hitSlop={12}>
                        <Icon name="close" size={24} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {dayAppsLoading ? (
                      <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text variant="bodySmall" style={styles.emptyText}>Loading apps…</Text>
                      </View>
                    ) : dayApps.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Icon name="apps" size={32} color={Colors.disabled} />
                        <Text variant="bodySmall" style={styles.emptyText}>
                          No app data available for this day.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.modalCatList} showsVerticalScrollIndicator={false}>
                        {dayApps.map((app, i) => {
                          const meta = CATEGORY_META[customCategories[app.packageName] || app.category] || CATEGORY_META['Other'];
                          return (
                            <View key={app.packageName} style={styles.dayAppRow}>
                              <Text style={styles.flatRank}>{i + 1}</Text>
                              <View style={[styles.dayAppIconWrap, { backgroundColor: meta.color + '18' }]}>
                                <Icon name={meta.icon} size={16} color={meta.color} />
                              </View>
                              <View style={styles.flatAppInfo}>
                                <Text variant="bodyMedium" style={styles.flatAppName} numberOfLines={1}>
                                  {app.appName}
                                </Text>
                                <Text variant="labelSmall" style={styles.flatCatText}>{app.category}</Text>
                              </View>
                              <Text variant="bodyMedium" style={styles.flatAppTime}>
                                {formatDuration(app.usageMs)}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                </View>
              </Modal>
            </ScrollView>
          );
        })()}
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
  chartWrapper: { flexDirection: 'row', paddingTop: Spacing.sm, alignItems: 'flex-start' },
  yAxis: {
    height: BAR_MAX_HEIGHT, justifyContent: 'space-between',
    marginRight: Spacing.sm, alignItems: 'flex-end',
  },
  yLabel: { color: Colors.textSecondary, fontSize: 10 },
  // Outer area — bar columns + grid lines overlay
  barsOuter: { flex: 1, position: 'relative' },
  // Grid lines only cover the bar area height, positioned absolutely
  gridLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: BAR_MAX_HEIGHT,
  },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.divider,
  },
  // Rows grow naturally — no fixed height, so labels don't overflow
  barsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start',
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
  flatAppRowExcluded: { opacity: 0.5 },
  flatCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  flatCatDot: { width: 6, height: 6, borderRadius: 3 },
  flatCatText: { color: Colors.textSecondary, fontSize: 10 },
  excludedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.divider, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1, marginLeft: 4,
  },
  excludedBadgeText: { color: Colors.textSecondary, fontSize: 9 },
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
    maxHeight: '85%',
  },
  modalCatList: { maxHeight: 280 },
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

  // ── Exclude toggle ──
  excludeToggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.divider,
    marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  excludeToggleRowActive: { borderColor: Colors.riskModerate, backgroundColor: Colors.riskModerate + '10' },
  excludeToggleInfo: { flex: 1 },
  excludeToggleLabel: { fontWeight: '600', color: Colors.textPrimary },
  excludeToggleHint: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },

  // ── Chart extras ──
  vertBarEmpty: {
    width: 28, height: 4, borderRadius: 2, backgroundColor: Colors.divider,
  },
  barHourLabel: {
    fontSize: 9, color: Colors.textSecondary, textAlign: 'center', marginTop: 2,
  },

  // ── Day detail full-screen ──
  dayScreen: { flex: 1, backgroundColor: Colors.background },
  dayScreenContent: { paddingBottom: Spacing.xxl },
  dayScreenHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  dayBackBtn: { padding: 4, marginRight: Spacing.sm },
  dayCloseBtn: { padding: 4 },
  dayScreenTitles: { flex: 1 },
  dayScreenTitle: { fontWeight: '700', color: Colors.textPrimary },
  dayScreenDate: { color: Colors.textSecondary, marginTop: 2 },
  dayRiskCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: Colors.surface, elevation: 2,
  },
  dayRiskCardContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dayRiskIconWrap: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
  },
  dayRiskInfo: { flex: 1 },
  dayRiskTitle: { fontWeight: '700', fontSize: 18 },
  // Responsive: cards fill width evenly, min width prevents overflow on narrow screens
  dayStatsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  dayStatCard: {
    flex: 1, minWidth: (SCREEN_WIDTH - 56) / 3,
    borderRadius: Radius.md, backgroundColor: Colors.surface, elevation: 1,
  },
  dayStatCardTappable: { borderWidth: 1, borderColor: Colors.primary + '40' },
  dayStatCardContent: { alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: 4, gap: 4 },
  dayStatNum: { fontWeight: '800', color: Colors.textPrimary, fontSize: 18 },
  dayStatCardLabel: { color: Colors.textSecondary, textAlign: 'center', fontSize: 10 },
  dayAppRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  dayAppIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  dayCatIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCatLabel: { flex: 1, color: Colors.textPrimary },
  dayCatValue: { fontWeight: '700' },

  bottomSpacer: { height: Spacing.lg },
});
