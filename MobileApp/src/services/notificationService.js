import notifee, {
  AndroidImportance,
  AndroidStyle,
  TriggerType,
} from '@notifee/react-native';

/**
 * NotificationService — local push notifications for addiction risk alerts.
 *
 * Uses @notifee/react-native (no FCM server needed — fully local).
 *
 * Features:
 *  1. Immediate risk alert when prediction returns High/Moderate
 *  2. Daily evening summary at a configurable time (default 9 PM)
 *  3. Screen time milestone alerts (e.g., exceeded 5h)
 *
 * Android channels:
 *  - wellbeing-alerts  : High importance, vibration ON  (risk notifications)
 *  - wellbeing-summary : Default importance              (daily summary)
 */

// ── Channel IDs ──────────────────────────────────────────────────────────────
const CHANNEL_ALERTS = 'wellbeing-alerts';
const CHANNEL_SUMMARY = 'wellbeing-summary';

// ── One-time setup: create notification channels ──────────────────────────────
let channelsCreated = false;

async function ensureChannels() {
  if (channelsCreated) return;
  await notifee.createChannel({
    id: CHANNEL_ALERTS,
    name: 'Risk Alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    lights: true,
    lightColor: '#FF4444',
    description: 'Notifications when your phone usage risk level is High or Moderate',
  });
  await notifee.createChannel({
    id: CHANNEL_SUMMARY,
    name: 'Daily Summary',
    importance: AndroidImportance.DEFAULT,
    description: 'Daily screen time summary notifications',
  });
  channelsCreated = true;
}

// ── Request permission (Android 13+) ─────────────────────────────────────────
export async function requestNotificationPermission() {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1; // 1 = AUTHORIZED
}

// ── Risk tips by label ────────────────────────────────────────────────────────
const RISK_MESSAGES = {
  'High Addiction': {
    title: '⚠️ High Addiction Risk Detected',
    body: 'Your usage patterns today put you at high risk. Open the app for personalized tips to cut back.',
    color: '#FF4444',
  },
  'Moderate Addiction': {
    title: '⚡ Moderate Risk — Time to Take a Break',
    body: 'Your phone usage is trending upward. A few small changes can make a big difference.',
    color: '#FF8C00',
  },
  'Low Addiction': {
    title: '✅ Great Job — Low Risk Today!',
    body: 'Your phone usage looks healthy. Keep it up!',
    color: '#2E7D32',
  },
};

// ── Notify when prediction result comes in ────────────────────────────────────
export async function notifyPredictionResult(label, confidence, usage) {
  try {
    await ensureChannels();

    const msg = RISK_MESSAGES[label] || RISK_MESSAGES['Low Addiction'];

    // Build context lines for expanded notification
    const lines = [];
    if (usage?.dailyUsageHours > 0) {
      lines.push(`📱 Screen time: ${formatHoursShort(usage.dailyUsageHours)}`);
    }
    if (usage?.phoneChecks > 0) {
      lines.push(`🔓 Phone unlocks: ${usage.phoneChecks} times`);
    }
    if (usage?.socialMediaHours > 0) {
      lines.push(`📲 Social media: ${formatHoursShort(usage.socialMediaHours)}`);
    }
    if (usage?.screenTimeBeforeBed > 0) {
      lines.push(`🌙 Night usage: ${formatHoursShort(usage.screenTimeBeforeBed)}`);
    }
    lines.push(`🤖 Confidence: ${Math.round(confidence * 100)}%`);

    await notifee.displayNotification({
      id: 'prediction-result',           // same ID = replaces previous
      title: msg.title,
      body: msg.body,
      android: {
        channelId: label === 'Low Addiction' ? CHANNEL_SUMMARY : CHANNEL_ALERTS,
        color: msg.color,
        importance: label === 'High Addiction'
          ? AndroidImportance.HIGH
          : AndroidImportance.DEFAULT,
        style: lines.length > 0 ? {
          type: AndroidStyle.INBOX,
          lines,
          title: msg.title,
          summary: label,
        } : undefined,
        pressAction: { id: 'default' },  // opens app on tap
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[NotificationService] notifyPredictionResult error:', e);
  }
}

// ── Daily summary notification (scheduled trigger) ────────────────────────────
/**
 * Schedule a daily summary notification at a given hour (24h format).
 * Cancels any previously scheduled summary before re-scheduling.
 * Call this once on app start or when user changes their preference.
 */
export async function scheduleDailySummary(hourOfDay = 21) {
  try {
    await ensureChannels();

    // Cancel previous scheduled summary
    await notifee.cancelTriggerNotification('daily-summary');

    // Build timestamp for next occurrence of `hourOfDay`
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(hourOfDay, 0, 0, 0);
    if (trigger <= now) {
      // Already past today's time — schedule for tomorrow
      trigger.setDate(trigger.getDate() + 1);
    }

    await notifee.createTriggerNotification(
      {
        id: 'daily-summary',
        title: '📊 Your Daily Wellbeing Summary',
        body: 'Open the app to see your screen time breakdown and risk prediction for today.',
        android: {
          channelId: CHANNEL_SUMMARY,
          pressAction: { id: 'default' },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: trigger.getTime(),
        repeatFrequencySeconds: 24 * 60 * 60, // repeat daily
      },
    );

    if (__DEV__) {
      console.log(`[NotificationService] Daily summary scheduled for ${trigger.toLocaleTimeString()}`);
    }
  } catch (e) {
    if (__DEV__) console.warn('[NotificationService] scheduleDailySummary error:', e);
  }
}

// ── Screen time milestone alert ───────────────────────────────────────────────
/**
 * Fires a one-time alert when the user first exceeds a threshold.
 * Uses a persisted flag (via caller) to avoid re-firing the same threshold.
 */
export async function notifyScreenTimeMilestone(hours) {
  try {
    await ensureChannels();
    await notifee.displayNotification({
      id: `milestone-${Math.floor(hours)}h`,
      title: `📱 ${Math.floor(hours)} Hours of Screen Time Today`,
      body: hours >= 6
        ? 'You\'ve spent over 6 hours on your phone today. Time to put it down!'
        : `You've hit ${Math.floor(hours)}h of screen time. Consider taking a break.`,
      android: {
        channelId: CHANNEL_ALERTS,
        color: hours >= 6 ? '#FF4444' : '#FF8C00',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[NotificationService] notifyScreenTimeMilestone error:', e);
  }
}

// ── Cancel all notifications ──────────────────────────────────────────────────
export async function cancelAllNotifications() {
  try {
    await notifee.cancelAllNotifications();
  } catch (e) { /* silent */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatHoursShort(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
