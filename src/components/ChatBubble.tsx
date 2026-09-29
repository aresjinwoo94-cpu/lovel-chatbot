import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { VoicePlayer } from './VoicePlayer';
import { Text } from '@/components/Themed';
import { BUBBLE_SIDE, colors } from '@/constants/theme';
import type { Message } from '@/lib/types';

/**
 * Las acciones de la escena vienen entre asteriscos (*se sonroja*).
 * Se muestran como acotación: más suaves, para leerse como narración.
 */
function renderWithGestures(text: string) {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <Text key={i} className="text-muted">
        {part.slice(1, -1)}
      </Text>
    ) : (
      part
    ),
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const AVATAR_SIZE = 34;

interface Props {
  message: Message;
  avatar: AvatarLike & { name: string };
  /** Primera burbuja de un grupo del personaje: muestra su nombre encima. */
  showName?: boolean;
  /** Última burbuja de un grupo del personaje: muestra su foto al lado. */
  showAvatar?: boolean;
  /** El personaje está hablando (nota de voz sonando): mueve los labios. */
  speaking?: boolean;
  /** URI local del audio recién llegado (para reproducirlo al instante). */
  localAudioUri?: string | null;
  autoPlay?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
  pending?: boolean;
}

/**
 * Burbuja de chat.
 * Tus mensajes a la DERECHA (violeta de la marca); los del personaje a la
 * IZQUIERDA (tarjeta blanca), con su foto y su nombre al lado.
 */
function ChatBubbleBase({ message, avatar, showName, showAvatar, speaking, localAudioUri, autoPlay, onSpeakingChange, pending }: Props) {
  const isAvatar = message.role === 'avatar';
  const isLeft = (isAvatar ? BUBBLE_SIDE.avatar : BUBBLE_SIDE.user) === 'left';

  const bubble = (
    <View
      className={`max-w-[80%] rounded-bubble px-3.5 pb-1.5 pt-2 ${isAvatar ? 'border border-line bg-paper' : 'bg-primary'} ${
        isLeft ? 'rounded-bl-[6px]' : 'rounded-br-[6px]'
      }`}
      style={{ shadowColor: '#242229', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
    >
      {message.kind === 'voice' ? (
        <View>
          <VoicePlayer
            path={message.audio_path}
            localUri={localAudioUri}
            durationMs={message.audio_duration_ms}
            autoPlay={autoPlay}
            onPlayingChange={isAvatar ? onSpeakingChange : undefined}
            tint={isAvatar ? colors.primary : colors.paper}
            onDark={!isAvatar}
            seed={message.id}
          />
          {message.content ? (
            <Text className={`mt-1 text-[13px] leading-5 ${isAvatar ? 'text-muted' : 'text-paper/85'}`}>{message.content}</Text>
          ) : null}
        </View>
      ) : (
        <Text className={`text-[15px] leading-[22px] ${isAvatar ? 'text-ink' : 'text-paper'}`} selectable>
          {isAvatar ? renderWithGestures(message.content) : message.content}
        </Text>
      )}
      <View className="mt-0.5 flex-row items-center self-end">
        <Text className={`text-[11px] ${isAvatar ? 'text-muted' : 'text-paper/75'}`}>{time(message.created_at)}</Text>
        {!isAvatar ? (
          <Ionicons name={pending ? 'time-outline' : 'checkmark-done'} size={14} color={colors.primarySoft} style={{ marginLeft: 3 }} />
        ) : null}
      </View>
    </View>
  );

  if (!isAvatar) {
    return (
      <Animated.View entering={FadeInUp.duration(220)} className={`my-0.5 px-3 ${isLeft ? 'items-start' : 'items-end'}`}>
        {bubble}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.duration(260)} className="my-0.5 px-3">
      {showName ? <Text className="mb-1 ml-[44px] mt-2 font-serif text-[15px] text-primary-deep">{avatar.name}</Text> : null}
      <View className="flex-row items-end">
        <View style={{ width: AVATAR_SIZE, marginRight: 8 }}>
          {showAvatar ? <AnimatedAvatar avatar={avatar} size={AVATAR_SIZE} mood={speaking ? 'speaking' : 'idle'} animate={!!speaking} /> : null}
        </View>
        {bubble}
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);
