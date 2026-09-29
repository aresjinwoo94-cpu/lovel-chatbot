import { memo, useEffect, useId, useMemo, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { normalizeLook } from '@/lib/character/options';
import { renderCharacter } from '@/lib/character/render';
import type { CharacterLook } from '@/lib/character/types';

interface Props {
  /** Aspecto del personaje (se valida con normalizeLook). */
  look: CharacterLook | unknown;
  gender?: string;
  size: number;
  /** bust = medio cuerpo · face = solo cara (fotos de perfil). */
  crop?: 'bust' | 'face';
  circle?: boolean;
  /** Mueve los labios (respuestas, voz). */
  speaking?: boolean;
  /** Parpadeo natural cada pocos segundos. */
  animate?: boolean;
  background?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TALK: (0 | 1 | 2)[] = [1, 2, 1, 0, 2, 1, 2, 0, 1];

/**
 * Retrato del personaje dibujado en SVG: el mismo en la lista, el creador y el chat.
 * Parpadea solo y mueve la boca cuando habla.
 */
function CharacterPortraitBase({ look, gender, size, crop = 'bust', circle = false, speaking = false, animate = true, background = true, style }: Props) {
  const uid = `c${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [blink, setBlink] = useState(false);
  const [talk, setTalk] = useState<0 | 1 | 2>(0);
  const safe = useMemo(() => normalizeLook(look, gender), [look, gender]);

  useEffect(() => {
    if (!animate) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          loop();
        }, 130);
      }, 2400 + Math.random() * 2800);
    };
    loop();
    return () => clearTimeout(timer);
  }, [animate]);

  useEffect(() => {
    if (!speaking) return;
    let i = 0;
    const id = setInterval(() => setTalk(TALK[i++ % TALK.length]), 115);
    return () => clearInterval(id);
  }, [speaking]);

  const frame = speaking ? talk : 0;
  const xml = useMemo(() => renderCharacter(safe, { crop, blink, talk: frame, uid, background }), [safe, crop, blink, frame, uid, background]);

  return (
    <View style={[{ width: size, height: size, borderRadius: circle ? size / 2 : 0, overflow: 'hidden' }, style]}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

export const CharacterPortrait = memo(CharacterPortraitBase);
