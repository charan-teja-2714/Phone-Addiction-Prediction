import React from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { PermissionGate } from './src/components/PermissionGate';
import { useAppLifecycle } from './src/hooks/useAppLifecycle';
import { theme, Colors } from './src/theme';

function AppContent() {
  useAppLifecycle();

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
      />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <PermissionGate>
            <AppContent />
          </PermissionGate>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
