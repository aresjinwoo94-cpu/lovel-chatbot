import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AvatarMood } from '@/components/AnimatedAvatar';
import { ChatBubble } from '@/components/ChatBubble';
import { PaywallModal } from '@/components/PaywallModal';
import { TypingIndicator } from '@/components/TypingIndicator';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { VrmAvatar } from '@/components/VrmAvatar';
import { colors, serif } from '@/constants/theme';
import { callFunction, isPaywall } from '@/lib/api';
import { base64ToPlayableUri, fileToBase64, recordingMimeType } from '@/lib/audio';
import { useAuth } from '@/lib/auth';
import { FREE_MESSAGE_LIMIT, FREE_SECONDS } from '@/lib/billing';
import { fetchAvatar, fetchMessages, PAGE_SIZE } from '@/lib/data';
import { exportConversation } from '@/lib/exportConversation';
import { useI18n } from '@/lib/i18n';
import type { Avatar, ChatResponse, Message, QuotaState, VoiceChatResponse } from '@/lib/types';

/**
 * CHAT PRINCIPAL — el corazón de Lovel House.
 * Estilo WhatsApp: lista invertida con scroll infinito, "escribiendo…",
 * foto de perfil grande arriba a la derecha que cobra vida cuando el avatar responde.
 */
export default function ChatScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const { t } = useI18n();
  const { profile, refreshProfile } = useAuth();

  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // del más nuevo al más viejo
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);

  const [mood, setMood] = useState<AvatarMood>('idle');
  const [badge, setBadge] = useState<'❤️' | '🗣️' | null>(null);
  const [localAudio, setLocalAudio] = useState<Record<string, string>>({});
  const [autoPlayId, setAutoPlayId] = useState<string | null>(null);

  const [paywall, setPaywall] = useState(false);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const paywallShown = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isPro = quota?.isPro ?? profile?.is_pro ?? false;

  // ---------------------------------------------------------------- carga
  useEffect(() => {
    if (!avatarId) return;
    (async () => {
      try {
        const [a, msgs] = await Promise.all([fetchAvatar(avatarId), fetchMessages(avatarId)]);
        setAvatar(a);
        setMessages(msgs);
        setHasMore(msgs.length === PAGE_SIZE);
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
        router.replace('/');
      } finally {
        setLoading(false);
      }
    })();
    return () => timers.current.forEach(clearTimeout);
  }, [avatarId, t]);

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

  // ------------------------------------------------ plan Pro: 5 mensajes o 2 minutos
  const maybeShowPaywall = useCallback(
    (q: QuotaState | null) => {
      if (!q || q.isPro || paywallShown.current) return;
      const elapsed = q.trialStartedAt ? (Date.now() - new Date(q.trialStartedAt).getTime()) / 1000 : 0;
      if (q.exhausted || q.messagesUsed >= q.messagesLimit || elapsed >= q.secondsLimit) {
        paywallShown.current = true;
        timers.current.push(setTimeout(() => setPaywall(true), 1400));
      }
    },
    [],
  );

  // Estado inicial de la prueba desde el perfil.
  useEffect(() => {
    if (!profile || quota) return;
    setQuota({
      isPro: profile.is_pro,
      messagesUsed: profile.free_messages_used,
      messagesLimit: FREE_MESSAGE_LIMIT,
      trialStartedAt: profile.trial_started_at,
      secondsLimit: FREE_SECONDS,
      exhausted: false,
    });
  }, [profile, quota]);

  // Si Stripe activa Pro (webhook → realtime), se refleja al instante.
  useEffect(() => {
    if (profile?.is_pro) setQuota((q) => (q ? { ...q, isPro: true, exhausted: false } : q));
  }, [profile?.is_pro]);

  // Reloj de los 2 minutos de conversación gratuita.
  useEffect(() => {
    if (isPro || !quota?.trialStartedAt) return;
    const id = setInterval(() => maybeShowPaywall(quota), 5000);
    return () => clearInterval(id);
  }, [isPro, quota, maybeShowPaywall]);

  // ------------------------------------------------ animación del avatar al responder
  const celebrateReply = (kind: 'text' | 'voice') => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBadge(kind === 'voice' ? '🗣️' : '❤️');
    if (kind === 'text') {
      // "Habla" un momento (labios + asiente), luego sonríe y vuelve a respirar tranquilo.
      setMood('speaking');
      timers.current.push(setTimeout(() => setMood('happy'), 1600));
      timers.current.push(setTimeout(() => setMood('idle'), 3400));
    }
    timers.current.push(setTimeout(() => setBadge(null), 3800));
  };

  const onAvatarSpeaking = useCallback((speaking: boolean) => {
    if (speaking) {
      setMood('speaking');
      setBadge('🗣️');
    } else {
      setMood('happy');
      timers.current.push(setTimeout(() => setMood('idle'), 1800));
      timers.current.push(setTimeout(() => setBadge(null), 2000));
    }
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

  // ---------------------------------------------------------------- enviar texto
  const sendText = async () => {
    const body = text.trim();
    if (!body || !avatarId || typing) return;
    if (quota && !quota.isPro && quota.exhausted) {
      setPaywall(true);
      return;
    }
    const temp = tempMessage('text', body);
    setMessages((prev) => [temp, ...prev]);
    setText('');
    setTyping(true);
    setMood('thinking');
    try {
      const res = await callFunction<ChatResponse>('chat', { avatarId, text: body });
      setMessages((prev) => [res.avatarMessage, res.userMessage, ...prev.filter((m) => m.id !== temp.id)]);
      setQuota(res.quota);
      celebrateReply('text');
      maybeShowPaywall(res.quota);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      setMood('idle');
      if (isPaywall(e)) {
        setQuota((q) => (q ? { ...q, exhausted: true } : q));
        setPaywall(true);
      } else Alert.alert(t('chat.errorSend'));
    } finally {
      setTyping(false);
    }
  };

  // ---------------------------------------------------------------- enviar voz
  const sendVoice = async (uri: string, durationMs: number) => {
    setRecording(false);
    if (!avatarId) return;
    if (quota && !quota.isPro && quota.exhausted) {
      setPaywall(true);
      return;
    }
    const temp = tempMessage('voice', '', durationMs);
    setLocalAudio((prev) => ({ ...prev, [temp.id]: uri }));
    setMessages((prev) => [temp, ...prev]);
    setListening(true);
    setMood('thinking');
    try {
      const audioBase64 = await fileToBase64(uri);
      const res = await callFunction<VoiceChatResponse>('voice-chat', {
        avatarId,
        audioBase64,
        mimeType: recordingMimeType(uri),
        durationMs,
      });
      const replyUri = await base64ToPlayableUri(res.replyAudioBase64, res.avatarMessage.id);
      setLocalAudio((prev) => ({ ...prev, [res.userMessage.id]: uri, [res.avatarMessage.id]: replyUri }));
      setAutoPlayId(res.avatarMessage.id);
      setMessages((prev) => [res.avatarMessage, res.userMessage, ...prev.filter((m) => m.id !== temp.id)]);
      setQuota(res.quota);
      celebrateReply('voice');
      maybeShowPaywall(res.quota);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setMood('idle');
      if (isPaywall(e)) {
        setQuota((q) => (q ? { ...q, exhausted: true } : q));
        setPaywall(true);
      } else Alert.alert(t('chat.errorSend'), e instanceof Error ? e.message : undefined);
    } finally {
      setListening(false);
    }
  };

  // ---------------------------------------------------------------- exportar
  const onExport = () => {
    if (!avatar) return;
    const run = (format: 'html' | 'txt') =>
      exportConversation(avatar, format, t).catch((e) => Alert.alert(t('common.error'), String(e)));
    Alert.alert(t('export.title'), undefined, [
      { text: t('export.html'), onPress: () => run('html') },
      { text: t('export.txt'), onPress: () => run('txt') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  if (loading || !avatar) {
    return (
      <View className="flex-1 items-center justify-center bg-wall">
        <ActivityIndicator color={colors.roseDeep} />
      </View>
    );
  }

  const status = typing ? t('chat.typing') : listening ? t('chat.listening') : t('chat.online');
  const freeLeft = quota ? Math.max(0, quota.messagesLimit - quota.messagesUsed) : FREE_MESSAGE_LIMIT;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      {/* ------------------------------------------------ Encabezado */}
      <View className="flex-row items-center border-b border-line bg-cream px-3 pb-2 pt-1">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} className="mr-1">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <View className="flex-1">
          <Text style={{ fontFamily: serif }} className="text-lg text-ink" numberOfLines={1}>
            {avatar.name}
          </Text>
          <Text className={`text-xs ${typing || listening ? 'text-rose-deep' : 'text-sage'}`}>{status}</Text>
        </View>
        <Pressable onPress={onExport} hitSlop={10} className="mr-3" accessibilityLabel={t('chat.export')}>
          <Ionicons name="share-outline" size={22} color={colors.ink} />
        </Pressable>
        {/* Foto de perfil grande, arriba a la derecha: el avatar VRM en vivo parpadea,
            mueve la cabeza, sonríe y mueve los labios cuando responde o habla */}
        <View style={{ width: 66, height: 66 }}>
          <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: colors.rose, padding: 2 }}>
            <VrmAvatar appearance={avatar.appearance} mood={mood} framing="face" circle style={{ width: 58, height: 58, borderRadius: 29 }} />
          </View>
          {badge ? (
            <View style={{ position: 'absolute', right: -4, top: -4, backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 4, borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ fontSize: 13 }}>{badge}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ------------------------------------------------ Mensajes */}
        <FlatList
          className="flex-1 bg-wall"
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              pending={item.id.startsWith('temp-')}
              localAudioUri={localAudio[item.id]}
              autoPlay={item.id === autoPlayId}
              onSpeakingChange={onAvatarSpeaking}
            />
          )}
          ListHeaderComponent={typing || listening ? <TypingIndicator /> : null}
          ListFooterComponent={
            <View className="px-6 pb-3 pt-2">
              {loadingOlder ? <ActivityIndicator color={colors.muted} /> : null}
              {!hasMore || messages.length === 0 ? (
                <View className="items-center">
                  <View className="max-w-[90%] rounded-xl bg-blush px-4 py-2">
                    <Text className="text-center text-xs leading-5 text-ink">
                      <Text className="font-semibold">{t('chat.situation')}: </Text>
                      {avatar.situation_description}
                    </Text>
                  </View>
                  {messages.length === 0 ? (
                    <Text className="mt-3 text-center text-sm text-muted">{t('chat.empty', { name: avatar.name })}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
        />

        {/* ------------------------------------------------ Barra de escritura / voz */}
        {recording ? (
          <VoiceRecorder
            avatar={avatar}
            onSend={sendVoice}
            onClose={() => {
              setRecording(false);
              setMood('idle');
            }}
            onPreviewPlaying={(playing) => setMood(playing ? 'speaking' : 'idle')}
          />
        ) : (
          <SafeAreaView edges={['bottom']} className="bg-cream">
            {!isPro ? (
              <Pressable onPress={() => setPaywall(true)}>
                <Text className="pt-1 text-center text-[11px] text-muted">{t('chat.freeLeft', { n: freeLeft })}</Text>
              </Pressable>
            ) : null}
            <View className="flex-row items-end px-3 py-2">
              <View className="mr-2 min-h-[48px] flex-1 justify-center rounded-3xl border border-line bg-paper px-4 py-2">
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={t('chat.placeholder')}
                  placeholderTextColor={colors.muted}
                  multiline
                  className="max-h-32 text-base text-ink"
                  onSubmitEditing={sendText}
                  submitBehavior="submit"
                  returnKeyType="send"
                />
              </View>
              {text.trim() ? (
                <Pressable onPress={sendText} disabled={typing} className="h-12 w-12 items-center justify-center rounded-full bg-ink active:opacity-80">
                  <Ionicons name="send" size={20} color={colors.cream} />
                </Pressable>
              ) : (
                // Botón de micrófono grande
                <Pressable
                  onPress={() => setRecording(true)}
                  disabled={listening}
                  accessibilityLabel={t('chat.voiceNote')}
                  className="h-14 w-14 items-center justify-center rounded-full bg-rose-deep active:opacity-80"
                >
                  <Ionicons name="mic" size={26} color={colors.paper} />
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>

      <PaywallModal
        visible={paywall}
        avatar={avatar}
        onClose={() => setPaywall(false)}
        onUpgraded={() => {
          setPaywall(false);
          refreshProfile();
          setQuota((q) => (q ? { ...q, isPro: true, exhausted: false } : q));
        }}
      />
    </SafeAreaView>
  );
}
