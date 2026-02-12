/**
 * App configuration.
 *
 * ── Development ──
 * Using `adb reverse tcp:8000 tcp:8000` so the phone reaches your PC
 * via localhost through the USB tunnel. Run this adb command each time
 * you reconnect the device.
 *
 * ── Production / APK deployment ──
 * Change API_BASE_URL to your deployed server URL, e.g.:
 *   export const API_BASE_URL = 'https://your-server.com';
 */

// Development (USB via adb reverse)
export const API_BASE_URL = 'http://localhost:8000';

// Production — uncomment and replace when deploying the APK:
// export const API_BASE_URL = 'https://your-production-server.com';

/** Timeout for API requests in milliseconds. */
export const API_TIMEOUT_MS = 15000;
