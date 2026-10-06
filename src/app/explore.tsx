import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Button, Muted, SearchField, Tag, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabaseConfig';
import { useAuth } from '@/lib/auth';
import { PRESETS, voiceById } from '@/lib/character/catalog';
import { presetPortrait } from '@/lib/character/media';
import { useI18n } from '@/lib/i18n';
import { traitById } from '@/lib/roleplay';

type Filter = 'all' | 'female' | 'male';

/**
 * EXPLORAR — biblioteca de personajes (como la de voces de ElevenLabs):
 * búsqueda, filtros, etiquetas de personalidad y muestra de voz de cada uno.
 * Sin cuenta: la cuenta solo se pide al empezar la historia.
 */
export default function ExploreScreen() {
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [trait, setTrait] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setPlaying] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  // Solo cuenta como sonando mientras el reproductor suena de verdad.
  const playing = status.playing ? selected : null;

  const maxW = 1120;
  const pad = width >= 900 ? 32 : 16;
  const content = Math.min(width, maxW) - pad * 2;
  const cols = content >= 960 ? 5 : content >= 700 ? 4 : content >= 480 ? 3 : 2;
  const gap = 14;
  const card = (content - (cols - 1) * gap) / cols;

  // Rasgos presentes en la biblioteca (para filtrar).
  const traitIds = useMemo(() => [...new Set(PRESETS.flatMap((p) => p.traits))].slice(0, 12), []);
  const q = query.trim().toLowerCase();
  const list = PRESETS.filter((p) => filter === 'all' || p.gender === filter)
    .filter((p) => !trait || p.traits.includes(trait))
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.tagline[language].toLowerCase().includes(q) || p.traits.some((id) => traitById(id)?.label[language].toLowerCase().includes(q)));

  const listen = async (id: string, voiceId: string | null) => {
    if (playing === id) {
      player.pause();
      setPlaying(null);
      return;
    }
    if (!voiceId) return;
    setLoadingVoice(id);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ voiceId, lang: language }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        player.replace({ uri: data.url });
        player.play();
        setPlaying(id);
      }
    } finally {
      setLoadingVoice(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="border-b border-line bg-paper">
        <View className="h-14 w-full flex-row items-center justify-between self-center" style={{ maxWidth: maxW, paddingHorizontal: pad }}>
          <Pressable onPress={() => router.push(session ? '/(tabs)' : '/explore')} accessibilityRole="link">
            <Logo size={24} withName />
          </Pressable>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {session ? null : <Button size="sm" variant="ghost" title={t('login.signIn')} onPress={() => router.push('/login')} />}
            <Button size="sm" variant={session ? 'secondary' : 'primary'} title={session ? t('explore.myStories') : t('explore.createOwn')} onPress={() => router.push(session ? '/(tabs)' : '/avatar/create')} />
          </View>
        </View>
      </View>
      <ScrollView contentContainerClassName="pb-16" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="w-full self-center" style={{ maxWidth: maxW, paddingHorizontal: pad }}>
          <View className="flex-row flex-wrap items-end justify-between pb-5 pt-8" style={{ gap: 16 }}>
            <View style={{ flex: 1, minWidth: 260, maxWidth: 620 }}>
              <Title className="text-[26px] leading-[32px] tracking-tightest">{t('explore.library')}</Title>
              <Muted className="mt-1.5">{t('explore.subtitle')}</Muted>
            </View>
            <Button title={t('explore.createOwn')} icon="add" onPress={() => router.push('/avatar/create')} />
          </View>

          {/* Búsqueda y filtros */}
          <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
            <View style={{ flexGrow: 1, minWidth: 220, maxWidth: 420 }}>
              <SearchField value={query} onChangeText={setQuery} placeholder={t('explore.search')} />
            </View>
            <View className="flex-row">
              {(['all', 'female', 'male'] as Filter[]).map((f) => (
                <Tag key={f} label={t(`explore.${f}`)} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 mt-1" contentContainerStyle={{ paddingRight: 8 }}>
            {traitIds.map((id) => (
              <Tag key={id} label={traitById(id)?.label[language] ?? id} selected={trait === id} onPress={() => setTrait(trait === id ? null : id)} />
            ))}
          </ScrollView>

          {list.length ? (
            <View className="flex-row flex-wrap" style={{ gap }}>
              {list.map((p) => {
                const voice = voiceById(p.look.voice.id);
                return (
                  <View key={p.id} style={{ width: card }}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/avatar/create', params: { preset: p.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={p.name}
                      className="active:opacity-90"
                      style={{ cursor: 'pointer' } as object}
                    >
                      <View className="overflow-hidden rounded-xl border border-line bg-subtle">
                        <Image source={presetPortrait(p.id)} style={{ width: card - 2, height: (card - 2) * 1.25 }} contentFit="cover" transition={200} />
                      </View>
                    </Pressable>
                    <View className="flex-row items-start pt-2.5">
                      <View className="mr-2 flex-1">
                        <Text className="font-semibold text-[14px] tracking-tight text-ink" numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text className="mt-0.5 text-[12px] leading-[17px] text-muted" numberOfLines={2}>
                          {p.tagline[language]}
                        </Text>
                      </View>
                      {voice ? (
                        <Pressable
                          onPress={() => listen(p.id, voice.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('explore.listen')} · ${voice.name}`}
                          className="h-8 w-8 items-center justify-center rounded-full border border-line bg-paper active:bg-subtle"
                          style={{ cursor: 'pointer' } as object}
                        >
                          {loadingVoice === p.id ? (
                            <ActivityIndicator size="small" color={colors.ink} />
                          ) : (
                            <Ionicons name={playing === p.id ? 'pause' : 'play'} size={13} color={colors.ink} style={{ marginLeft: playing === p.id ? 0 : 2 }} />
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                    <View className="mt-2 flex-row flex-wrap" style={{ gap: 4 }}>
                      {p.traits.slice(0, 3).map((id) => (
                        <View key={id} className="h-5 justify-center rounded-md bg-subtle px-1.5">
                          <Text className="text-[11px] text-muted">{traitById(id)?.label[language]}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center rounded-xl border border-dashed border-line py-16">
              <Ionicons name="search-outline" size={20} color={colors.muted} />
              <Muted className="mt-2">{t('explore.noResults')}</Muted>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
