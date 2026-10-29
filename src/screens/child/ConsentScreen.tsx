/**
 * ConsentScreen
 *
 * Shown to the child BEFORE any monitoring begins.
 * They must scroll to the bottom and tap "I understand and agree"
 * before the app proceeds. This is the transparency cornerstone.
 */

import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav   = StackNavigationProp<RootStackParamList, 'Consent'>;
type Route = RouteProp<RootStackParamList, 'Consent'>;

const ITEMS: { icon: string; what: string; detail: string }[] = [
  {
    icon: '💬',
    what: 'WhatsApp message previews',
    detail:
      'The first part of each message (same text shown in your notification shade). ' +
      'Full message history and photos are NOT captured.',
  },
  {
    icon: '📱',
    what: 'SMS messages',
    detail:
      'Full text of incoming and outgoing SMS messages from your default messaging app.',
  },
  {
    icon: '🔔',
    what: 'Monitoring notification',
    detail:
      'A permanent notification will always appear in your notification bar while this app is active. ' +
      'You cannot hide or dismiss it.',
  },
];

export function ConsentScreen() {
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { pairId, childName, parentName } = route.params;

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 32;
    if (atBottom) setScrolledToBottom(true);
  }

  async function handleAgree() {
    if (!scrolledToBottom || agreed) return;
    setAgreed(true);

    await AsyncStorage.multiSet([
      ['role', 'child'],
      ['pairId', pairId],
      ['childName', childName],
    ]);

    nav.navigate('PermissionsSetup', {
      pairId,
      deviceId: '', // filled in by PermissionsSetupScreen from context
    });
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>What will be monitored?</Text>
        <Text style={s.headerSub}>
          <Text style={s.parentName}>{parentName}</Text> will be able to see
          the following activity from this device.
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator>

        {ITEMS.map(item => (
          <View key={item.what} style={s.item}>
            <Text style={s.itemIcon}>{item.icon}</Text>
            <View style={s.itemText}>
              <Text style={s.itemWhat}>{item.what}</Text>
              <Text style={s.itemDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}

        <View style={s.notMonitored}>
          <Text style={s.notMonitoredTitle}>NOT monitored</Text>
          <Text style={s.notMonitoredBody}>
            Photos, videos, voice messages, call history, location, app usage,
            browser history, and other apps are not monitored by this app.
          </Text>
        </View>

        <View style={s.scrollHint}>
          {scrolledToBottom ? (
            <Text style={s.hintDone}>✓ You've read everything</Text>
          ) : (
            <Text style={s.hintScroll}>↓ Scroll to read all before agreeing</Text>
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, !scrolledToBottom && s.btnDisabled]}
          onPress={handleAgree}
          disabled={!scrolledToBottom || agreed}
          activeOpacity={0.8}>
          <Text style={s.btnText}>
            {agreed ? 'Setting up…' : 'I understand and agree'}
          </Text>
        </TouchableOpacity>
        <Text style={s.footerNote}>
          You can stop monitoring at any time by uninstalling this app.
        </Text>
      </View>
    </View>
  );
}

const C = {
  navy:   '#1E3A8A',
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  bg:     '#F0F4FF',
  white:  '#FFFFFF',
  text:   '#1E293B',
  muted:  '#64748B',
  border: '#E2E8F0',
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.navy,
    padding: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.white,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  parentName: {
    fontWeight: '700',
    color: C.white,
  },
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 8 },
  item: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemIcon: { fontSize: 26, marginRight: 14, marginTop: 2 },
  itemText: { flex: 1 },
  itemWhat: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  itemDetail: { fontSize: 13, color: C.muted, lineHeight: 19 },
  notMonitored: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  notMonitoredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.green,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notMonitoredBody: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 19,
  },
  scrollHint: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  hintScroll: { color: C.amber, fontSize: 13, fontWeight: '600' },
  hintDone:   { color: C.green, fontSize: 13, fontWeight: '600' },
  footer: {
    padding: 20,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  btn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: { backgroundColor: '#93C5FD' },
  btnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  footerNote: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 16 },
});
