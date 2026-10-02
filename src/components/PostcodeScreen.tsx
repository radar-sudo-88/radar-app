import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { geocodePostcode } from '../lib/api';
import { Theme } from '../theme';
import { Station } from '../types';

interface Props {
  theme: Theme;
  current: Station | null;
  onDone: (s: Station) => void;
  onCancel?: () => void;
}

export function PostcodeScreen({ theme, current, onDone, onCancel }: Props) {
  const [value, setValue] = useState(current?.postcode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const r = await geocodePostcode(value);
    setBusy(false);
    if ('error' in r) setError(r.error); else onDone(r);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.wrap, { backgroundColor: theme.bg }]}>
      <Text style={[s.title, { color: theme.accent }]}>● ADSB Radar Scope</Text>
      <Text style={[s.sub, { color: theme.dim }]}>
        {current ? 'Enter a UK postcode to move the radar.' : 'Enter a UK postcode to centre the radar on your area.'}
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="e.g. NG1 1AA"
        placeholderTextColor={theme.dim}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="postal-code"
        returnKeyType="go"
        onSubmitEditing={submit}
        style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
      />
      <Pressable onPress={submit} style={[s.btn, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}>
        {busy ? <ActivityIndicator color={theme.bg} /> : <Text style={{ color: theme.bg, fontWeight: '800', fontSize: 16 }}>Set location</Text>}
      </Pressable>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <Text style={[s.note, { color: theme.dim }]}>
        Saved only on this device. Looking it up briefly sends it to postcodes.io, a free, independent postcode lookup service.
      </Text>
      {onCancel && (
        <Pressable onPress={onCancel} style={{ marginTop: 18 }}>
          <Text style={{ color: theme.dim, fontSize: 15 }}>Cancel</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 22 },
  input: { width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 18, textAlign: 'center', letterSpacing: 2 },
  btn: { width: '100%', maxWidth: 340, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  err: { color: '#ff5555', marginTop: 12, fontSize: 14 },
  note: { fontSize: 11, textAlign: 'center', marginTop: 22, maxWidth: 320, lineHeight: 16 },
});
