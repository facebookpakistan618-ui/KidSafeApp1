import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  AppState, AppStateStatus,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SessionContext } from '../../App';
import {
  checkSMSPermission, requestSMSPermission,
  checkNotificationListenerAccess, openNotificationListenerSettings,
  storePairingInfoNative,
} from '../../services/permissions';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav   = StackNavigationProp<RootStackParamList, 'PermissionsSetup'>;
type Route = RouteProp<RootStackParamList, 'PermissionsSetup'>;

type PermState = 'idle' | 'granted' | 'denied';

export function PermissionsSetupScreen() {
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { pairId }    = route.params;
  const { deviceId }  = useContext(SessionContext);

  const [smsState,    setSmsState]    = useState<PermState>('idle');
  const [notifState,  setNotifState]  = useState<PermState>('idle');
  const [storedNative, setStoredNative] = useState(false);

  // Re-check notification access when user returns from Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        const enabled = await checkNotificationListenerAccess();
        if (enabled) setNotifState('granted');
      }
    });
    return () => sub.remove();
  }, []);

  // Initial checks
  useEffect(() => {
    (async () => {
      const sms = await checkSMSPermission();
      if (sms === 'granted') setSmsState('granted');

      const notif = await checkNotificationListenerAccess();
      if (notif) setNotifState('granted');
    })();
  }, []);

  async function handleSMSGrant() {
    const result = await requestSMSPermission();
    setSmsState(result === 'granted' ? 'granted' : 'denied');
  }

  function handleNotifGrant() {
    openNotificationListenerSettings();
    // Re-check happens in AppState listener above
  }

  async function handleFinish() {
    // Store pairId + deviceId in native SharedPreferences
    // so the Kotlin NotificationListenerService can read them
    if (!storedNative) {
      await storePairingInfoNative(pairId, deviceId);
      setStoredNative(true);
    }
    nav.navigate('ChildHome');
  }

  const allGranted = smsState === 'granted' && notifState === 'granted';
  const anyGranted = smsState === 'granted' || notifState === 'granted';

  return (
    <View style={s.root}>
      <Text style={s.intro}>
        Grant these permissions so monitoring can work. Both are required
        and will be shown to you at all times.
      </Text>

      {/* SMS */}
      <PermRow
        icon="📱"
        title="SMS messages"
        description="Lets KidSafe read incoming and outgoing SMS messages."
        state={smsState}
        onGrant={handleSMSGrant}
      />

      {/* Notification listener */}
      <PermRow
        icon="🔔"
        title="Notification access"
        description={
          "Lets KidSafe read WhatsApp notification previews.\n\n" +
          "Tap 'Open Settings', find KidSafe Monitor in the list, " +
          "and turn the toggle on. Then come back here."
        }
        state={notifState}
        onGrant={handleNotifGrant}
        buttonLabel="Open Settings"
      />

      {anyGranted && (
        <TouchableOpacity
          style={[s.finishBtn, !allGranted && s.finishBtnPartial]}
          onPress={handleFinish}
          activeOpacity={0.8}>
          <Text style={s.finishBtnText}>
            {allGranted ? 'All done — Start monitoring' : 'Continue with partial permissions'}
          </Text>
        </TouchableOpacity>
      )}

      {!anyGranted && (
        <Text style={s.skipNote}>
          At least one permission is needed to monitor anything.
        </Text>
      )}
    </View>
  );
}

interface PermRowProps {
  icon: string;
  title: string;
  description: string;
  state: PermState;
  onGrant: () => void;
  buttonLabel?: string;
}

function PermRow({ icon, title, description, state, onGrant, buttonLabel = 'Grant' }: PermRowProps) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowIcon}>{icon}</Text>
        <View style={s.rowText}>
          <Text style={s.rowTitle}>{title}</Text>
          <Text style={s.rowDesc}>{description}</Text>
        </View>
      </View>
      {state === 'granted' ? (
        <View style={s.grantedBadge}>
          <Text style={s.grantedText}>✓ Granted</Text>
        </View>
      ) : (
        <TouchableOpacity style={s.grantBtn} onPress={onGrant} activeOpacity={0.75}>
          <Text style={s.grantBtnText}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const C = {
  navy:   '#1E3A8A',
  blue:   '#2563EB',
  green:  '#059669',
  bg:     '#F0F4FF',
  white:  '#FFFFFF',
  text:   '#1E293B',
  muted:  '#64748B',
  border: '#E2E8F0',
};

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg, padding: 20, gap: 14 },
  intro: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 4 },

  row: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 1,
    gap: 14,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowIcon:  { fontSize: 26, marginTop: 2 },
  rowText:  { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  rowDesc:  { fontSize: 13, color: C.muted, lineHeight: 19 },

  grantBtn: {
    backgroundColor: C.blue,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  grantBtnText:   { color: C.white, fontSize: 14, fontWeight: '600' },
  grantedBadge:   { backgroundColor: '#ECFDF5', borderRadius: 8, padding: 8 },
  grantedText:    { color: C.green, fontSize: 13, fontWeight: '600' },

  finishBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  finishBtnPartial: { backgroundColor: '#475569' },
  finishBtnText:    { color: C.white, fontSize: 15, fontWeight: '700' },
  skipNote:  { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
