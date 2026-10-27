import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { Button, IconButton, Muted } from './ui';
import { Text } from '@/components/Themed';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_QUIET, formatHour, PROACTIVE_DAILY, type ProactiveMode, setProactiveMode } from '@/lib/proactive';
import { disablePush, enablePush, PUSH_SURFACE, pushState, type PushState } from '@/lib/push';
import { useColors } from '@/lib/theme';

interface Props {
  visible: boolean;
  avatar: (AvatarLike & { id: string; name: string }) | null;
  mode: ProactiveMode;
  onChange: (mode: ProactiveMode) => void;
  onClose: () => void;
}

/**
 * WP-12: activar que el personaje escriba primero, con una explicación clara de qué hace,
 * sus límites y los avisos de este dispositivo. Apagado por defecto.
 */
export function ProactiveSheet({ visible, avatar, mode, onChange, onClose }: Props) {
  const { t } = useI18n();
  const colors = useColors();
  const { profile, isGuest, session } = useAuth();
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const name = avatar?.name ?? '';
  const isPro = !!profile?.is_pro;
  const from = formatHour(profile?.quiet_start ?? DEFAULT_QUIET.start);
  const to = formatHour(profile?.quiet_end ?? DEFAULT_QUIET.end);

  useEffect(() => {
    if (visible) pushState().then(setPush, () => setPush('unsupported'));
  }, [visible]);

  const choose = async (next: ProactiveMode) => {
    if (!avatar || next === mode) return;
    const prev = mode;
    onChange(next);
    // Al encenderlo por primera vez, pedimos los avisos ya, dentro del toque (Safari y Firefox lo exigen).
    const asking = next !== 'off' && push === 'off' && session ? enablePush().catch(() => 'off' as const) : null;
    try {
      await setProactiveMode(avatar.id, next);
      track('proactive_set', { mode: next });
    } catch {
      onChange(prev);
      showDialog(t('common.error'), t('chat.errorServer'));
      // no se guardó: los avisos pedidos en este toque no se quedan activados
      if (asking && (await asking) === 'on') setPush(await disablePush().catch(() => 'off' as const));
      return;
    }
    if (asking) setPush(await asking);
  };

  const togglePush = async () => {
    if (!session) return;
    setBusy(true);
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush());
    } catch {
      showDialog(t('common.error'), t('billing.offline'));
    } finally {
      setBusy(false);
    }
  };

  const options: { id: ProactiveMode; label: string; hint: string }[] = [
    { id: 'off', label: t('proactive.off'), hint: t('proactive.offHint') },
    { id: 'sometimes', label: t('proactive.sometimes'), hint: t('proactive.sometimesHint') },
    { id: 'often', label: t('proactive.often'), hint: t('proactive.oftenHint', { n: isPro ? PROACTIVE_DAILY.pro : PROACTIVE_DAILY.free }) },
  ];
  const pushText = {
    on: t('proactive.pushOn'),
    off: t('proactive.pushOff'),
    denied: PUSH_SURFACE === 'browser' ? t('proactive.pushDenied') : t('proactive.pushDeniedDevice'),
    unsupported: PUSH_SURFACE === 'browser' ? t('proactive.pushUnsupported') : t('proactive.pushUnsupportedDevice'),
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} className="flex-1 justify-end bg-black/40 sm:items-center sm:justify-center">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel={t('common.close')} />
        <Animated.View entering={SlideInDown.duration(240)} className="w-full self-center rounded-t-3xl border border-line bg-paper px-5 pb-8 pt-5 sm:rounded-3xl" style={{ maxWidth: 440 }}>
          <View className="flex-row items-center">
            {avatar ? <AnimatedAvatar avatar={avatar} size={40} presence="idle" /> : null}
            <Text className="ml-3 flex-1 font-semibold text-[19px] leading-[25px] tracking-tighter text-ink">{t('proactive.title', { name })}</Text>
            <IconButton icon="close" size={34} label={t('common.close')} onPress={onClose} />
          </View>
          <Muted className="mt-3 text-[14px] leading-[20px]">{t('proactive.body', { name })}</Muted>

          {isGuest ? (
            <Text className="mt-4 rounded-2xl border border-line px-4 py-3 text-[14px] leading-[20px] text-ink">{t('proactive.needsAccount')}</Text>
          ) : (
            <>
              <View className="mt-4 overflow-hidden rounded-2xl border border-line" accessibilityRole="radiogroup">
                {options.map((o, i) => {
                  const on = o.id === mode;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => choose(o.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={o.label}
                      className={`flex-row items-center px-4 py-3 active:bg-subtle ${i ? 'border-t border-line' : ''}`}
                    >
                      <View className="flex-1">
                        <Text className={`text-[15px] ${on ? 'font-semibold text-ink' : 'text-ink'}`}>{o.label}</Text>
                        <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">{o.hint}</Text>
                      </View>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.muted} />
                    </Pressable>
                  );
                })}
              </View>
              <Muted className="mt-3 text-[12px] leading-[17px]">{t('proactive.rules', { from, to })}</Muted>

              {push ? (
                <View className="mt-4 flex-row items-center rounded-2xl border border-line px-4 py-3">
                  <Ionicons name={push === 'on' ? 'notifications' : 'notifications-outline'} size={18} color={colors.ink} />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-[14px] text-ink">{t('proactive.push')}</Text>
                    <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">{pushText[push]}</Text>
                  </View>
                  {push === 'on' || push === 'off' ? (
                    <Button size="sm" variant={push === 'on' ? 'ghost' : 'secondary'} title={push === 'on' ? t('proactive.pushDisable') : t('proactive.pushEnable')} loading={busy} onPress={togglePush} />
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
