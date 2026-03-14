/**
 * usageCollector.js — JS bridge to the Android UsageStatsModule native module.
 *
 * Provides a safe, normalized interface for collecting smartphone usage data.
 * All values are numeric and >= 0, ready for the ML featureBuilder.
 *
 * Privacy: Only aggregate category totals are returned.
 * No individual app names, message content, or personal data is exposed.
 */

import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule } = NativeModules;

/**
 * Default usage data returned when collection is unavailable
 * (e.g. iOS, missing permission, or error).
 * All zeros — safe to pass into ML featureBuilder.
 */
const DEFAULT_USAGE = {
  dailyUsageHours: 0,
  phoneChecksPerDay: 0,
  appsUsedDaily: 0,
  timeOnSocialMedia: 0,
  timeOnGaming: 0,
  timeOnEducation: 0,
  screenTimeBeforeBed: 0,
  weekendUsageHours: 0,
};

/**
 * Checks if the app has Usage Access permission.
 *
 * @returns {Promise<boolean>} true if permission is granted, false otherwise.
 *   Returns false on iOS or if the native module is unavailable.
 */
export async function hasUsagePermission() {
  if (Platform.OS !== 'android' || !UsageStatsModule) {
    return false;
  }

  try {
    return await UsageStatsModule.hasPermission();
  } catch {
    return false;
  }
}

/**
 * Opens the Android system settings screen where the user can
 * grant Usage Access permission to this app.
 *
 * @returns {Promise<boolean>} true if the settings screen was opened,
 *   false if it failed or is not on Android.
 */
export async function openUsageAccessSettings() {
  if (Platform.OS !== 'android' || !UsageStatsModule) {
    return false;
  }

  try {
    return await UsageStatsModule.openUsageAccessSettings();
  } catch {
    return false;
  }
}

/**
 * Collects smartphone usage data for today (since midnight).
 *
 * Returns a normalized object with numeric values, safe to pass
 * directly into the ML featureBuilder / prediction pipeline.
 *
 * Handles all error cases gracefully:
 *   - iOS → returns DEFAULT_USAGE
 *   - Native module missing → returns DEFAULT_USAGE
 *   - Permission denied → returns { ...DEFAULT_USAGE, permissionDenied: true }
 *   - Native error → returns DEFAULT_USAGE
 *
 * Never throws an uncaught error.
 *
 * @returns {Promise<{
 *   dailyUsageHours: number,
 *   phoneChecksPerDay: number,
 *   appsUsedDaily: number,
 *   timeOnSocialMedia: number,
 *   timeOnGaming: number,
 *   timeOnEducation: number,
 *   screenTimeBeforeBed: number,
 *   weekendUsageHours: number,
 *   permissionDenied?: boolean
 * }>}
 */
export async function collectUsageStats() {
  // Guard: only available on Android
  if (Platform.OS !== 'android' || !UsageStatsModule) {
    return { ...DEFAULT_USAGE };
  }

  try {
    const result = await UsageStatsModule.collectUsageStats();

    // The native module returns an error object (not a rejection)
    // when permission is denied, so the JS side can handle it gracefully.
    if (result && result.error === 'PERMISSION_DENIED') {
      return { ...DEFAULT_USAGE, permissionDenied: true };
    }

    // Normalize: ensure every field is a non-negative number
    return {
      dailyUsageHours:     ensureNumber(result.dailyUsageHours),
      phoneChecksPerDay:   ensureNumber(result.phoneChecksPerDay),
      appsUsedDaily:       ensureNumber(result.appsUsedDaily),
      timeOnSocialMedia:   ensureNumber(result.timeOnSocialMedia),
      timeOnGaming:        ensureNumber(result.timeOnGaming),
      timeOnEducation:     ensureNumber(result.timeOnEducation),
      screenTimeBeforeBed: ensureNumber(result.screenTimeBeforeBed),
      weekendUsageHours:   ensureNumber(result.weekendUsageHours),
    };
  } catch {
    // Native module threw — return safe defaults
    return { ...DEFAULT_USAGE };
  }
}

/**
 * Collects per-app usage data for today (since midnight).
 *
 * Returns an array of app objects grouped by category:
 *   [{ packageName, appName, usageMs, category }]
 *
 * Returns empty array on iOS, missing permission, or error.
 *
 * @returns {Promise<Array<{ packageName: string, appName: string, usageMs: number, category: string }>>}
 */
