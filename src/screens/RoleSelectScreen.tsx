import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList, 'RoleSelect'>;

export function RoleSelectScreen() {
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Brand ── */}
      <View style={s.brand}>
        <Text style={s.logo}>🛡️</Text>
        <Text style={s.appName}>KidSafe Monitor</Text>
        <Text style={s.tagline}>
          Open, transparent monitoring — your child always knows.
        </Text>
      </View>

      {/* ── Role cards ── */}
      <View style={s.cards}>
        <RoleCard
          emoji="👨‍👩‍👧"
          title="I'm a Parent"
          description="Set up monitoring and view your child's WhatsApp & SMS activity."
          onPress={() => nav.navigate('Pairing', { role: 'parent' })}
          accent={C.blue}
        />
        <RoleCard
          emoji="🧒"
          title="I'm the Child"
          description="I understand I'll be monitored and want to connect to my parent's account."
          onPress={() => nav.navigate('Pairing', { role: 'child' })}
          accent={C.teal}
        />
      </View>

      <Text style={s.footer}>
        This app never hides its presence. A notification will always be visible
        on the monitored device.
      </Text>
    </SafeAreaView>
  );
}

interface CardProps {
  emoji: string;
  title: string;
  description: string;
  accent: string;
  onPress: () => void;
}

function RoleCard({ emoji, title, description, accent, onPress }: CardProps) {
  return (
    <TouchableOpacity
      style={[s.card, { borderLeftColor: accent }]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={s.cardEmoji}>{emoji}</Text>
      <View style={s.cardText}>
        <Text style={[s.cardTitle, { color: accent }]}>{title}</Text>
        <Text style={s.cardDesc}>{description}</Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const C = {
  navy:  '#1E3A8A',
  blue:  '#2563EB',
  teal:  '#0D9488',
  bg:    '#F0F4FF',
  text:  '#1E293B',
  muted: '#64748B',
  white: '#FFFFFF',
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.navy,
    paddingHorizontal: 24,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  cards: {
    gap: 14,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    elevation: 3,
  },
  cardEmoji: { fontSize: 30, marginRight: 14 },
  cardText:  { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardDesc:  { fontSize: 13, color: C.muted, lineHeight: 18 },
  chevron:   { fontSize: 22, color: C.muted, marginLeft: 8 },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingBottom: 28,
    lineHeight: 18,
  },
});
