import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { AppSidebar } from '@/components/AppSidebar';
import { ChatBubble } from '@/components/ChatBubble';
import { PaywallModal } from '@/components/PaywallModal';
import { PresencePill } from '@/components/PresencePill';
import { Text, TextInput } from '@/components/Themed';
import { TypingIndicator } from '@/components/TypingIndicator';
import { Button, IconButton } from '@/components/ui';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { VrmAvatar } from '@/components/VrmAvatar';
import { colors } from '@/constants/theme';
import { ApiError, callFunction, isPaywall } from '@/lib/api';
import { base64ToPlayableUri, readRecording } from '@/lib/audio';
import { useAuth } from '@/lib/auth';
import { FREE_TEXT_LIMIT, FREE_VOICE_LIMIT, GUEST_TEXT_LIMIT, GUEST_VOICE_LIMIT } from '@/lib/billing';
import { DARK_BACKGROUNDS, normalizeLook } from '@/lib/character/catalog';
import type { Presence } from '@/lib/character/types';
import { fetchAvatar, fetchMessages, PAGE_SIZE, startChat } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { exportConversation } from '@/lib/exportConversation';
import { useI18n } from '@/lib/i18n';
import { fillName, scenarioById } from '@/lib/roleplay';
import type { Avatar, ChatResponse, Message, QuotaState, VoiceChatResponse } from '@/lib/types';

/** Cuánto "habla" el personaje tras un mensaje de texto (aprox. velocidad de lectura en voz alta). */
const speakMs = (text: string) => Math.max(1400, Math.min(6000, 900 + text.length * 32));

/**
 * CHAT — la historia con tu personaje.
 * El personaje (3D en vivo) es el protagonista: arriba en móvil, en un panel
 * lateral en escritorio. Estados visibles: escribiendo, escuchando, hablando.
 * Tus mensajes a la derecha; los suyos a la izquierda, con su foto y su nombre.
 */
