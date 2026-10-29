/**
 * ChildHomeScreen
 *
 * Always-visible status screen on the child's device.
 * The child can see exactly what's being shared, with who, and since when.
 * This is the primary transparency mechanism in the app.
 */

import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SessionContext } from '../../App';
import {
  checkSMSPermission,
  checkNotificationListenerAccess,
} from '../../services/permissions';
import { getPairRecord } from '../../services/firebase';
import type { PairRecord } from '../../services/firebase';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList, 'ChildHome'>;

interface PermInfo {
  sms: boolean;
  whatsapp: boolean;
}

export function ChildHomeScreen() {
  const { pairId, childName, deviceId } = useContext(SessionContext);
  const nav = useNavigation<Nav>();

  const [pair,    setPair]    = useState<PairRecord | null>(null);
  const [perms,   setPerms]   = useState<PermInfo>({ sms: false, whatsapp: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!pairId) return;

      const [record, sms, whatsapp] = await Promise.all([
        getPairRecord(pairId),
        checkSMSPermission().then(r => r === 'granted'),
        checkNotificationListenerAccess(),
      ]);

      setPair(record);
      setPerms({ sms, whatsapp });
      setLoading(false);
    })();
  }, [pairId]);

  function confirmStopMonitoring() {
    Alert.alert(
      'Stop monitoring?',
      'This will disconnect your device from the parent account. ' +
        'Your parent will be notified that monitoring has stopped.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop monitoring',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['role', 'pairId', 'childName']);
            nav.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  const anyActive = perms.sms || perms.whatsapp;

  return (
    <SafeAreaView style={s.root}>
      {/* ── Status banner ── */}
      <View style={[s.banner, anyActive ? s.bannerActive : s.bannerInactive]}>
        <Text style={s.bannerIcon}>{anyActive ? '👁️' : '⚠️'}</Text>
        <View>
          <Text style={s.bannerTitle}>
            {anyActive ? 'Monitoring is active' : 'Monitoring is paused'}
          </Text>
          <Text style={s.bannerSub}>
            {anyActive
              ? `Shared with ${pair?.parentDeviceId ? 'your parent' : 'unknown'}`
              : 'Some permissions have been revoked'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionLabel}>What's being shared right now</Text>

        <InfoRow
          icon="📱"
          label="SMS messages"
          active={perms.sms}
          detail={perms.sms ? 'Full SMS content is forwarded' : 'Permission not granted'}
        />
        <InfoRow
          icon="💬"
          label="WhatsApp previews"
          active={perms.whatsapp}
          detail={
            perms.whatsapp
              ? 'Message notifications are forwarded (preview only)'
              : 'Notification access not granted'
          }
        />

        <Text style={s.sectionLabel} style={{ marginTop: 20 }}>
          What is NOT shared
        </Text>
        <View style={s.notSharedBox}>
          {[
            'Photos and videos',
            'Voice messages',
            'Call history',
            'Your location',
            'Other apps',
            'Browser history',
          ].map(item => (
            <Text key={item} style={s.notSharedItem}>✗  {item}</Text>
          ))}
        </View>

        <Text style={s.childNote}>
          Hi {childName} 👋 — this app is fully open. You can always see what's
          being shared above. If you have questions, talk to your parent.
        </Text>

        <TouchableOpacity
          style={s.stopBtn}
          onPress={confirmStopMonitoring}
          activeOpacity={0.8}>
          <Text style={s.stopBtnText}>Stop monitoring</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon, label, active, detail,
}: {
  icon: string; label: string; active: boolean; detail: string;
}) {
  return (
    <View style={[s.infoRow, active ? s.infoRowActive : s.infoRowInactive]}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={s.infoText}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoDetail}>{detail}</Text>
      </View>
      <View style={[s.dot, active ? s.dotActive : s.dotInactive]} />
    </View>
  );
}

const C = {
  navy:    '#1E3A8A',
  blue:    '#2563EB',
  green:   '#059669',
  amber:   '#D97706',
  red:     '#DC2626',
  bg:      '#F0F4FF',
  white:   '#FFFFFF',
  text:    '#1E293B',
  muted:   '#64748B',
  border:  '#E2E8F0',
};

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.muted },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
  },
  bannerActive:   { backgroundColor: '#1E3A8A' },
  bannerInactive: { backgroundColor: '#78350F' },
  bannerIcon:  { fontSize: 30 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  bannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  content: { padding: 20, gap: 10 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 6,
    marginBottom: 2,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRowActive:   { backgroundColor: C.white,    borderColor: C.border },
  infoRowInactive: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  infoIcon:  { fontSize: 22 },
  infoText:  { flex: 1 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  infoDetail:{ fontSize: 12, color: C.muted, marginTop: 2 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: C.green },
  dotInactive:{ backgroundColor: C.amber },

  notSharedBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  notSharedItem: { fontSize: 13, color: '#065F46' },

  childNote: {
    marginTop: 8,
    fontSize: 13,
    color: C.muted,
    lineHeight: 20,
    backgroundColor: C.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  stopBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: C.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopBtnText: { color: C.red, fontSize: 14, fontWeight: '700' },
});
