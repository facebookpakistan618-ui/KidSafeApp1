import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { SessionContext } from '../App';
import {
  createPairingCode,
  redeemPairingCode,
  getPairRecord,
} from '../services/firebase';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav   = StackNavigationProp<RootStackParamList, 'Pairing'>;
type Route = RouteProp<RootStackParamList, 'Pairing'>;

export function PairingScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { role } = route.params;
  const { deviceId } = useContext(SessionContext);

  return role === 'parent'
    ? <ParentPairing deviceId={deviceId} nav={nav} />
    : <ChildPairing  deviceId={deviceId} nav={nav} />;
}

// ── Parent side: generate code ────────────────────────────────────────────────

function ParentPairing({ deviceId, nav }: { deviceId: string; nav: Nav }) {
  const [code,    setCode]    = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const c = await createPairingCode(deviceId);
      setCode(c);
      await AsyncStorage.setItem('role', 'parent');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkLinked() {
    if (!code) return;
    // The child's redeemPairingCode creates the pair; parent finds it by deviceId
    const { findPairId } = await import('../services/firebase');
    const pairId = await findPairId(deviceId);
    if (pairId) {
      const record = await getPairRecord(pairId);
      await AsyncStorage.setItem('pairId', pairId);
      nav.navigate('Dashboard');
    }
  }

  return (
    <View style={s.root}>
      <Text style={s.headline}>Share this code with your child</Text>
      <Text style={s.sub}>
        Give this 6-digit code to your child. They'll enter it on their device
        to link the two accounts. The code expires in 10 minutes.
      </Text>

      {!code ? (
        <TouchableOpacity style={s.primaryBtn} onPress={generateCode} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.primaryBtnText}>Generate pairing code</Text>}
        </TouchableOpacity>
      ) : (
        <>
          <View style={s.codeBox}>
            {code.split('').map((digit, i) => (
              <View key={i} style={s.digitBox}>
                <Text style={s.digit}>{digit}</Text>
              </View>
            ))}
          </View>
          <Text style={s.codeSub}>Expires in 10 minutes</Text>

          <TouchableOpacity style={s.primaryBtn} onPress={checkLinked}>
            <Text style={s.primaryBtnText}>My child has entered it →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={generateCode}>
            <Text style={s.secondaryBtnText}>Generate new code</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

// ── Child side: enter code ────────────────────────────────────────────────────

function ChildPairing({ deviceId, nav }: { deviceId: string; nav: Nav }) {
  const [code,       setCode]       = useState('');
  const [childName,  setChildName]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleConnect() {
    if (code.length !== 6 || !childName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const pairId = await redeemPairingCode(code, deviceId, childName.trim());
      const record = await getPairRecord(pairId);

      nav.navigate('Consent', {
        pairId,
        childName: childName.trim(),
        parentName: record?.parentDeviceId ?? 'your parent',
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const canConnect = code.length === 6 && childName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <Text style={s.headline}>Enter the code from your parent's device</Text>
      <Text style={s.sub}>
        Ask your parent to open KidSafe Monitor and show you the 6-digit
        pairing code. Enter it below.
      </Text>

      <TextInput
        style={s.nameInput}
        placeholder="Your first name (e.g. Alex)"
        placeholderTextColor="#94A3B8"
        value={childName}
        onChangeText={setChildName}
        maxLength={40}
        autoCapitalize="words"
      />

      <TextInput
        style={s.codeInput}
        placeholder="6-digit code"
        placeholderTextColor="#94A3B8"
        value={code}
        onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="numeric"
        maxLength={6}
        textAlign="center"
      />

      <TouchableOpacity
        style={[s.primaryBtn, !canConnect && s.primaryBtnDisabled]}
        onPress={handleConnect}
        disabled={!canConnect || loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.primaryBtnText}>Connect</Text>}
      </TouchableOpacity>

      {error && <Text style={s.errorText}>{error}</Text>}
    </KeyboardAvoidingView>
  );
}

const C = {
  navy:   '#1E3A8A',
  blue:   '#2563EB',
  bg:     '#F0F4FF',
  white:  '#FFFFFF',
  text:   '#1E293B',
  muted:  '#64748B',
  border: '#E2E8F0',
  red:    '#DC2626',
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 24,
    gap: 16,
  },
  headline: { fontSize: 22, fontWeight: '800', color: C.text, lineHeight: 28 },
  sub:      { fontSize: 14, color: C.muted, lineHeight: 21 },

  codeBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  digitBox: {
    width: 48,
    height: 60,
    backgroundColor: C.white,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.blue,
    elevation: 2,
  },
  digit: { fontSize: 28, fontWeight: '800', color: C.navy },
  codeSub: { textAlign: 'center', fontSize: 13, color: C.muted },

  nameInput: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
  },
  codeInput: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: C.blue,
    color: C.navy,
  },

  primaryBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#93C5FD' },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: C.navy, fontSize: 15, fontWeight: '600' },

  errorText: {
    color: C.red,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },
});