export default function ChatScreen() {
  const { avatarId, intro } = useLocalSearchParams<{ avatarId: string; intro?: string }>();
  const { t, language } = useI18n();
  const { profile, refreshProfile, isGuest } = useAuth();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const withSidebar = width >= 1180;

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
  const [offline, setOffline] = useState(false);
  /** Personaje replegado a mano (botón) o, en móvil, mientras escribes (vuelve al cerrar el teclado). */
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const collapsed = manualCollapsed || (!wide && (inputFocused || keyboardOpen));

  /** Mensaje que el personaje está diciendo ahora (voz sonando o texto recién llegado). */
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [localAudio, setLocalAudio] = useState<Record<string, string>>({});
  const [autoPlayId, setAutoPlayId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [paywall, setPaywall] = useState<null | 'text' | 'voice' | 'info'>(null);
  const [override, setQuota] = useState<QuotaState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingRequested = useRef(false);

  // Cupo gratuito: el perfil (servidor, en vivo) + lo último que devolvió una respuesta.
  const quota = useMemo<QuotaState | null>(() => {
    const fromProfile: QuotaState | null = profile
      ? { isPro: profile.is_pro, textUsed: profile.free_messages_used ?? 0, textLimit: isGuest ? GUEST_TEXT_LIMIT : FREE_TEXT_LIMIT, voiceUsed: profile.free_voice_used ?? 0, voiceLimit: isGuest ? GUEST_VOICE_LIMIT : FREE_VOICE_LIMIT }
      : null;
    if (!override || !fromProfile) return override ?? fromProfile;
    return {
      ...fromProfile,
      isPro: override.isPro || fromProfile.isPro,
      textUsed: Math.max(override.textUsed, fromProfile.textUsed),
      voiceUsed: Math.max(override.voiceUsed, fromProfile.voiceUsed),
    };
  }, [profile, override, isGuest]);
  const isPro = quota?.isPro ?? false;
  const textLeft = quota ? Math.max(0, quota.textLimit - quota.textUsed) : FREE_TEXT_LIMIT;
  const voiceLeft = quota ? Math.max(0, quota.voiceLimit - quota.voiceUsed) : FREE_VOICE_LIMIT;

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  /** El personaje "dice" un mensaje de texto durante un rato (labios + ondas). */
  const speakText = useCallback((m: Message) => {
    if (speakTimer.current) clearTimeout(speakTimer.current);
    setSpeakingId(m.id);
    speakTimer.current = setTimeout(() => setSpeakingId((cur) => (cur === m.id ? null : cur)), speakMs(m.content));
  }, []);

  // Estado único del personaje (3D, foto y texto de estado).
  const presence: Presence = offline
    ? 'offline'
    : voicePlaying || speakingId
      ? 'speaking'
      : typing || opening
        ? 'thinking'
        : listening || recording
          ? 'listening'
          : 'idle';

  // ---------------------------------------------------------------- primer mensaje del personaje
  const openScene = useCallback(
    async (id: string) => {
      setOpening(true);
      setOpeningFailed(false);
      try {
        const res = await startChat(id);
        if (res.message) {
          const m = res.message;
          setMessages((prev) => (prev.length ? prev : [m]));
          speakText(m);
        } else setMessages(await fetchMessages(id));
        setOffline(false);
      } catch (e) {
        setOpeningFailed(true);
        if (e instanceof ApiError && e.status === 0) setOffline(true);
      } finally {
        setOpening(false);
      }
    },
    [speakText],
  );

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
        } else if (msgs.length === 1 && msgs[0].role === 'avatar' && Date.now() - new Date(msgs[0].created_at).getTime() < 90_000) {
          // Recién creado: el personaje "dice" su primer mensaje al abrir el chat.
          speakText(msgs[0]);
        }
      } catch (e) {
        showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
        router.replace('/');
      } finally {
        setLoading(false);
      }
    })();
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      if (speakTimer.current) clearTimeout(speakTimer.current);
    };
  }, [avatarId, t, openScene, speakText]);

  // Móvil: al aparecer el teclado el personaje se repliega para dejar sitio a la conversación.
  useEffect(() => {
    if (wide || Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [wide]);
  const expandStage = () => {
    setManualCollapsed(false);
    Keyboard.dismiss();
    setInputFocused(false);
  };

  // Al volver de «Personalizar», recargamos su aspecto.
  useFocusEffect(
    useCallback(() => {
      if (!avatarId || loading) return;
      fetchAvatar(avatarId).then(setAvatar).catch(() => undefined);
    }, [avatarId, loading]),
  );

  // Primera vez (desde la bienvenida): cómo personalizarlo.
  const [showTip, setShowTip] = useState(intro === '1');

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

  const onVoicePlaying = useCallback((id: string, playing: boolean) => {
    setVoicePlaying(playing);
    setSpeakingId((cur) => (playing ? id : cur === id ? null : cur));
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

  /** Invitado sin cupo: crear cuenta (conserva personaje y conversación). */
  const askAccount = () =>
    showDialog(t('chat.needsAccount'), t('chat.needsAccountBody'), [
      { text: t('chat.guestCta'), onPress: () => router.push({ pathname: '/login', params: { next: `/chat/${avatarId}` } }) },
      { text: t('pro.notNow'), style: 'cancel' },
    ]);

  const failed = (e: unknown, kind: 'text' | 'voice') => {
    if (e instanceof ApiError && e.code === 'NEEDS_ACCOUNT') return askAccount();
    if (isPaywall(e)) {
      if (quota) setQuota(kind === 'text' ? { ...quota, textUsed: quota.textLimit } : { ...quota, voiceUsed: quota.voiceLimit });
      setPaywall(kind);
      return;
    }
    if (e instanceof ApiError && e.status === 0) setOffline(true);
    showDialog(t('chat.errorSend'), e instanceof Error ? e.message : undefined);
  };

  // ---------------------------------------------------------------- enviar texto
  const sendText = async () => {
    const body = text.trim();
    if (!body || !avatarId || typing || opening) return;
    if (!isPro && textLeft <= 0) return isGuest ? askAccount() : setPaywall('text');
    const temp = tempMessage('text', body);
    setMessages((prev) => [temp, ...prev]);
    setText('');
    setTyping(true);
    try {
      const res = await callFunction<ChatResponse>('chat', { avatarId, text: body });
      setMessages((prev) => [res.avatarMessage, res.userMessage, ...prev.filter((m) => m.id !== temp.id)]);
      setOffline(false);
      speakText(res.avatarMessage);
      applyQuota(res.quota, 'text');
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      failed(e, 'text');
    } finally {
      setTyping(false);
    }
  };

  // ---------------------------------------------------------------- enviar voz
  const openRecorder = () => {
    if (!isPro && voiceLeft <= 0) return isGuest ? askAccount() : setPaywall('voice');
    setRecording(true);
  };

  const sendVoice = async (uri: string, durationMs: number) => {
    setRecording(false);
    if (!avatarId) return;
    const temp = tempMessage('voice', '', durationMs);
    setLocalAudio((prev) => ({ ...prev, [temp.id]: uri }));
    setMessages((prev) => [temp, ...prev]);
    setListening(true);
    try {
      const { base64, mimeType } = await readRecording(uri);
      const res = await callFunction<VoiceChatResponse>('voice-chat', { avatarId, audioBase64: base64, mimeType, durationMs });
      const audio: Record<string, string> = { [res.userMessage.id]: uri };
      if (res.replyAudioBase64) {
        audio[res.avatarMessage.id] = await base64ToPlayableUri(res.replyAudioBase64, res.avatarMessage.id);
        setAutoPlayId(res.avatarMessage.id);
      } else {
        flash(t('chat.textFallback', { name: avatar?.name ?? '' }));
        speakText(res.avatarMessage);
      }
      setLocalAudio((prev) => ({ ...prev, ...audio }));
      setMessages((prev) => [res.avatarMessage, res.userMessage, ...prev.filter((m) => m.id !== temp.id)]);
      setOffline(false);
      applyQuota(res.quota, 'voice');
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      failed(e, 'voice');
    } finally {
      setListening(false);
    }
  };

  const onExport = () => {
    if (!avatar) return;
    const run = (format: 'html' | 'txt') => exportConversation(avatar, format, t).catch((e) => showDialog(t('common.error'), String(e)));
    showDialog(t('export.title'), undefined, [
      { text: t('export.html'), onPress: () => run('html') },
      { text: t('export.txt'), onPress: () => run('txt') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const look = useMemo(() => (avatar ? normalizeLook(avatar.appearance, avatar.gender) : null), [avatar]);

  if (loading || !avatar || !look) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const busy = typing || opening;
  const scenario = scenarioById(avatar.scenario_id);
  const sceneText = scenario ? fillName(scenario.setup[language], avatar.name) : avatar.situation_description;
  const darkStage = DARK_BACKGROUNDS.includes(look.background);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const customize = () => {
    setShowTip(false);
    router.push({ pathname: '/avatar/create', params: { edit: avatar.id } });
  };

  // ------------------------------------------------ escenario del personaje
  const stageH = Math.round(Math.min(height * 0.36, 300));
  const stage = (
    <View className={wide ? 'flex-1' : ''} style={wide ? undefined : { height: stageH }}>
      <VrmAvatar look={look} gender={avatar.gender} presence={presence} framing={wide ? 'portrait' : 'bust'} style={{ flex: 1 }} />
      {/* Nombre y estado sobre el escenario */}
      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 flex-row items-end justify-between px-4 pb-3">
        <View className={`rounded-xl px-3 py-2 ${darkStage ? 'bg-black/40' : 'bg-paper/90'}`}>
          <Text className={`font-semibold text-[17px] leading-[22px] tracking-tighter ${darkStage ? 'text-paper' : 'text-ink'}`}>{avatar.name}</Text>
          <PresencePill presence={presence} onDark={darkStage} />
        </View>
        {!wide ? <IconButton icon="chevron-up" variant="outline" size={34} label={t('chat.collapse')} onPress={() => setManualCollapsed(true)} /> : null}
      </View>
      {/* Personalizar: aspecto, voz e identidad */}
      <View pointerEvents="box-none" className={`absolute ${wide ? 'right-3 top-3' : 'right-14 top-2'}`}>
        <Pressable
          onPress={customize}
          accessibilityRole="button"
          accessibilityLabel={t('chat.customize')}
          className="h-9 flex-row items-center rounded-full border border-line bg-paper px-3.5 active:bg-subtle"
          style={{ cursor: 'pointer' } as object}
        >
          <Ionicons name="color-palette-outline" size={16} color={colors.ink} />
          <Text className="ml-1.5 font-semibold text-[13px] text-ink">{t('chat.customize')}</Text>
        </Pressable>
      </View>
    </View>
  );

  const guestBar =
    isGuest || showTip ? (
      <View className="border-b border-line bg-subtle px-4 py-2">
        <View className="w-full flex-row items-center self-center" style={{ maxWidth: 760, gap: 10 }}>
          <Ionicons name={isGuest ? 'bookmark-outline' : 'color-palette-outline'} size={15} color={colors.ink} />
          <Text className="flex-1 text-[12px] leading-[17px] text-ink">{isGuest ? t('chat.guest') : t('chat.customizeTip')}</Text>
          {isGuest ? (
            <Button size="sm" title={t('chat.guestCta')} onPress={() => router.push({ pathname: '/login', params: { next: `/chat/${avatar.id}` } })} />
          ) : (
            <IconButton icon="close" size={28} label={t('pro.notNow')} onPress={() => setShowTip(false)} />
          )}
        </View>
      </View>
    ) : null;

  // ------------------------------------------------ cabecera compacta (móvil replegado)
  const compactHeader = (
    <View className="h-14 flex-row items-center border-b border-line bg-paper px-2">
      <IconButton icon="chevron-back" label={t('common.back')} onPress={goBack} />
      <AnimatedAvatar avatar={avatar} size={36} presence={presence} />
      <View className="ml-2.5 flex-1">
        <Text className="font-semibold text-[15px] tracking-tight text-ink" numberOfLines={1}>
          {avatar.name}
        </Text>
        <PresencePill presence={presence} />
      </View>
      <IconButton icon="share-outline" label={t('chat.export')} onPress={onExport} />
      <IconButton icon="chevron-down" label={t('chat.expand')} onPress={expandStage} />
    </View>
  );

  const quotaLine = (
    <Pressable onPress={() => setPaywall(isPro ? null : 'info')} disabled={isPro}>
      <Text className={`pb-1 text-center text-[11px] ${!isPro && (textLeft === 0 || voiceLeft === 0) ? 'text-primary' : 'text-muted'}`}>
        {isPro ? t('chat.proUnlimited') : textLeft === 0 ? t('chat.freeTextOut', { n: FREE_TEXT_LIMIT }) : t('chat.free', { text: textLeft, voice: voiceLeft })}
      </Text>
    </Pressable>
  );

  // ------------------------------------------------ conversación
  const conversation = (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {guestBar}
      <FlatList
        className="flex-1"
        data={messages}
        inverted
        keyExtractor={(m) => m.id}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingVertical: 12, width: '100%', maxWidth: 760, alignSelf: 'center' }}
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
              onSpeakingChange={(s) => onVoicePlaying(item.id, s)}
            />
          );
        }}
        ListHeaderComponent={busy || listening ? <TypingIndicator avatar={avatar} listening={listening} /> : null}
        ListFooterComponent={
          <View className="px-4 pb-2 pt-1">
            {loadingOlder ? <ActivityIndicator color={colors.muted} /> : null}
            {!hasMore || messages.length === 0 ? (
              <View className="items-center">
                <View className="w-full max-w-[560px] rounded-2xl border border-line bg-paper px-4 py-3">
                  <Text className="font-medium text-[12px] text-muted">
                    {t('chat.situation')}
                    {scenario ? ` · ${scenario.title[language]}` : ''}
                  </Text>
                  <Text className="mt-1 text-[14px] leading-[21px] text-ink">{sceneText}</Text>
                </View>
                {openingFailed ? (
                  <Pressable onPress={() => openScene(avatar.id)} className="mt-3 flex-row items-center rounded-full border border-line bg-paper px-4 py-2 active:bg-subtle">
                    <Ionicons name="refresh" size={15} color={colors.ink} />
                    <Text className="ml-2 font-semibold text-[13px] text-ink">
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
          <Text className="rounded-full bg-subtle px-3 py-1 text-center text-[12px] text-ink">{notice}</Text>
        </Animated.View>
      ) : null}

      {recording ? (
        <VoiceRecorder avatar={avatar} voiceLeft={isPro ? null : voiceLeft} onSend={sendVoice} onClose={() => setRecording(false)} onPreviewPlaying={() => undefined} />
      ) : (
        <SafeAreaView edges={['bottom']} className="bg-paper">
          <View className="w-full self-center px-3 pt-2" style={{ maxWidth: 760 }}>
            <View className="flex-row items-end rounded-[22px] border border-line bg-paper py-1.5 pl-4 pr-1.5">
              <TextInput
                value={text}
                onChangeText={setText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={colors.muted}
                multiline
                maxLength={4000}
                className="max-h-32 min-h-[36px] flex-1 py-2 text-[15px] leading-[20px] text-ink"
                style={{ outlineStyle: 'none' } as object}
                onSubmitEditing={sendText}
                submitBehavior="submit"
                returnKeyType="send"
              />
              {text.trim() ? (
                <IconButton icon="arrow-up" variant="brand" size={36} label={t('voice.send')} onPress={sendText} disabled={busy} />
              ) : (
                <IconButton icon="mic" variant="brand" size={36} label={t('chat.voiceNote')} onPress={openRecorder} disabled={listening || opening} />
              )}
            </View>
            <View className="pt-1.5">{quotaLine}</View>
          </View>
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  );

  const paywallModal = (
    <PaywallModal
      visible={!!paywall}
      avatar={avatar}
      reason={paywall === 'text' ? t('chat.freeTextOut', { n: FREE_TEXT_LIMIT }) : paywall === 'voice' ? t('chat.freeVoiceOut', { n: FREE_VOICE_LIMIT }) : t('chat.free', { text: textLeft, voice: voiceLeft })}
      onClose={() => setPaywall(null)}
      onUpgraded={() => {
        setPaywall(null);
        refreshProfile();
        if (quota) setQuota({ ...quota, isPro: true });
      }}
    />
  );

  // ------------------------------------------------ escritorio: personaje a la izquierda, chat a la derecha
  if (wide) {
    return (
      <SafeAreaView className="flex-1 flex-row bg-paper" edges={['top']}>
        {withSidebar ? <AppSidebar activeChat={avatar.id} /> : null}
        <View className="border-r border-line" style={{ width: Math.min(480, (width - (withSidebar ? 248 : 0)) * 0.4) }}>
          {!withSidebar ? (
            <View className="absolute left-3 top-3 z-10">
              <IconButton icon="chevron-back" variant="outline" label={t('common.back')} onPress={goBack} />
            </View>
          ) : null}
          {stage}
        </View>
        <View className="flex-1">
          <View className="h-14 flex-row items-center border-b border-line px-4">
            <View className="flex-1">
              <Text className="font-semibold text-[15px] tracking-tight text-ink" numberOfLines={1}>
                {avatar.name}
              </Text>
              {scenario ? (
                <Text className="text-[12px] text-muted" numberOfLines={1}>
                  {scenario.title[language]}
                </Text>
              ) : null}
            </View>
            <IconButton icon="share-outline" label={t('chat.export')} onPress={onExport} />
          </View>
          {conversation}
        </View>
        {paywallModal}
      </SafeAreaView>
    );
  }

  // ------------------------------------------------ móvil
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      {collapsed ? (
        compactHeader
      ) : (
        <Animated.View layout={LinearTransition.duration(220)} className="border-b border-line">
          {stage}
          <View pointerEvents="box-none" className="absolute left-2 right-2 top-2 flex-row justify-between">
            <IconButton icon="chevron-back" variant="outline" size={36} label={t('common.back')} onPress={goBack} />
            <IconButton icon="share-outline" variant="outline" size={36} label={t('chat.export')} onPress={onExport} />
          </View>
        </Animated.View>
      )}
      {conversation}
      {paywallModal}
    </SafeAreaView>
  );
}
