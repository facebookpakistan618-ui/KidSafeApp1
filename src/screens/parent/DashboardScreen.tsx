/**
 * DashboardScreen (Parent)
 *
 * Real-time feed of the child's WhatsApp notification previews and SMS messages.
 * Messages arrive via Firestore onSnapshot listener — no polling.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { SessionContext } from '../../App';
import {
  subscribeToMessages,
  markAllRead,
  type Message,
} from '../../services/firebase';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const APP_META: Record<string, { label: string; color: string; bg: string }> = {
  whatsapp:          { label: 'WhatsApp', color: '#166534', bg: '#DCFCE7' },
  whatsapp_business: { label: 'WA Business', color: '#166534', bg: '#DCFCE7' },
  sms:               { label: 'SMS', color: '#1D4ED8', bg: '#DBEAFE' },
};

export function DashboardScreen() {
  const { pairId, childName } = useContext(SessionContext);
  const nav = useNavigation<Nav>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  const unread = messages.filter(m => !m.read).length;

  useEffect(() => {
    if (!pairId) return;

    unsubRef.current = subscribeToMessages(pairId, msgs => {
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubRef.current?.();
  }, [pairId]);

  async function handleMarkAllRead() {
    if (!pairId) return;
    await markAllRead(pairId);
  }

  function renderHeader() {
    return (
      <View style={s.listHeader}>
        <Text style={s.listHeaderLabel}>
          {messages.length === 0
            ? 'No messages yet'
            : `${messages.length} messages`}
          {unread > 0 && (
            <Text style={s.unreadCount}>  {unread} unread</Text>
          )}
        </Text>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={s.markReadBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderMessage({ item }: { item: Message }) {
    const meta  = APP_META[item.app] ?? APP_META.sms;
    const time  = item.timestamp
      ? formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true })
      : 'just now';

    return (
      <View style={[s.msgCard, !item.read && s.msgCardUnread]}>
        {!item.read && <View style={s.unreadDot} />}
        <View style={s.msgTop}>
          <View style={[s.appBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.appBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={s.msgTime}>{time}</Text>
        </View>
        <Text style={s.msgSender}>{item.sender}</Text>
        <Text style={s.msgPreview} numberOfLines={3}>{item.preview}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.topBarTitle}>
            {childName ? `${childName}'s Activity` : 'Activity Feed'}
          </Text>
          <View style={s.liveIndicator}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Live</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('Settings')}>
          <Text style={s.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ── Unread banner ── */}
      {unread > 0 && (
        <View style={s.unreadBanner}>
          <Text style={s.unreadBannerText}>
            🔔 {unread} new {unread === 1 ? 'message' : 'messages'}
          </Text>
        </View>
      )}

      {/* ── Feed ── */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={C.blue} size="large" />
          <Text style={s.loaderText}>Loading messages…</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>📭</Text>
      <Text style={s.emptyTitle}>No messages yet</Text>
      <Text style={s.emptyDesc}>
        Messages will appear here as soon as your child receives WhatsApp
        notifications or SMS messages.
      </Text>
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
  unread: '#EFF6FF',
};

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  topBar: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  liveText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  settingsIcon: { fontSize: 22 },

  unreadBanner: {
    backgroundColor: '#1E40AF',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unreadBannerText: { color: C.white, fontSize: 13, fontWeight: '600' },

  listContent: { padding: 16, gap: 10, paddingBottom: 32 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  listHeaderLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  unreadCount:  { color: C.blue },
  markReadBtn:  { fontSize: 13, color: C.blue, fontWeight: '600' },

  msgCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  msgCardUnread: {
    backgroundColor: C.unread,
    borderColor: '#BFDBFE',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.blue,
  },
  msgTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  appBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appBadgeText: { fontSize: 11, fontWeight: '700' },
  msgTime: { fontSize: 12, color: C.muted, marginLeft: 'auto' },
  msgSender: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  msgPreview: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: C.muted, fontSize: 14 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
});
