import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, IconButton, Muted, Segmented, SectionLabel } from './ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_QUIET, formatHour, type ProactiveMode, setProactiveMode, setQuietHours } from '@/lib/proactive';
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push';
import { supabase } from '@/lib/supabase';

type Row = { id: string; name: string; proactive_mode: ProactiveMode };

/**
 * Ajustes de WP-12: horario de silencio, qué personajes pueden escribir primero y los
 * avisos de este dispositivo. Todo apagado por defecto.
 */
export function ProactiveSettings() {
  const { t } = useI18n();
  const { profile, session, isGuest, refreshProfile } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiet, setQuiet] = useState<[number, number]>([profile?.quiet_start ?? DEFAULT_QUIET.start, profile?.quiet_end ?? DEFAULT_QUIET.end]);
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid || isGuest) return;
    supabase
      .from('avatars')
      .select('id, name, proactive_mode')
      .eq('user_id', uid)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => setRows((data as Row[] | null) ?? []));
    pushState().then(setPush, () => setPush('unsupported'));
  }, [uid, isGuest]);

  if (!uid) return null;
  if (isGuest) {
    return (
      <>
        <SectionLabel>{t('settings.proactive')}</SectionLabel>
        <Muted className="px-1 text-[13px] leading-[18px]">{t('proactive.needsAccount')}</Muted>
      </>
    );
  }

  const changeQuiet = async (i: 0 | 1, delta: number) => {
    const next: [number, number] = [...quiet];
    next[i] = (next[i] + delta + 24) % 24;
    const prev = quiet;
    setQuiet(next);
    try {
      await setQuietHours(uid, next[0], next[1]);
      refreshProfile();
    } catch {
      setQuiet(prev);
      showDialog(t('common.error'), t('chat.errorServer'));
    }
  };

  const changeMode = async (id: string, mode: ProactiveMode) => {
    const prev = rows;
    setRows((r) => r?.map((x) => (x.id === id ? { ...x, proactive_mode: mode } : x)) ?? null);
    try {
      await setProactiveMode(id, mode);
    } catch {
      setRows(prev);
      showDialog(t('common.error'), t('chat.errorServer'));
    }
  };

  const togglePush = async () => {
    setBusy(true);
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush(uid));
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
  const pushText = { on: t('proactive.pushOn'), off: t('proactive.pushOff'), denied: t('proactive.pushDenied'), unsupported: t('proactive.pushUnsupported') };
  const modes: { id: ProactiveMode; label: string }[] = [
    { id: 'off', label: t('proactive.off') },
    { id: 'sometimes', label: t('proactive.sometimesShort') },
    { id: 'often', label: t('proactive.often') },
  ];

  return (
    <>
      <SectionLabel>{t('settings.proactive')}</SectionLabel>
      <Card className="px-4 py-3">
        {rows === null ? (
          <Muted className="text-[13px]">…</Muted>
        ) : rows.length === 0 ? (
          <Muted className="text-[13px]">{t('settings.proactiveNone')}</Muted>
        ) : (
          rows.map((r, i) => (
            <View key={r.id} className={i ? 'mt-3 border-t border-line pt-3' : ''}>
              <Text className="mb-2 font-semibold text-[14px] text-ink">{r.name}</Text>
              <Segmented options={modes} value={r.proactive_mode} onChange={(m) => changeMode(r.id, m)} />
            </View>
          ))
        )}
      </Card>
      <Muted className="mt-2 px-1 text-[12px] leading-[17px]">
        {t('proactive.rules', { from: formatHour(quiet[0]), to: formatHour(quiet[1]) })}
      </Muted>

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
    </>
  );
}
