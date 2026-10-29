import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import firestore from '@react-native-firebase/firestore';

import { SessionContext } from '../../App';
import { getPairRecord, type PairRecord } from '../../services/firebase';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const { pairId, childName } = useContext(SessionContext);

  const [pair, setPair]                 = useState<PairRecord | null>(null);
  const [notificationsOn, setNotifOn]   = useState(true);

  useEffect(() => {
    if (!pairId) return;
    getPairRecord(pairId).then(setPair);
  }, [pairId]);

  function confirmUnpair() {
    Alert.alert(
      'Remove monitoring?',
      'This will disconnect from the child device. The child will be notified. ' +
        'You can set up a new connection at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (pairId) {
              await firestore().collection('pairs').doc(pairId).update({ active: false });
            }
            await AsyncStorage.multiRemove(['role', 'pairId', 'childName']);
            nav.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Section label="Linked device">
        <InfoRow label="Child's name" value={childName ?? '—'} />
        <InfoRow label="Pair ID" value={pairId ? `…${pairId.slice(-8)}` : '—'} />
        <InfoRow label="Status" value={pair?.active ? 'Active ✓' : 'Inactive'} />
      </Section>

      <Section label="Notifications">
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Alert on new messages</Text>
          <Switch
            value={notificationsOn}
            onValueChange={setNotifOn}
            trackColor={{ true: C.blue }}
          />
        </View>
      </Section>

      <Section label="About transparency">
        <Text style={s.bodyText}>
          KidSafe Monitor is built on the principle that your child always knows
          they are being monitored. The child's device shows a permanent notification
          badge and a status screen showing exactly what data is shared.{'\n\n'}
          WhatsApp previews only show the notification content — the same text
          visible in the notification shade. Full chat history is not accessible.
        </Text>
      </Section>

      <TouchableOpacity style={s.dangerBtn} onPress={confirmUnpair} activeOpacity={0.8}>
        <Text style={s.dangerBtnText}>Remove monitoring link</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const C = {
  navy:   '#1E3A8A',
  blue:   '#2563EB',
  red:    '#DC2626',
  bg:     '#F0F4FF',
  white:  '#FFFFFF',
  text:   '#1E293B',
  muted:  '#64748B',
  border: '#E2E8F0',
};

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, gap: 20, paddingBottom: 40 },

  section:      { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionBody: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoLabel: { fontSize: 14, color: C.text },
  infoValue: { fontSize: 14, color: C.muted },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 14, color: C.text },

  bodyText: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 20,
    padding: 16,
  },

  dangerBtn: {
    borderWidth: 1.5,
    borderColor: C.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  dangerBtnText: { color: C.red, fontSize: 15, fontWeight: '700' },
});
