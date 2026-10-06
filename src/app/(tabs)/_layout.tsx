import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

/**
 * Pestañas: Historias · Perfil · Ajustes.
 * Móvil: barra inferior. Escritorio (≥ 900 px): barra lateral con etiqueta junto al icono.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const side = width >= 900;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: side ? 'left' : 'bottom',
        tabBarLabelPosition: side ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: side ? colors.subtle : undefined,
        tabBarItemStyle: side ? { borderRadius: 10, marginHorizontal: 10, marginVertical: 2, justifyContent: 'flex-start', paddingHorizontal: 12, maxHeight: 42 } : undefined,
        tabBarStyle: side
          ? { backgroundColor: colors.cream, borderRightColor: colors.line, width: 232, paddingTop: 20 }
          : { backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: side ? 14 : 11 },
        sceneStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.chats'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={side ? 18 : 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={side ? 18 : 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={side ? 18 : 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
