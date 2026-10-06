import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { VoicePlayer } from './VoicePlayer';
import { Text } from '@/components/Themed';
import { BUBBLE_SIDE, colors } from '@/constants/theme';
import type { Message } from '@/lib/types';

/** Las acciones de la escena (*se sonroja*) se muestran como acotación, en gris. */
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
const AVATAR = 28;

interface Props {
  message: Message;
  avatar: AvatarLike & { name: string };
  /** Primera burbuja de un grupo del personaje: nombre encima. */
  showName?: boolean;
  /** Última burbuja del grupo: foto al lado. */
  showAvatar?: boolean;
  /** Este mensaje "está sonando" o se acaba de decir: la foto habla. */
  speaking?: boolean;
  localAudioUri?: string | null;
  autoPlay?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
  pending?: boolean;
}

/**
 * Burbuja del chat. Personaje a la IZQUIERDA (tarjeta blanca, con su foto y su
 * nombre); tú a la DERECHA (violeta suave). Igual en móvil y en escritorio.
 */
function ChatBubbleBase({ message, avatar, showName, showAvatar, speaking, localAudioUri, autoPlay, onSpeakingChange, pending }: Props) {
  const isAvatar = message.role === 'avatar';
  const isLeft = (isAvatar ? BUBBLE_SIDE.avatar : BUBBLE_SIDE.user) === 'left';

  const bubble = (
    <View className={`max-w-[78%] rounded-bubble px-3.5 pb-1.5 pt-2 ${isAvatar ? 'border border-line bg-paper' : 'bg-primary-soft'} ${isLeft ? 'rounded-bl-[6px]' : 'rounded-br-[6px]'}`}>
      {message.kind === 'voice' ? (
        <View>
          <VoicePlayer
            path={message.audio_path}
            localUri={localAudioUri}
            durationMs={message.audio_duration_ms}
            autoPlay={autoPlay}
            onPlayingChange={isAvatar ? onSpeakingChange : undefined}
            tint={colors.primary}
            seed={message.id}
          />
          {message.content ? <Text className="mt-1 text-[13px] leading-[19px] text-muted">{message.content}</Text> : null}
        </View>
      ) : (
        <Text className="text-[15px] leading-[22px] text-ink" selectable>
          {isAvatar ? renderWithGestures(message.content) : message.content}
        </Text>
      )}
      <View className="mt-0.5 flex-row items-center self-end">
        <Text className="text-[11px] text-muted">{time(message.created_at)}</Text>
        {!isAvatar ? <Ionicons name={pending ? 'time-outline' : 'checkmark-done'} size={13} color={pending ? colors.muted : colors.primary} style={{ marginLeft: 3 }} /> : null}
      </View>
    </View>
  );

  if (!isAvatar) {
    return (
      <Animated.View entering={FadeInUp.duration(200)} className={`my-0.5 px-4 ${isLeft ? 'items-start' : 'items-end'}`}>
        {bubble}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.duration(240)} className="my-0.5 px-4">
      {showName ? <Text className="mb-1 ml-[36px] mt-3 font-semibold text-[12px] text-muted">{avatar.name}</Text> : null}
      <View className="flex-row items-end">
        <View style={{ width: AVATAR, marginRight: 8 }}>{showAvatar ? <AnimatedAvatar avatar={avatar} size={AVATAR} presence={speaking ? 'speaking' : 'idle'} /> : null}</View>
        {bubble}
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);
