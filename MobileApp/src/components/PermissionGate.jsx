import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { hasUsagePermission } from '../services/usageCollector';
import { PermissionScreen } from '../screens/PermissionScreen';

/**
 * PermissionGate wraps the main app content.
 *
 * On first launch it checks whether Usage Access is granted.
 *   - If YES  → renders children (the normal app).
 *   - If NO   → shows PermissionScreen with "Grant Access" and "Skip for Now".
 *
 * When the user returns from the Settings screen the gate automatically
 * re-checks the permission. If now granted, the PermissionScreen disappears
 * and the app loads — the user never sees the prompt again.
 *
 * "Skip for Now" lets the user proceed without granting permission.
 * The app will work but usage stats will be zeros (graceful degradation).
 */
export const PermissionGate = ({ children }) => {
  // null = still checking, true = granted, false = not granted
  const [permissionGranted, setPermissionGranted] = useState(null);
  // User explicitly skipped the permission prompt
  const [skipped, setSkipped] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Check permission
  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      // Not on Android — skip the gate entirely
      setPermissionGranted(true);
      return;
    }
    const granted = await hasUsagePermission();
    setPermissionGranted(granted);
  }, []);

  // Check on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Re-check when app returns to foreground (user comes back from Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // User switched back to the app from Settings
      if (prev.match(/inactive|background/) && nextState === 'active') {
        checkPermission();
      }
    });

    return () => subscription.remove();
  }, [checkPermission]);

  // Still loading — show nothing (avoids flash)
  if (permissionGranted === null) {
    return null;
  }

  // Permission granted OR user skipped — show the app
  if (permissionGranted || skipped) {
    return children;
  }

  // Permission not granted and not skipped — show prompt
  return <PermissionScreen onSkip={() => setSkipped(true)} />;
};
