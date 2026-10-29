import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { AppSession } from '../App';

// Screens
import { RoleSelectScreen }       from '../screens/RoleSelectScreen';
import { PairingScreen }          from '../screens/PairingScreen';
import { DashboardScreen }        from '../screens/parent/DashboardScreen';
import { SettingsScreen }         from '../screens/parent/SettingsScreen';
import { ConsentScreen }          from '../screens/child/ConsentScreen';
import { PermissionsSetupScreen } from '../screens/child/PermissionsSetupScreen';
import { ChildHomeScreen }        from '../screens/child/ChildHomeScreen';

export type RootStackParamList = {
  RoleSelect:        undefined;
  Pairing:           { role: 'parent' | 'child' };
  Consent:           { pairId: string; childName: string; parentName: string };
  PermissionsSetup:  { pairId: string; deviceId: string };
  ChildHome:         undefined;
  Dashboard:         undefined;
  Settings:          undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const HEADER_STYLE = {
  headerStyle:          { backgroundColor: '#1E3A8A' },
  headerTintColor:      '#FFFFFF',
  headerTitleStyle:     { fontWeight: '700' as const, fontSize: 17 },
  headerBackTitleVisible: false,
};

interface Props {
  session: AppSession;
  setSession: React.Dispatch<React.SetStateAction<AppSession | null>>;
}

export function AppNavigator({ session }: Props) {
  // Determine initial route based on stored session state
  const initialRoute: keyof RootStackParamList = (() => {
    if (!session.role)   return 'RoleSelect';
    if (!session.pairId) return 'Pairing';
    if (session.role === 'parent') return 'Dashboard';
    return 'ChildHome';
  })();

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={HEADER_STYLE}>

      {/* ── Onboarding ─────────────────────────────────────────────── */}
      <Stack.Screen
        name="RoleSelect"
        component={RoleSelectScreen}
        options={{ title: 'KidSafe Monitor', headerShown: false }}
      />
      <Stack.Screen
        name="Pairing"
        component={PairingScreen}
        options={({ route }) => ({
          title: route.params.role === 'parent' ? 'Set Up Monitoring' : 'Connect to Parent',
        })}
      />

      {/* ── Child flow ─────────────────────────────────────────────── */}
      <Stack.Screen
        name="Consent"
        component={ConsentScreen}
        options={{ title: 'Before You Continue', headerLeft: () => null }}
      />
      <Stack.Screen
        name="PermissionsSetup"
        component={PermissionsSetupScreen}
        options={{ title: 'Grant Permissions', headerLeft: () => null }}
      />
      <Stack.Screen
        name="ChildHome"
        component={ChildHomeScreen}
        options={{ title: 'KidSafe Monitor', headerLeft: () => null }}
      />

      {/* ── Parent flow ────────────────────────────────────────────── */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Activity Dashboard", headerLeft: () => null }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />

    </Stack.Navigator>
  );
}
