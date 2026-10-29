/**
 * App.tsx — Root component
 *
 * Flow:
 *  1. Sign in anonymously (get deviceId)
 *  2. Check AsyncStorage for stored role + pairId
 *  3. If first launch → RoleSelect
 *  4. If parent     → Parent navigator
 *  5. If child      → Child navigator
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { signInAnonymously } from './services/firebase';
import { AppNavigator } from './navigation/AppNavigator';

export type UserRole = 'parent' | 'child' | null;

export interface AppSession {
  deviceId: string;
  role: UserRole;
  pairId: string | null;
  childName: string | null;
}

export const SessionContext = React.createContext<AppSession>({
  deviceId: '',
  role: null,
  pairId: null,
  childName: null,
});

const COLORS = { bg: '#F0F4FF', primary: '#2563EB' };

export default function App() {
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    (async () => {
      // 1. Anonymous Firebase auth → stable device ID
      const deviceId = await signInAnonymously();

      // 2. Check if already set up
      const [role, pairId, childName] = await Promise.all([
        AsyncStorage.getItem('role'),
        AsyncStorage.getItem('pairId'),
        AsyncStorage.getItem('childName'),
      ]);

      setSession({
        deviceId,
        role: (role as UserRole) ?? null,
        pairId: pairId ?? null,
        childName: childName ?? null,
      });
    })();
  }, []);

  if (!session) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionContext.Provider value={session}>
          <NavigationContainer>
            <AppNavigator session={session} setSession={setSession} />
          </NavigationContainer>
        </SessionContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
