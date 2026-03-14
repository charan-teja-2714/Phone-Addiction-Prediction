import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  collectPerAppUsage,
  collectUsageStats,
  collectWeeklyStats,
  computePredictionStats,
} from '../services/usageCollector';
import { runPrediction } from '../services/predictionService';
import {
  notifyPredictionResult,
  notifyScreenTimeMilestone,
  requestNotificationPermission,
  scheduleDailySummary,
} from '../services/notificationService';
import { useAppStore } from '../store/useAppStore';

/**
 * Monitors app foreground/background transitions.
 *
 * On each foreground event it:
 *   1. Collects real usage data from the Android UsageStatsModule
 *   2. Updates the Zustand store with fresh stats
 *   3. Runs an ML prediction (using exclusion-adjusted stats if needed)
 *   4. Refreshes the weekly history chart
 *
 * On first mount (once per install):
 *   5. Backfills the past 7 days into dailyHistory so the weekly chart
 *      is populated immediately after permission is granted.
 */
export const useAppLifecycle = () => {
  const appStateRef = useRef(AppState.currentState);
  // Session-only flag: backfill runs once per app session (not persisted)
  const backfillRanRef = useRef(false);
  const setUsageStats = useAppStore((s) => s.setUsageStats);

  // ── Today's usage + prediction ──────────────────────────────
  const fetchAndUpdateUsage = useCallback(async () => {
    const [stats, apps] = await Promise.all([
      collectUsageStats(),
      collectPerAppUsage(),
    ]);

    if (!stats.permissionDenied) {
      setUsageStats({
        dailyUsageHours:     stats.dailyUsageHours,
        phoneChecks:         stats.phoneChecksPerDay,
        screenTimeBeforeBed: stats.screenTimeBeforeBed,
        weekendUsage:        stats.weekendUsageHours,
        socialMediaHours:    stats.timeOnSocialMedia,
        gamingHours:         stats.timeOnGaming,
        educationHours:      stats.timeOnEducation,
        appsUsed:            stats.appsUsedDaily,
      });
    }

    if (apps.length > 0) {
      useAppStore.getState().setPerAppUsage(apps);
      // Also persist today's per-app list into dailyHistory so day-detail can show it
      const todayKey = new Date().toISOString().split('T')[0];
      useAppStore.setState((s) => ({
        dailyHistory: {
          ...s.dailyHistory,
          [todayKey]: {
            ...(s.dailyHistory[todayKey] || {}),
            apps,
          },
        },
      }));
    }

    useAppStore.getState().refreshWeeklyHistory?.();

    // Build prediction-adjusted stats (exclude user-selected apps)
    const state = useAppStore.getState();
    const excluded = state.excludedPackages || [];
    const predictionUsage = computePredictionStats(state.usageStats, apps, excluded);

    runPrediction({
      usageStats:    predictionUsage,
      questionnaire: state.questionnaire,
      userProfile:   state.userProfile,
    }).then((result) => {
      if (result) {
        useAppStore.getState().setPrediction(result);
        useAppStore.getState().refreshWeeklyHistory?.();
        notifyPredictionResult(
          result.label,
          result.confidence,
          useAppStore.getState().usageStats,
        );
      }
    });

    // Screen time milestone alerts (3h, 5h, 7h)
    const currentStats = useAppStore.getState().usageStats;
    const hours = currentStats.dailyUsageHours;
    const milestonesHit = useAppStore.getState().milestonesHit || {};
    for (const threshold of [3, 5, 7]) {
      if (hours >= threshold && !milestonesHit[threshold]) {
        notifyScreenTimeMilestone(threshold);
        useAppStore.setState({
          milestonesHit: { ...milestonesHit, [threshold]: true },
        });
        break;
      }
    }
  }, [setUsageStats]);

  // ── Weekly backfill (runs once per session) ─────────────────
  // Always refreshes usage data from native module (fixes stale cached data).
  // Only calls the prediction API for days that don't already have a prediction.
  const backfillWeeklyHistory = useCallback(async () => {
    // Session guard: prevents re-running if app backgrounds/foregrounds
    if (backfillRanRef.current) return;
    backfillRanRef.current = true;

    const weeklyStats = await collectWeeklyStats();
    if (!weeklyStats || weeklyStats.length === 0) return;

    const today = new Date().toISOString().split('T')[0];

    for (const day of weeklyStats) {
      const { dateKey, ...dayStats } = day;

      // Skip today — handled by fetchAndUpdateUsage
      if (dateKey === today) continue;

      // Skip days with no meaningful usage (all zeros)
      if (dayStats.dailyUsageHours === 0) continue;

      // Always overwrite usage data with fresh native stats (clears stale inflated data)
      useAppStore.setState((s) => ({
        dailyHistory: {
          ...s.dailyHistory,
          [dateKey]: {
            ...(s.dailyHistory[dateKey] || {}),
            usage: dayStats,
            timestamp: s.dailyHistory[dateKey]?.timestamp || new Date(dateKey).getTime(),
          },
        },
      }));

      // Only run prediction API if this day has no prediction yet
      const existing = useAppStore.getState().dailyHistory[dateKey];
      if (existing?.prediction) continue;

      try {
        const storeState = useAppStore.getState();
        const result = await runPrediction({
          usageStats: {
            dailyUsageHours:     dayStats.dailyUsageHours,
            phoneChecks:         dayStats.phoneChecksPerDay,
            screenTimeBeforeBed: dayStats.screenTimeBeforeBed,
            weekendUsage:        dayStats.weekendUsageHours,
            socialMediaHours:    dayStats.timeOnSocialMedia,
            gamingHours:         dayStats.timeOnGaming,
            educationHours:      dayStats.timeOnEducation,
            appsUsed:            dayStats.appsUsedDaily,
            sleepHours:          storeState.userProfile.sleepHours,
            exerciseHours:       storeState.userProfile.exerciseHours,
          },
          questionnaire: storeState.questionnaire,
          userProfile:   storeState.userProfile,
        });

        if (result) {
          useAppStore.setState((s) => ({
            dailyHistory: {
              ...s.dailyHistory,
              [dateKey]: {
                ...s.dailyHistory[dateKey],
                prediction: result,
              },
            },
          }));
        }
      } catch {
        // Non-fatal — skip this day silently
      }
    }

    useAppStore.getState().refreshWeeklyHistory?.();
  }, []);

  // ── First mount ─────────────────────────────────────────────
  useEffect(() => {
    requestNotificationPermission().then((granted) => {
      if (granted) scheduleDailySummary(21);
    });
    useAppStore.setState({ milestonesHit: {} });

    fetchAndUpdateUsage().then(() => {
      // After today's data is loaded, run backfill for past days
      backfillWeeklyHistory();
    });
  }, [fetchAndUpdateUsage, backfillWeeklyHistory]);

  // ── Re-fetch when app returns to foreground ─────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState.match(/inactive|background/) && nextState === 'active') {
        fetchAndUpdateUsage();
      }
    });

    return () => subscription.remove();
  }, [fetchAndUpdateUsage]);
};
