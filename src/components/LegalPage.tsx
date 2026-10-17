import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { IconButton, Muted } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { legalDoc } from '@/lib/legal';

/** Página de Términos o Privacidad (accesible siempre, también antes de la puerta 18+). */
export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t, language } = useI18n();
  const doc = legalDoc(kind, language);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="h-14 flex-row items-center px-2">
        <IconButton icon="chevron-back" label={t('common.back')} onPress={back} />
      </View>
      <ScrollView contentContainerClassName="px-6 pb-12">
        <View className="w-full self-center" style={{ maxWidth: 640 }}>
          <Text accessibilityRole="header" className="font-semibold text-[26px] leading-[32px] tracking-tighter text-ink">
            {doc.title}
          </Text>
          <Muted className="mt-1 text-[13px]">{doc.updated}</Muted>
          {doc.sections.map((s) => (
            <View key={s.h} className="mt-6">
              <Text className="font-semibold text-[16px] tracking-tight text-ink">{s.h}</Text>
              {s.p.map((p) => (
                <Text key={p.slice(0, 32)} className="mt-2 text-[14px] leading-[22px] text-ink">
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
