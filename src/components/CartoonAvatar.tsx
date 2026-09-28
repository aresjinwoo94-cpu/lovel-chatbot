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
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { buildAvatarParts, LINE, TALKING_MOUTH, type Shape } from '@/lib/avatarGeometry';
import type { AvatarAppearance, Expression, Gender } from '@/lib/types';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);

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

const Shapes = ({ list, k }: { list: Shape[]; k: string }) => (
  <>
    {list.map((s, i) => (
      <ShapeEl key={`${k}${i}`} s={s} />
    ))}
  </>
);

/**
 * Avatar 2D estilo anime (tipo VTuber) con sombreado plano, dibujado en SVG.
 * Escena de atardecer (o la que se elija) de fondo. Anima:
 *  - parpadeo natural (el ojo se cierra un instante)
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
  const gradientId = `sky-${useId().replace(/:/g, '')}`;
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
        blink.value = withSequence(withTiming(1, { duration: 60 }), withTiming(1, { duration: 70 }), withTiming(0, { duration: 60 }));
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

  const openEyeProps = useAnimatedProps(() => ({ opacity: blink.value > 0.5 ? 0 : 1 }));
  const closedEyeProps = useAnimatedProps(() => ({ opacity: blink.value > 0.5 ? 1 : 0 }));
  const mouthProps = useAnimatedProps(() => ({
    ry: TALKING_MOUTH.ryMin + (TALKING_MOUTH.ryMax - TALKING_MOUTH.ryMin) * mouth.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {parts.skyStops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="200" height="200" fill={`url(#${gradientId})`} />

      <Shapes list={parts.scene} k="sc" />
      <Shapes list={parts.back} k="b" />
      <Shapes list={parts.face} k="f" />
      <Shapes list={parts.brows} k="br" />

      {/* Ojos: abiertos / cerrados según el parpadeo */}
      {parts.eyes.map((eye, i) => (
        <G key={`eye${i}`}>
          <AnimatedG animatedProps={openEyeProps}>
            <Shapes list={eye.open} k={`eo${i}`} />
          </AnimatedG>
          <AnimatedG animatedProps={closedEyeProps} opacity={0}>
            <Shapes list={eye.closed} k={`ec${i}`} />
          </AnimatedG>
        </G>
      ))}

      {/* Boca: estática según expresión, o animada al hablar */}
      {speaking ? (
        <AnimatedEllipse
          cx={TALKING_MOUTH.cx}
          cy={TALKING_MOUTH.cy}
          rx={TALKING_MOUTH.rx}
          fill={TALKING_MOUTH.fill}
          stroke={LINE}
          strokeWidth={0.9}
          animatedProps={mouthProps}
        />
      ) : (
        <Shapes list={parts.mouth} k="m" />
      )}

      <Shapes list={parts.front} k="fr" />
    </Svg>
  );
}

export const CartoonAvatar = memo(CartoonAvatarBase);
