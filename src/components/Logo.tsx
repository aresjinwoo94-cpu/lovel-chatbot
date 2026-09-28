import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { serif } from '@/constants/theme';
import { LOGO_MARK_SVG } from '@/constants/logo';

/** Logo de Lovel House (símbolo + nombre opcional). */
export function Logo({ size = 64, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <SvgXml xml={LOGO_MARK_SVG} width={size} height={size} />
      {withName ? (
        <Text style={{ fontFamily: serif, fontSize: size * 0.42, marginTop: size * 0.18 }} className="text-ink">
          Lovel House
        </Text>
      ) : null}
    </View>
  );
}
