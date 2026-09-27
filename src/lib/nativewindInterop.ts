import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * Permite usar className (Tailwind) en los componentes animados de Reanimated,
 * igual que en un View normal. Se importa una sola vez en el layout raíz.
 */
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
