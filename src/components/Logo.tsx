import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { LOGO_MARK_SVG } from '@/constants/logo';

/** Logo de Lovel House: símbolo y, opcionalmente, el nombre al lado. */
export function Logo({ size = 32, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <SvgXml xml={LOGO_MARK_SVG} width={size} height={size} />
      {withName ? (
        <Text style={{ fontSize: Math.round(size * 0.5), marginLeft: Math.round(size * 0.3) }} className="font-semibold tracking-tighter text-ink">
          Lovel House
        </Text>
      ) : null}
    </View>
  );
}