export async function collectPerAppUsage() {
  if (Platform.OS !== 'android' || !UsageStatsModule) {
    return [];
  }

  try {
    const result = await UsageStatsModule.getPerAppUsage();

    // Permission denied returns an object with error field
    if (result && result.error === 'PERMISSION_DENIED') {
      return [];
    }

    // Result is a WritableArray from native — convert to JS array
    if (!Array.isArray(result)) {
      return [];
    }

    return result
      .filter((app) => app && app.usageMs > 0)
      .sort((a, b) => b.usageMs - a.usageMs);
  } catch {
    return [];
  }
}

/**
 * Collects per-day usage stats for the past 7 days from the native module.
 *
 * Returns an array of 7 objects (oldest → newest), each with the same
 * numeric fields as collectUsageStats() plus a `dateKey` ("YYYY-MM-DD").
 *
 * Returns [] on iOS, missing permission, or error.
 *
 * @returns {Promise<Array<{ dateKey: string, dailyUsageHours: number, ... }>>}
 */
export async function collectWeeklyStats() {
  if (Platform.OS !== 'android' || !UsageStatsModule) return [];

  try {
    const result = await UsageStatsModule.getWeeklyStats();

    if (result && result.error === 'PERMISSION_DENIED') return [];
    if (!Array.isArray(result)) return [];

    return result.map((day) => ({
      dateKey:             day.dateKey,
      dailyUsageHours:     ensureNumber(day.dailyUsageHours),
      phoneChecksPerDay:   ensureNumber(day.phoneChecksPerDay),
      appsUsedDaily:       ensureNumber(day.appsUsedDaily),
      timeOnSocialMedia:   ensureNumber(day.timeOnSocialMedia),
      timeOnGaming:        ensureNumber(day.timeOnGaming),
      timeOnEducation:     ensureNumber(day.timeOnEducation),
      screenTimeBeforeBed: ensureNumber(day.screenTimeBeforeBed),
      weekendUsageHours:   ensureNumber(day.weekendUsageHours),
    }));
  } catch {
    return [];
  }
}

/**
 * Collects per-app usage for a specific past date (YYYY-MM-DD).
 *
 * Uses queryUsageStats(INTERVAL_DAILY) under the hood — accurate for past days,
 * not affected by reboot inflation. Returns [] on error or missing permission.
 *
 * @param {string} dateKey — e.g. "2026-03-12"
 * @returns {Promise<Array<{ packageName, appName, usageMs, category }>>}
 */
export async function collectPerAppUsageForDate(dateKey) {
  if (Platform.OS !== 'android' || !UsageStatsModule) return [];

  try {
    const result = await UsageStatsModule.getPerAppUsageForDate(dateKey);

    if (result && result.error === 'PERMISSION_DENIED') return [];
    if (!Array.isArray(result)) return [];

    return result
      .filter((app) => app && app.usageMs > 0)
      .sort((a, b) => b.usageMs - a.usageMs);
  } catch {
    return [];
  }
}

/**
 * Recomputes prediction-relevant aggregate stats from per-app usage,
 * excluding any apps the user has marked as "exclude from prediction".
 *
 * Only affects: dailyUsageHours, appsUsedDaily, timeOnSocialMedia,
 * timeOnGaming, timeOnEducation. Other metrics (phoneChecks,
 * screenTimeBeforeBed, weekendUsage) are taken from the raw stats as-is.
 *
 * @param {object} rawStats        — Full stats from collectUsageStats()
 * @param {Array}  apps            — Per-app list from collectPerAppUsage()
 * @param {Array}  excludedPkgs    — Package names to exclude (from store)
 * @returns {object}               — Adjusted stats safe to send to prediction API
 */
export function computePredictionStats(rawStats, apps, excludedPkgs) {
  if (!excludedPkgs || excludedPkgs.length === 0) return rawStats;

  const excluded = new Set(excludedPkgs);
  const filtered = apps.filter((a) => !excluded.has(a.packageName));

  let totalMs = 0, socialMs = 0, gamingMs = 0, eduMs = 0;
  const pkgs = new Set();

  for (const app of filtered) {
    totalMs  += app.usageMs;
    pkgs.add(app.packageName);
    if (app.category === 'Social Media') socialMs += app.usageMs;
    else if (app.category === 'Gaming')  gamingMs += app.usageMs;
    else if (app.category === 'Education') eduMs  += app.usageMs;
  }

  const msToH = (ms) => Math.round(ms / 360_000) / 10;

  return {
    ...rawStats,
    dailyUsageHours:   msToH(totalMs),
    appsUsedDaily:     pkgs.size,
    timeOnSocialMedia: msToH(socialMs),
    timeOnGaming:      msToH(gamingMs),
    timeOnEducation:   msToH(eduMs),
  };
}

/**
 * Ensures a value is a non-negative number.
 * Converts NaN, null, undefined, and negative values to 0.
 */
function ensureNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
