import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ProactiveSheet } from './ProactiveSheet';
import { Button, Card, IconButton, Muted, SectionLabel } from './ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_QUIET, formatHour, type ProactiveMode, setQuietHours } from '@/lib/proactive';
import { disablePush, enablePush, PUSH_SURFACE, pushState, type PushState } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Avatar } from '@/lib/types';

type Row = Pick<Avatar, 'id' | 'name' | 'gender' | 'appearance' | 'avatar_image_url' | 'use_portrait'> & { proactive_mode: ProactiveMode };

/**
 * Ajustes de WP-12: qué personajes pueden escribir primero (cada fila abre la misma hoja
 * que en el chat), horario de silencio y avisos de este dispositivo. Todo apagado por defecto.
 */
export function ProactiveSettings() {
  const { t } = useI18n();
  const colors = useColors();
  const { profile, session, isGuest, refreshProfile } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiet, setQuiet] = useState<[number, number]>([profile?.quiet_start ?? DEFAULT_QUIET.start, profile?.quiet_end ?? DEFAULT_QUIET.end]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid || isGuest) return;
    supabase
      .from('avatars')
      .select('id, name, gender, appearance, avatar_image_url, use_portrait, proactive_mode')
      .eq('user_id', uid)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => setRows((data as Row[] | null) ?? []));
    pushState().then(setPush, () => setPush('unsupported'));
  }, [uid, isGuest]);
  // Al salir de Ajustes se guarda el último cambio pendiente (no se pierde).
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      pendingSave.current?.();
    },
    [],
  );

  if (!uid) return null;
  if (isGuest) {
    return (
      <>
        <SectionLabel>{t('settings.proactive')}</SectionLabel>
        <Muted className="px-1 text-[13px] leading-[18px]">{t('proactive.needsAccount')}</Muted>
      </>
    );
  }

  // Varios toques seguidos se guardan juntos (una sola petición, siempre el último valor).
  const changeQuiet = (i: 0 | 1, delta: number) => {
    const next: [number, number] = [...quiet];
    next[i] = (next[i] + delta + 24) % 24;
    if (next[0] === next[1]) next[i] = (next[i] + delta + 24) % 24; // nunca inicio = fin
    setQuiet(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingSave.current = () => {
      pendingSave.current = null;
      setQuietHours(uid, next[0], next[1]).then(refreshProfile, () => showDialog(t('common.error'), t('chat.errorServer')));
    };
    saveTimer.current = setTimeout(() => pendingSave.current?.(), 700);
  };

  const togglePush = async () => {
    setBusy(true);
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush());
    } catch {
      showDialog(t('common.error'), t('billing.offline'));
    } finally {
      setBusy(false);
    }
  };

  const hourStepper = (i: 0 | 1, label: string) => (
    <View className="flex-1 items-center">
      <Text className="text-[12px] text-muted">{label}</Text>
      <View className="mt-1 flex-row items-center">
        <IconButton icon="remove" size={32} label={`${label} −1 h`} onPress={() => changeQuiet(i, -1)} />
        <Text className="mx-1 w-[52px] text-center font-semibold text-[16px] text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {formatHour(quiet[i])}
        </Text>
        <IconButton icon="add" size={32} label={`${label} +1 h`} onPress={() => changeQuiet(i, 1)} />
      </View>
    </View>
  );
  const pushText = {
    on: t('proactive.pushOn'),
    off: t('proactive.pushOff'),
    denied: PUSH_SURFACE === 'browser' ? t('proactive.pushDenied') : t('proactive.pushDeniedDevice'),
    unsupported: PUSH_SURFACE === 'browser' ? t('proactive.pushUnsupported') : t('proactive.pushUnsupportedDevice'),
  };
  const modeLabel = { off: t('proactive.off'), sometimes: t('proactive.sometimes'), often: t('proactive.often') };

  return (
    <>
      <SectionLabel>{t('settings.proactive')}</SectionLabel>
      <Card>
        {rows === null ? (
          <Muted className="px-4 py-3 text-[13px]">…</Muted>
        ) : rows.length === 0 ? (
          <Muted className="px-4 py-3 text-[13px]">{t('settings.proactiveNone')}</Muted>
        ) : (
          rows.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => setOpen(r)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}: ${modeLabel[r.proactive_mode]}`}
              className={`flex-row items-center px-4 py-3 active:bg-subtle ${i ? 'border-t border-line' : ''}`}
            >
              <Ionicons name={r.proactive_mode === 'off' ? 'notifications-off-outline' : 'notifications-outline'} size={18} color={colors.ink} />
              <Text className="ml-3 flex-1 text-[15px] text-ink">{r.name}</Text>
              <Text className="mr-1 text-[13px] text-muted">{modeLabel[r.proactive_mode]}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))
        )}
      </Card>
      <Muted className="mt-2 px-1 text-[12px] leading-[17px]">{t('proactive.rulesSettings')}</Muted>

      <Card className="mt-3 px-4 py-3">
        <Text className="font-semibold text-[14px] text-ink">{t('settings.quiet')}</Text>
        <Muted className="mt-0.5 text-[12px] leading-[17px]">{t('settings.quietHint')}</Muted>
        <View className="mt-2 flex-row">
          {hourStepper(0, t('settings.quietFrom'))}
          {hourStepper(1, t('settings.quietTo'))}
        </View>
      </Card>

      {push ? (
        <Card className="mt-3 flex-row items-center px-4 py-3">
          <View className="mr-3 flex-1">
            <Text className="font-semibold text-[14px] text-ink">{t('proactive.push')}</Text>
            <Muted className="mt-0.5 text-[12px] leading-[17px]">{pushText[push]}</Muted>
          </View>
          {push === 'on' || push === 'off' ? (
            <Button size="sm" variant={push === 'on' ? 'ghost' : 'secondary'} title={push === 'on' ? t('proactive.pushDisable') : t('proactive.pushEnable')} loading={busy} onPress={togglePush} />
          ) : null}
        </Card>
      ) : null}

      <ProactiveSheet
        visible={!!open}
        avatar={open}
        mode={open?.proactive_mode ?? 'off'}
        onChange={(m) => {
          setOpen((o) => (o ? { ...o, proactive_mode: m } : o));
          setRows((rs) => rs?.map((x) => (x.id === open?.id ? { ...x, proactive_mode: m } : x)) ?? null);
        }}
        onClose={() => {
          setOpen(null);
          pushState().then(setPush, () => undefined);
        }}
      />
    </>
  );
}
