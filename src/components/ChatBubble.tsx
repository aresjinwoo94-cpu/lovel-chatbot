import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { VoicePlayer } from './VoicePlayer';
import { BUBBLE_SIDE, colors } from '@/constants/theme';
import type { Message } from '@/lib/types';

/**
 * Los gestos de la escena vienen entre asteriscos (*te abrazo*). Los mostramos
 * en un tono más suave, sin cursiva, para que se lean como acotaciones.
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

interface Props {
  message: Message;
  /** URI local del audio de la respuesta recién llegada (para reproducirla al instante). */
  localAudioUri?: string | null;
  autoPlay?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
  pending?: boolean;
}

/**
 * Burbuja de chat estilo WhatsApp.
 * Usuario a la izquierda (blanca), avatar a la derecha (rosa suave),
 * con "colita" en la esquina inferior y hora abajo.
 */
function ChatBubbleBase({ message, localAudioUri, autoPlay, onSpeakingChange, pending }: Props) {
  const side = message.role === 'user' ? BUBBLE_SIDE.user : BUBBLE_SIDE.avatar;
  const isLeft = side === 'left';
  const isAvatar = message.role === 'avatar';

  return (
    <Animated.View entering={FadeInUp.duration(220)} className={`my-1 px-3 ${isLeft ? 'items-start' : 'items-end'}`}>
      <View
        className={`max-w-[82%] rounded-bubble px-3 pb-1.5 pt-2 ${isAvatar ? 'bg-rose-soft' : 'bg-paper'} ${
          isLeft ? 'rounded-bl-[4px]' : 'rounded-br-[4px]'
        }`}
        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
      >
        {message.kind === 'voice' ? (
          <View>
            <VoicePlayer
              path={message.audio_path}
              localUri={localAudioUri}
              durationMs={message.audio_duration_ms}
              autoPlay={autoPlay}
              onPlayingChange={isAvatar ? onSpeakingChange : undefined}
              tint={isAvatar ? colors.roseDeep : colors.sage}
              seed={message.id}
            />
            {message.content ? <Text className="mt-1 text-[13px] leading-5 text-muted">{message.content}</Text> : null}
          </View>
        ) : (
          <Text className="text-[15px] leading-[21px] text-ink" selectable>
            {isAvatar ? renderWithGestures(message.content) : message.content}
          </Text>
        )}
        <View className="mt-0.5 flex-row items-center self-end">
          <Text className="text-[11px] text-muted">{time(message.created_at)}</Text>
          {message.role === 'user' ? (
            <Ionicons
              name={pending ? 'time-outline' : 'checkmark-done'}
              size={14}
              color={pending ? colors.muted : colors.roseDeep}
              style={{ marginLeft: 3 }}
            />
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);
