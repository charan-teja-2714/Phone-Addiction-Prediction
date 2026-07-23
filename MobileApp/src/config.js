/**
 * App Configuration & API Endpoint Switcher
 *
 * Choose the appropriate API_BASE_URL for your testing target:
 *
 * 1. 🤖 Android Emulator (Testing on local PC server):
 *    export const API_BASE_URL = 'http://10.0.2.2:8000';
 *    (Note: 10.0.2.2 is Android Emulator's special alias for host PC's localhost)
 *
 * 2. 🔌 Physical Android Device via USB (Local PC server with ADB reverse proxy):
 *    Run `adb reverse tcp:8000 tcp:8000` in terminal, then use:
 *    export const API_BASE_URL = 'http://localhost:8000';
 *
 * 3. 📶 Physical Android Device via Local Wi-Fi Network:
 *    export const API_BASE_URL = 'http://192.168.x.x:8000';  (Replace with PC's local IP)
 *
 * 4. ☁️ Production Server (Live Cloud API on Render.com):
 *    export const API_BASE_URL = 'https://phone-addiction-prediction.onrender.com';
 */

// ── ACTIVE CONFIGURATION ──
// For Local Testing in Android Emulator:
export const API_BASE_URL = 'http://10.0.2.2:8000';

// For Local Testing on Physical Device via USB (with `adb reverse tcp:8000 tcp:8000`):
// export const API_BASE_URL = 'http://localhost:8000';

// For Production / Deployed App:
// export const API_BASE_URL = 'https://phone-addiction-prediction.onrender.com';

/** Timeout for API requests in milliseconds (15 seconds) */
export const API_TIMEOUT_MS = 15000;

