import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';

import { AppSidebar } from '@/components/AppSidebar';
import { colors, fonts } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

/**
 * Pestañas: Inicio · Perfil · Ajustes.
 * Móvil: barra inferior. Escritorio (≥ 900 px): barra lateral propia (marca,
 * navegación, personajes recientes, uso del plan y cuenta).
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const side = width >= 900;
  return (
    <Tabs
      tabBar={side ? (props) => <AppSidebar active={props.state.routes[props.state.index]?.name as 'index' | 'profile' | 'settings'} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarPosition: side ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}
