import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';

/** "Escribiendo…": el personaje a la izquierda, con su foto y tres puntitos animados. */
export function TypingIndicator({ avatar }: { avatar: AvatarLike }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} className="my-1 flex-row items-end px-3">
      <View style={{ marginRight: 8 }}>
        <AnimatedAvatar avatar={avatar} size={34} mood="thinking" />
      </View>
      <View className="rounded-bubble rounded-bl-[6px] border border-line bg-paper px-3 py-2.5">
        <View style={{ width: 45, height: 18, overflow: 'hidden' }}>
          <LottieView source={require('@/assets/lottie/typing.json')} autoPlay loop style={{ width: 45, height: 18 }} />
        </View>
      </View>
    </Animated.View>
  );
}
