import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { collectPerAppUsage, collectUsageStats } from '../services/usageCollector';
import { runPrediction } from '../services/predictionService';
import { useAppStore } from '../store/useAppStore';

/**
 * Monitors app foreground/background transitions.
 *
 * When the app comes to the foreground it:
 *   1. Collects real usage data from the Android UsageStatsModule
 *   2. Updates the Zustand store with fresh stats
 *   3. Runs an ML prediction via the FastAPI backend
 *   4. Refreshes the weekly history chart
 */
export const useAppLifecycle = () => {
  const appStateRef = useRef(AppState.currentState);
  const setUsageStats = useAppStore((s) => s.setUsageStats);

  const fetchAndUpdateUsage = useCallback(async () => {
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

    // Store per-app usage data
    if (apps.length > 0) {
      useAppStore.getState().setPerAppUsage(apps);
    }

    // Refresh weekly history from stored daily snapshots
    useAppStore.getState().refreshWeeklyHistory?.();

    // Run ML prediction in the background (non-blocking)
    const state = useAppStore.getState();
    runPrediction({
      usageStats: state.usageStats,
      questionnaire: state.questionnaire,
      userProfile: state.userProfile,
    }).then((result) => {
      if (result) {
        useAppStore.getState().setPrediction(result);
      }
    });
  }, [setUsageStats]);

  // Fetch usage data on mount (first app open)
  useEffect(() => {
    fetchAndUpdateUsage();
  }, [fetchAndUpdateUsage]);

  // Re-fetch when app returns to foreground
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
