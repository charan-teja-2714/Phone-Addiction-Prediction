import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const defaultUsage = {
  dailyUsageHours: 0,
  phoneChecks: 0,
  screenTimeBeforeBed: 0,
  weekendUsage: 0,
  socialMediaHours: 0,
  gamingHours: 0,
  educationHours: 0,
  appsUsed: 0,
  sleepHours: 0,
  exerciseHours: 0,
};

const defaultUserProfile = {
  age: 20,
  gender: 'Other',
  sleepHours: 7,
  exerciseHours: 1,
};

const defaultQuestionnaire = {
  anxietyLevel: null,
  depressionLevel: null,
  selfEsteem: null,
  academicPerformance: null,
  familyCommunication: null,
  socialInteractions: null,
  parentalControl: null,
};

const computeCompleteness = (q) => {
  const fields = Object.values(q);
  const filled = fields.filter((v) => v !== null).length;
  return filled / fields.length;
};

/** Returns today's date as YYYY-MM-DD. */
const getTodayKey = () => new Date().toISOString().split('T')[0];

/** Prune history entries older than 30 days. */
const pruneHistory = (history) => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pruned = {};
  for (const [key, entry] of Object.entries(history)) {
    if (entry.timestamp >= cutoff) {
      pruned[key] = entry;
    }
  }
  return pruned;
};

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Usage stats (today) ──
      usageStats: defaultUsage,
      usageStatsDate: null, // YYYY-MM-DD of when usageStats was last set
      setUsageStats: (stats) => {
        set((state) => {
          const updatedUsage = { ...state.usageStats, ...stats };
          const today = getTodayKey();
          // Save today's snapshot in history
          const history = { ...state.dailyHistory };
          history[today] = {
            usage: updatedUsage,
            prediction: state.prediction,
            timestamp: Date.now(),
          };
          return {
            usageStats: updatedUsage,
            usageStatsDate: today,
            dailyHistory: pruneHistory(history),
          };
        });
      },

      // ── Per-app usage (today, from native module) ──
      perAppUsage: [],
      setPerAppUsage: (apps) => set({ perAppUsage: apps }),

      // ── Custom category overrides (user-assigned) ──
      // Format: { "com.example.app": "Entertainment", ... }
      customCategories: {},
      setAppCategory: (packageName, category) =>
        set((state) => ({
          customCategories: { ...state.customCategories, [packageName]: category },
        })),

      // ── User profile (age, gender, lifestyle) ──
      userProfile: defaultUserProfile,
      setUserProfile: (fields) =>
        set((state) => ({ userProfile: { ...state.userProfile, ...fields } })),

      // ── ML prediction ──
      prediction: null,
      setPrediction: (result) => {
        set((state) => {
          const today = getTodayKey();
          const history = { ...state.dailyHistory };
          if (history[today]) {
            history[today] = { ...history[today], prediction: result };
          } else {
            history[today] = {
              usage: state.usageStats,
              prediction: result,
              timestamp: Date.now(),
            };
          }
          return { prediction: result, dailyHistory: history };
        });
      },

      // ── Questionnaire ──
      questionnaire: defaultQuestionnaire,
      setQuestionnaireField: (field, value) =>
        set((state) => {
          const updated = { ...state.questionnaire, [field]: value };
          return {
            questionnaire: updated,
            dataCompleteness: computeCompleteness(updated),
          };
        }),

      // ── 30-day history (persisted) ──
      // Format: { "2026-02-11": { usage: {...}, prediction: {...}, timestamp: number } }
      dailyHistory: {},

      // ── Weekly history (derived from dailyHistory) ──
      weeklyHistory: [
        { day: 'Mon', riskLevel: 0 },
        { day: 'Tue', riskLevel: 0 },
        { day: 'Wed', riskLevel: 0 },
        { day: 'Thu', riskLevel: 0 },
        { day: 'Fri', riskLevel: 0 },
        { day: 'Sat', riskLevel: 0 },
        { day: 'Sun', riskLevel: 0 },
      ],
      setWeeklyHistory: (entries) => set({ weeklyHistory: entries }),

      /** Rebuild weeklyHistory from the last 7 days of dailyHistory. */
      refreshWeeklyHistory: () => {
        const state = get();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekly = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          const dayName = dayNames[d.getDay()];
          const entry = state.dailyHistory[key];
          let riskLevel = 0;
          if (entry?.prediction?.label) {
            if (entry.prediction.label.includes('High')) riskLevel = 2;
            else if (entry.prediction.label.includes('Moderate')) riskLevel = 1;
          }
          weekly.push({ day: dayName, riskLevel });
        }
        set({ weeklyHistory: weekly });
      },

      // ── Daily goal (persisted) ──
      dailyGoalHours: 3,
      setDailyGoalHours: (hours) => set({ dailyGoalHours: hours }),

      // ── Data completeness ──
      dataCompleteness: 0,
    }),
    {
      name: 'digital-wellbeing-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dailyHistory: state.dailyHistory,
        questionnaire: state.questionnaire,
        dataCompleteness: state.dataCompleteness,
        dailyGoalHours: state.dailyGoalHours,
        weeklyHistory: state.weeklyHistory,
        prediction: state.prediction,
        usageStats: state.usageStats,
        usageStatsDate: state.usageStatsDate,
        userProfile: state.userProfile,
        customCategories: state.customCategories,
      }),
      // Reset today's usage stats when rehydrating stale data from a previous day
      onRehydrateStorage: () => (state) => {
        if (state && state.usageStatsDate !== getTodayKey()) {
          // Data is from a previous day — reset to zeros so we don't show stale numbers
          useAppStore.setState({
            usageStats: defaultUsage,
            usageStatsDate: null,
            prediction: null,
          });
        }
      },
    },
  ),
);
