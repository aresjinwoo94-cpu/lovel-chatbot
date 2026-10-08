import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from './AnimatedAvatar';
import { Logo } from './Logo';
import { Text } from './Themed';
import { Button, Menu, Meter } from './ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { FREE_TEXT_LIMIT, FREE_VOICE_LIMIT } from '@/lib/billing';
import { useI18n } from '@/lib/i18n';
import { useThreads } from '@/lib/threads';

type IconName = ComponentProps<typeof Ionicons>['name'];

function NavItem({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      className={`mb-0.5 h-9 flex-row items-center rounded-lg px-2.5 ${active ? 'bg-subtle' : 'active:bg-subtle'}`}
      style={{ cursor: 'pointer' } as object}
    >
      <Ionicons name={active ? (icon.replace('-outline', '') as IconName) : icon} size={17} color={active ? colors.ink : colors.muted} />
      <Text className={`ml-2.5 text-[14px] ${active ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * Barra lateral de escritorio (estilo ElevenLabs): marca, crear, navegación,
 * personajes recientes y, abajo, el uso del plan con el botón de mejorar y la cuenta.
 */
export function AppSidebar({ active, activeChat }: { active?: 'index' | 'profile' | 'settings'; activeChat?: string }) {
  const { t } = useI18n();
  const { profile, session, signOut, isGuest } = useAuth();
  const { threads } = useThreads();
  const route = active;
  const go = (name: 'index' | 'profile' | 'settings') => router.navigate(name === 'index' ? '/(tabs)' : `/(tabs)/${name}`);
  const isPro = !!profile?.is_pro;
  const email = session?.user.email ?? '';
  const display = isGuest ? t('nav.guest') : profile?.display_name || email.split('@')[0];

  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} className="border-r border-line bg-cream" style={{ width: 248 }}>
      <View className="h-14 flex-row items-center px-4">
        <Logo size={24} withName />
      </View>
      <View className="px-3 pb-3">
        <Button title={t('nav.new')} icon="add" size="sm" variant="primary" onPress={() => router.push('/explore')} />
      </View>
      <View className="px-3">
        <NavItem icon="home-outline" label={t('nav.home')} active={route === 'index'} onPress={() => go('index')} />
        <NavItem icon="compass-outline" label={t('nav.explore')} onPress={() => router.push('/explore')} />
        <NavItem icon="person-outline" label={t('tabs.profile')} active={route === 'profile'} onPress={() => go('profile')} />
        <NavItem icon="settings-outline" label={t('tabs.settings')} active={route === 'settings'} onPress={() => go('settings')} />
      </View>

      <Text className="mb-1 mt-5 px-5 font-medium text-[12px] text-muted">{t('nav.recent')}</Text>
      <ScrollView className="flex-1 px-3">
        {threads.slice(0, 12).map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push({ pathname: '/chat/[avatarId]', params: { avatarId: a.id } })}
            className={`mb-0.5 h-9 flex-row items-center rounded-lg px-2 ${activeChat === a.id ? 'bg-subtle' : 'active:bg-subtle'}`}
            style={{ cursor: 'pointer' } as object}
          >
            <AnimatedAvatar avatar={a} size={22} />
            <Text className={`ml-2.5 flex-1 text-[13px] text-ink ${activeChat === a.id ? 'font-semibold' : ''}`} numberOfLines={1}>
              {a.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Invitado: guardar su historia. Con cuenta: uso del plan (como los créditos de ElevenLabs). */}
      {isGuest ? (
        <View className="mx-3 mb-2 rounded-xl border border-line bg-paper p-3">
          <Text className="font-semibold text-[13px] text-ink">{t('login.guestTitle')}</Text>
          <Text className="mt-1 text-[12px] leading-[17px] text-muted">{t('login.guestBody')}</Text>
          <Button title={t('chat.guestCta')} size="sm" onPress={() => router.push('/login')} className="mt-2.5" />
        </View>
      ) : null}
      <View className="mx-3 mb-2 rounded-xl border border-line bg-paper p-3" style={isGuest ? { display: 'none' } : undefined}>
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-[13px] text-ink">{isPro ? t('nav.plan.pro') : t('nav.plan.free')}</Text>
          {isPro ? <Text className="text-[12px] text-muted">{t('nav.unlimited')}</Text> : null}
        </View>
        {!isPro && profile ? (
          <View className="mt-2.5" style={{ gap: 8 }}>
            <View>
              <View className="mb-1 flex-row justify-between">
                <Text className="text-[12px] text-muted">{t('nav.messages')}</Text>
                <Text className="text-[12px] text-muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {Math.min(profile.free_messages_used ?? 0, FREE_TEXT_LIMIT)}/{FREE_TEXT_LIMIT}
                </Text>
              </View>
              <Meter value={profile.free_messages_used ?? 0} max={FREE_TEXT_LIMIT} />
            </View>
            <View>
              <View className="mb-1 flex-row justify-between">
                <Text className="text-[12px] text-muted">{t('nav.voice')}</Text>
                <Text className="text-[12px] text-muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {Math.min(profile.free_voice_used ?? 0, FREE_VOICE_LIMIT)}/{FREE_VOICE_LIMIT}
                </Text>
              </View>
              <Meter value={profile.free_voice_used ?? 0} max={FREE_VOICE_LIMIT} />
            </View>
            <Button title={t('nav.upgrade')} size="sm" variant="brand" onPress={() => router.push('/pro')} className="mt-1" />
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center border-t border-line px-3 py-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
          <Text className="font-semibold text-[13px] text-primary-deep">{(display || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View className="ml-2.5 flex-1">
          <Text className="font-semibold text-[13px] text-ink" numberOfLines={1}>
            {display}
          </Text>
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Menu
          label={t('tabs.profile')}
          align="left"
          items={[
            { label: t('tabs.profile'), icon: 'person-outline', onPress: () => go('profile') },
            { label: t('tabs.settings'), icon: 'settings-outline', onPress: () => go('settings') },
            { label: t('profile.signOut'), icon: 'log-out-outline', danger: true, onPress: () => signOut() },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}
