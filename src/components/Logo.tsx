import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { LOGO_MARK_SVG } from '@/constants/logo';
import { Text } from '@/components/Themed';

/** Logo de Lovel House (símbolo + nombre opcional). */
export function Logo({ size = 64, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <SvgXml xml={LOGO_MARK_SVG} width={size} height={size} />
      {withName ? (
        <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.52, marginTop: size * 0.18 }} className="font-serif text-ink">
          Lovel House
        </Text>
      ) : null}
    </View>
  );
}
