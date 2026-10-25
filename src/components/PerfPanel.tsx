import { useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PERF_BUDGET, PERF_LABELS, type PerfKey, perfReport, perfSnapshot, perfSubscribe, setPerfEnabled } from '@/lib/perfMeter';

/** Panel flotante del medidor de rendimiento (solo si está activado). */
export function PerfPanel() {
  const { values, enabled } = useSyncExternalStore(perfSubscribe, perfSnapshot, perfSnapshot);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  if (!enabled) return null;

  const share = async () => {
    const message = perfReport();
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else await Share.share({ message });
    } catch {}
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, bottom: insets.bottom + 90, zIndex: 9999 }}>
      <View style={{ backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 12, padding: open ? 10 : 6, maxWidth: 300 }}>
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel="Medidor de rendimiento">
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{open ? 'Medidor ▾' : 'Medidor ▸'}</Text>
        </Pressable>
        {open ? (
          <>
            {(Object.keys(PERF_LABELS) as PerfKey[]).map((k) => {
              const v = values[k] ?? [];
              return (
                <Text key={k} style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>
                  {PERF_LABELS[k]}: <Text style={{ fontWeight: '700' }}>{v.length ? v.slice(-3).join(' · ') : '—'}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)' }}> ({PERF_BUDGET[k]})</Text>
                </Text>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable onPress={share} accessibilityRole="button" style={{ backgroundColor: '#6F5BD3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{copied ? 'Copiado' : Platform.OS === 'web' ? 'Copiar' : 'Compartir'}</Text>
              </Pressable>
              <Pressable onPress={() => setPerfEnabled(false)} accessibilityRole="button" style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>Apagar</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
