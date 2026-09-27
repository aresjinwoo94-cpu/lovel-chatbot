import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { BUBBLE_SIDE } from '@/constants/theme';

/** Burbuja de "escribiendo…" del avatar con tres puntitos animados (Lottie). */
export function TypingIndicator() {
  const isLeft = BUBBLE_SIDE.avatar === 'left';
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} className={`my-1 px-3 ${isLeft ? 'items-start' : 'items-end'}`}>
      <View className={`rounded-bubble bg-rose-soft px-3 py-2 ${isLeft ? 'rounded-bl-[4px]' : 'rounded-br-[4px]'}`}>
        <View style={{ width: 45, height: 18, overflow: 'hidden' }}>
          <LottieView source={require('@/assets/lottie/typing.json')} autoPlay loop style={{ width: 45, height: 18 }} />
        </View>
      </View>
    </Animated.View>
  );
}
