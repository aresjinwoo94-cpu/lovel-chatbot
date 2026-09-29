import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar, type AvatarMood } from '@/components/AnimatedAvatar';
import { ChatBubble } from '@/components/ChatBubble';
import { PaywallModal } from '@/components/PaywallModal';
import { Text, TextInput } from '@/components/Themed';
import { TypingIndicator } from '@/components/TypingIndicator';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { colors } from '@/constants/theme';
import { callFunction, isPaywall } from '@/lib/api';
import { base64ToPlayableUri, readRecording } from '@/lib/audio';
import { useAuth } from '@/lib/auth';
import { FREE_TEXT_LIMIT, FREE_VOICE_LIMIT } from '@/lib/billing';
import { fetchAvatar, fetchMessages, PAGE_SIZE, startChat } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { exportConversation } from '@/lib/exportConversation';
import { useI18n } from '@/lib/i18n';
import { fillName, scenarioById } from '@/lib/roleplay';
import type { Avatar, ChatResponse, Message, QuotaState, VoiceChatResponse } from '@/lib/types';

/**
 * CHAT — la historia con tu personaje.
 * El personaje abre la escena con el primer mensaje. Tus mensajes van a la
 * derecha; los suyos a la izquierda, con su foto y su nombre.
 */
export default function ChatScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const { t, language } = useI18n();
  const { profile, refreshProfile } = useAuth();

  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // del más nuevo al más viejo
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openingFailed, setOpeningFailed] = useState(false);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);

  const [mood, setMood] = useState<AvatarMood>('idle');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [localAudio, setLocalAudio] = useState<Record<string, string>>({});
  const [autoPlayId, setAutoPlayId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [paywall, setPaywall] = useState<null | 'text' | 'voice' | 'info'>(null);
  const [override, setQuota] = useState<QuotaState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const openingRequested = useRef(false);

  // Cupo gratuito: el perfil (servidor, en vivo) + lo último que devolvió una respuesta.
  const quota = useMemo<QuotaState | null>(() => {
    const fromProfile: QuotaState | null = profile
      ? {
          isPro: profile.is_pro,
          textUsed: profile.free_messages_used ?? 0,
          textLimit: FREE_TEXT_LIMIT,
          voiceUsed: profile.free_voice_used ?? 0,
          voiceLimit: FREE_VOICE_LIMIT,
        }
      : null;
    if (!override || !fromProfile) return override ?? fromProfile;
    return {
      ...fromProfile,
      isPro: override.isPro || fromProfile.isPro,
      textUsed: Math.max(override.textUsed, fromProfile.textUsed),
      voiceUsed: Math.max(override.voiceUsed, fromProfile.voiceUsed),
    };
  }, [profile, override]);
  const isPro = quota?.isPro ?? false;
  const textLeft = quota ? Math.max(0, quota.textLimit - quota.textUsed) : FREE_TEXT_LIMIT;
  const voiceLeft = quota ? Math.max(0, quota.voiceLimit - quota.voiceUsed) : FREE_VOICE_LIMIT;

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  // ---------------------------------------------------------------- primer mensaje del personaje
  const openScene = useCallback(async (id: string) => {
    setOpening(true);
    setOpeningFailed(false);
    setMood('thinking');
    try {
      const res = await startChat(id);
      if (res.message) setMessages((prev) => (prev.length ? prev : [res.message as Message]));
      else setMessages(await fetchMessages(id));
      setMood('speaking');
      later(() => setMood('idle'), 2400);
    } catch {
      setOpeningFailed(true);
      setMood('idle');
    } finally {
      setOpening(false);
    }
  }, []);

  // ---------------------------------------------------------------- carga
  useEffect(() => {
    if (!avatarId) return;
    (async () => {
      try {
        const [a, msgs] = await Promise.all([fetchAvatar(avatarId), fetchMessages(avatarId)]);
        setAvatar(a);
        setMessages(msgs);
        setHasMore(msgs.length === PAGE_SIZE);
        if (msgs.length === 0 && !openingRequested.current) {
          openingRequested.current = true;
          openScene(avatarId);
        }
      } catch (e) {
        showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
        router.replace('/');
      } finally {
        setLoading(false);
      }
    })();
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [avatarId, t, openScene]);

  const loadOlder = useCallback(async () => {
    if (!avatarId || loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const older = await fetchMessages(avatarId, messages[messages.length - 1].created_at);
      setMessages((prev) => [...prev, ...older]);
      setHasMore(older.length === PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [avatarId, loadingOlder, hasMore, messages]);

  const applyQuota = (q: QuotaState, kind: 'text' | 'voice') => {
    setQuota(q);
    refreshProfile();
    if (q.isPro) return;
    const out = kind === 'text' ? q.textUsed >= q.textLimit : q.voiceUsed >= q.voiceLimit;
    if (out) later(() => setPaywall(kind), 1600);
  };

  const onAvatarSpeaking = useCallback((id: string, speaking: boolean) => {
    setSpeakingId(speaking ? id : null);
    setMood(speaking ? 'speaking' : 'idle');
  }, []);

  const tempMessage = (kind: 'text' | 'voice', content: string, durationMs?: number): Message => ({
    id: `temp-${Date.now()}`,
    conversation_id: '',
    avatar_id: avatarId!,
    user_id: '',
    role: 'user',
    kind,
    content,
    audio_path: null,
    audio_duration_ms: durationMs ?? null,
    created_at: new Date().toISOString(),
  });

  const flash = (msg: string) => {
    setNotice(msg);
    later(() => setNotice(null), 4500);
  };

  // ---------------------------------------------------------------- enviar texto
  const sendText = async () => {
    const body = text.trim();
    if (!body || !avatarId || typing || opening) return;
    if (!isPro && textLeft <= 0) return setPaywall('text');
    const temp = tempMessage('text', body);
    setMessages((prev) => [temp, ...prev]);
    setText('');
    setTyping(true);
    setMood('thinking');
    try {
      const res = await callFunction<ChatResponse>('chat', { avatarId, text: body });
      setMessages((prev) => [res.avatarMessage, res.userMessage, ...prev.filter((m) => m.id !== temp.id)]);
      setMood('speaking');
      later(() => setMood('happy'), 1600);
      later(() => setMood('idle'), 3200);
      applyQuota(res.quota, 'text');
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      setMood('idle');
      if (isPaywall(e)) {
        if (quota) setQuota({ ...quota, textUsed: quota.textLimit });
        setPaywall('text');
      } else showDialog(t('chat.errorSend'), e instanceof Error ? e.message : undefined);
    } finally {
      setTyping(false);
    }
  };

  // ---------------------------------------------------------------- enviar voz
  const openRecorder = () => {
    if (!isPro && voiceLeft <= 0) return setPaywall('voice');
    setRecording(true);
  };

  const sendVoice = async (uri: string, durationMs: number) => {
    setRecording(false);
    if (!avatarId) return;
    const temp = tempMessage('voice', '', durationMs);
    setLocalAudio((prev) => ({ ...prev, [temp.id]: uri }));
    setMessages((prev) => [temp, ...prev]);
    setListening(true);
    setMood('thinking');
    try {
      const { base64, mimeType } = await readRecording(uri);
      const res = await callFunction<VoiceChatResponse>('voice-chat', { avatarId, audioBase64: base64, mimeType, durationMs });
      const audio: Record<string, string> = { [res.userMessage.id]: uri };
      if (res.replyAudioBase64) {
        audio[res.avatarMessage.id] = await base64ToPlayableUri(res.replyAudioBase64, res.avatarMessage.id);
        setAutoPlayId(res.avatarMessage.id);
      } else {
        flash(t('chat.textFallback', { name: avatar?.name ?? '' }));
        setMood('happy');
        later(() => setMood('idle'), 2000);
      }
      setLocalAudio((prev) => ({ ...prev, ...audio }));
      setMessages((prev) => [res.avatarMessage, res.userMessage, ...prev.filter((m) => m.id !== temp.id)]);
      applyQuota(res.quota, 'voice');
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setMood('idle');
      if (isPaywall(e)) {
        if (quota) setQuota({ ...quota, voiceUsed: quota.voiceLimit });
        setPaywall('voice');
      } else showDialog(t('chat.errorSend'), e instanceof Error ? e.message : undefined);
    } finally {
      setListening(false);
    }
  };

  // ---------------------------------------------------------------- exportar
  const onExport = () => {
    if (!avatar) return;
    const run = (format: 'html' | 'txt') => exportConversation(avatar, format, t).catch((e) => showDialog(t('common.error'), String(e)));
    showDialog(t('export.title'), undefined, [
      { text: t('export.html'), onPress: () => run('html') },
      { text: t('export.txt'), onPress: () => run('txt') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  if (loading || !avatar) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const busy = typing || opening;
  const status = busy ? t('chat.typing') : listening ? t('chat.listening') : t('chat.online');
  const scenario = scenarioById(avatar.scenario_id);
  const sceneText = scenario ? fillName(scenario.setup[language], avatar.name) : avatar.situation_description;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      {/* ------------------------------------------------ Encabezado: el personaje, presente */}
      <View className="border-b border-line bg-paper">
        <View className="w-full flex-row items-center self-center px-3 pb-2.5 pt-1.5" style={{ maxWidth: 760 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityLabel={t('common.back')} className="mr-1">
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <AnimatedAvatar avatar={avatar} size={48} ring mood={mood} />
          <View className="ml-3 flex-1">
            <Text className="font-serif text-[22px] leading-7 text-ink" numberOfLines={1}>
              {avatar.name}
            </Text>
            <View className="flex-row items-center">
              {!busy && !listening ? <View className="mr-1.5 h-2 w-2 rounded-full bg-success" /> : null}
              <Text className={`text-xs ${busy || listening ? 'text-primary' : 'text-success'}`}>{status}</Text>
            </View>
          </View>
          <Pressable onPress={onExport} hitSlop={10} className="p-1" accessibilityLabel={t('chat.export')}>
            <Ionicons name="share-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ------------------------------------------------ Mensajes */}
        <FlatList
          className="flex-1"
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingVertical: 10, width: '100%', maxWidth: 760, alignSelf: 'center' }}
          renderItem={({ item, index }) => {
            const newer = messages[index - 1];
            const older = messages[index + 1];
            return (
              <ChatBubble
                message={item}
                avatar={avatar}
                showAvatar={item.role === 'avatar' && newer?.role !== 'avatar'}
                showName={item.role === 'avatar' && older?.role !== 'avatar'}
                speaking={speakingId === item.id}
                pending={item.id.startsWith('temp-')}
                localAudioUri={localAudio[item.id]}
                autoPlay={item.id === autoPlayId}
                onSpeakingChange={(s) => onAvatarSpeaking(item.id, s)}
              />
            );
          }}
          ListHeaderComponent={busy || listening ? <TypingIndicator avatar={avatar} /> : null}
          ListFooterComponent={
            <View className="px-5 pb-3 pt-2">
              {loadingOlder ? <ActivityIndicator color={colors.muted} /> : null}
              {!hasMore || messages.length === 0 ? (
                <View className="items-center">
                  <View className="w-full max-w-[520px] rounded-3xl border border-line bg-paper p-4">
                    <Text className="font-semibold text-[11px] uppercase tracking-widest text-primary">
                      {scenario ? `${scenario.emoji}  ` : ''}
                      {t('chat.situation')}
                    </Text>
                    {scenario ? <Text className="mt-1 font-bold text-base text-ink">{scenario.title[language]}</Text> : null}
                    <Text className="mt-1 font-serif text-[16px] leading-6 text-ink">{sceneText}</Text>
                  </View>
                  {openingFailed ? (
                    <Pressable onPress={() => openScene(avatar.id)} className="mt-3 flex-row items-center rounded-full bg-primary-soft px-4 py-2">
                      <Ionicons name="refresh" size={16} color={colors.primaryDeep} />
                      <Text className="ml-2 font-semibold text-sm text-primary-deep">
                        {t('chat.openingError')} {t('common.retry')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
        />

        {notice ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} className="items-center px-4 pb-1">
            <Text className="rounded-full bg-primary-soft px-3 py-1 text-center text-xs text-primary-deep">{notice}</Text>
          </Animated.View>
        ) : null}

        {/* ------------------------------------------------ Barra de escritura / voz */}
        {recording ? (
          <VoiceRecorder
            avatar={avatar}
            voiceLeft={isPro ? null : voiceLeft}
            onSend={sendVoice}
            onClose={() => {
              setRecording(false);
              setMood('idle');
            }}
            onPreviewPlaying={(playing) => setMood(playing ? 'speaking' : 'idle')}
          />
        ) : (
          <SafeAreaView edges={['bottom']} className="border-t border-line bg-paper">
            <View className="w-full self-center" style={{ maxWidth: 760 }}>
              <Pressable onPress={() => setPaywall(isPro ? null : 'info')} disabled={isPro}>
                <Text className={`pt-1.5 text-center text-[11px] ${!isPro && (textLeft === 0 || voiceLeft === 0) ? 'text-primary' : 'text-muted'}`}>
                  {isPro
                    ? t('chat.proUnlimited')
                    : textLeft === 0
                      ? t('chat.freeTextOut', { n: FREE_TEXT_LIMIT })
                      : t('chat.free', { text: textLeft, voice: voiceLeft })}
                </Text>
              </Pressable>
              <View className="flex-row items-end px-3 py-2">
                <View className="mr-2 min-h-[48px] flex-1 justify-center rounded-3xl border border-line bg-cream px-4 py-2">
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder={t('chat.placeholder')}
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={4000}
                    className="max-h-32 text-base text-ink"
                    onSubmitEditing={sendText}
                    submitBehavior="submit"
                    returnKeyType="send"
                  />
                </View>
                {text.trim() ? (
                  <Pressable
                    onPress={sendText}
                    disabled={busy}
                    accessibilityLabel={t('voice.send')}
                    className={`h-12 w-12 items-center justify-center rounded-full bg-primary ${busy ? 'opacity-50' : 'active:opacity-80'}`}
                  >
                    <Ionicons name="send" size={20} color={colors.paper} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={openRecorder}
                    disabled={listening || opening}
                    accessibilityLabel={t('chat.voiceNote')}
                    className={`h-12 w-12 items-center justify-center rounded-full bg-primary ${listening || opening ? 'opacity-50' : 'active:opacity-80'}`}
                  >
                    <Ionicons name="mic" size={24} color={colors.paper} />
                  </Pressable>
                )}
              </View>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>

      <PaywallModal
        visible={!!paywall}
        avatar={avatar}
        reason={
          paywall === 'text'
            ? t('chat.freeTextOut', { n: FREE_TEXT_LIMIT })
            : paywall === 'voice'
              ? t('chat.freeVoiceOut', { n: FREE_VOICE_LIMIT })
              : t('chat.free', { text: textLeft, voice: voiceLeft })
        }
        onClose={() => setPaywall(null)}
        onUpgraded={() => {
          setPaywall(null);
          refreshProfile();
          if (quota) setQuota({ ...quota, isPro: true });
        }}
      />
    </SafeAreaView>
  );
}
