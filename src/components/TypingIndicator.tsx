import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';

/** "Escribiendo…": el personaje a la izquierda, con su foto pensando y tres puntos. */
export function TypingIndicator({ avatar, listening = false }: { avatar: AvatarLike; listening?: boolean }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} className="my-1 flex-row items-end px-4">
      <View style={{ marginRight: 8 }}>
        <AnimatedAvatar avatar={avatar} size={28} presence={listening ? 'listening' : 'thinking'} />
      </View>
      <View className="rounded-bubble rounded-bl-[6px] bg-subtle px-3 py-2.5">
        <View style={{ width: 40, height: 16, overflow: 'hidden' }}>
          <LottieView source={require('@/assets/lottie/typing.json')} autoPlay loop style={{ width: 40, height: 16 }} />
        </View>
      </View>
    </Animated.View>
  );
}
