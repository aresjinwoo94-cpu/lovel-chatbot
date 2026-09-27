import { memo, useEffect, useId } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { buildAvatarParts, LINE, TALKING_MOUTH, type Shape } from '@/lib/avatarGeometry';
import type { AvatarAppearance, Expression, Gender } from '@/lib/types';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CartoonAvatarProps {
  appearance: AvatarAppearance;
  gender: Gender;
  age: number;
  expression?: Expression;
  /** Cuando es true, la boca se mueve como si hablara (voz o respuesta). */
  speaking?: boolean;
  /** Parpadeo automático cada pocos segundos. */
  blinking?: boolean;
  size?: number;
}

/** Dibuja una forma de la geometría como elemento SVG. */
function ShapeEl({ s }: { s: Shape }) {
  const common = {
    fill: s.fill ?? 'none',
    stroke: s.stroke ?? 'none',
    strokeWidth: s.strokeWidth ?? 0,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: s.opacity,
  };
  if (s.kind === 'path') return <Path d={s.d} {...common} />;
  if (s.kind === 'ellipse') return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
  return <Circle cx={s.cx} cy={s.cy} r={s.r} {...common} />;
}

/**
 * Avatar 2D cartoon dibujado a mano en SVG.
 * Líneas limpias, fondo degradado y expresión suave. Anima:
 *  - parpadeo natural (ojos que se cierran un instante)
 *  - labios que se mueven cuando habla
 */
function CartoonAvatarBase({
  appearance,
  gender,
  age,
  expression = 'neutral',
  speaking = false,
  blinking = true,
  size = 120,
}: CartoonAvatarProps) {
  const gradientId = `bg-${useId().replace(/:/g, '')}`;
  const parts = buildAvatarParts(appearance, gender, age, speaking ? 'neutral' : expression);

  // 0 = ojos abiertos, 1 = cerrados
  const blink = useSharedValue(0);
  // 0 = boca cerrada, 1 = totalmente abierta
  const mouth = useSharedValue(0);

  // Parpadeo con intervalos aleatorios, como una persona real.
  useEffect(() => {
    if (!blinking) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 120 }));
        schedule();
      }, 2200 + Math.random() * 3200);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [blinking, blink]);

  // Movimiento de labios mientras habla.
  useEffect(() => {
    if (speaking) {
      mouth.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(0.25, { duration: 110 }),
          withTiming(0.75, { duration: 95 }),
          withTiming(0.1, { duration: 140 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(mouth);
      mouth.value = withTiming(0, { duration: 120 });
    }
  }, [speaking, mouth]);

  const eyeProps = useAnimatedProps(() => ({ ry: parts.eyes.ry * (1 - 0.9 * blink.value) }));
  const highlightProps = useAnimatedProps(() => ({ opacity: blink.value > 0.4 ? 0 : 1 }));
  const mouthProps = useAnimatedProps(() => ({
    ry: TALKING_MOUTH.ryMin + (TALKING_MOUTH.ryMax - TALKING_MOUTH.ryMin) * mouth.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={appearance.background[0]} />
          <Stop offset="1" stopColor={appearance.background[1]} />
        </LinearGradient>
      </Defs>
      <Rect width="200" height="200" fill={`url(#${gradientId})`} />

      {parts.back.map((s, i) => (
        <ShapeEl key={`b${i}`} s={s} />
      ))}
      {parts.face.map((s, i) => (
        <ShapeEl key={`f${i}`} s={s} />
      ))}
      {parts.brows.map((s, i) => (
        <ShapeEl key={`br${i}`} s={s} />
      ))}

      {/* Ojos animados (parpadeo) */}
      {[parts.eyes.left, parts.eyes.right].map((e, i) => (
        <AnimatedEllipse
          key={`e${i}`}
          cx={e.cx}
          cy={e.cy}
          rx={parts.eyes.rx}
          fill={parts.eyes.color}
          stroke={LINE}
          strokeWidth={1.2}
          animatedProps={eyeProps}
        />
      ))}
      {[parts.eyes.left, parts.eyes.right].map((e, i) => (
        <AnimatedCircle key={`h${i}`} cx={e.cx + 1.6} cy={e.cy - 2} r={1.6} fill="#fff" animatedProps={highlightProps} />
      ))}
      {parts.eyeDetails.map((s, i) => (
        <ShapeEl key={`ed${i}`} s={s} />
      ))}

      {/* Boca: estática según expresión, o animada al hablar */}
      {speaking ? (
        <AnimatedEllipse
          cx={TALKING_MOUTH.cx}
          cy={TALKING_MOUTH.cy}
          rx={TALKING_MOUTH.rx}
          fill={TALKING_MOUTH.fill}
          stroke={LINE}
          strokeWidth={1.8}
          animatedProps={mouthProps}
        />
      ) : (
        parts.mouth.map((s, i) => <ShapeEl key={`m${i}`} s={s} />)
      )}

      {parts.front.map((s, i) => (
        <ShapeEl key={`fr${i}`} s={s} />
      ))}
    </Svg>
  );
}

export const CartoonAvatar = memo(CartoonAvatarBase);
