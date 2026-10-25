import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSidebar } from '@/components/AppSidebar';
import { fonts } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/**
 * Pestañas: Inicio · Perfil · Ajustes.
 * Móvil: barra inferior. Escritorio (≥ 900 px): barra lateral propia (marca,
 * navegación, personajes recientes, uso del plan y cuenta).
 */
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const side = width >= 900;
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={side ? (props) => <AppSidebar active={props.state.routes[props.state.index]?.name as 'index' | 'profile' | 'settings'} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarPosition: side ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        // alto propio: con la altura por defecto la fuente recortaba la parte de abajo de las etiquetas ("Ajustes")
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line, height: 64 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
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
