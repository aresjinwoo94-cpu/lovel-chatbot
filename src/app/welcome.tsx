import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ComponentProps, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Button, IconButton, Muted } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { type CharacterPreset, PRESETS } from '@/lib/character/catalog';
import { faceImage, presetPortrait } from '@/lib/character/media';
import { createFromDraft } from '@/lib/createCharacter';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { fillName, SCENARIO_CATEGORIES, type ScenarioCategory, SCENARIOS } from '@/lib/roleplay';
import type { Gender } from '@/lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Who = 'female' | 'male' | 'any';

const CATEGORY_ICON: Record<ScenarioCategory, IconName> = {
  romance: 'heart-outline',
  drama: 'rainy-outline',
  friendship: 'people-outline',
  school: 'school-outline',
  work: 'briefcase-outline',
  fantasy: 'sparkles-outline',
  mystery: 'search-outline',
  conflict: 'flash-outline',
  slice: 'cafe-outline',
};

const AGES = [
  { id: 'a', range: '18–22', age: 21 },
  { id: 'b', range: '23–27', age: 25 },
  { id: 'c', range: '28–34', age: 30 },
  { id: 'd', range: '35+', age: 37 },
] as const;

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Personaje de la biblioteca que mejor encaja con lo elegido (género y edad). */
function choosePreset(who: Who, age: number): CharacterPreset {
  const pool = PRESETS.filter((p) => who === 'any' || p.gender === who);
  const best = Math.min(...pool.map((p) => Math.abs(p.age - age)));
  return pick(pool.filter((p) => Math.abs(p.age - age) <= best + 2));
}

/** Tarjeta de opción grande (una pregunta, una decisión). */
function Option({ title, hint, selected, onPress, left }: { title: string; hint?: string; selected: boolean; onPress: () => void; left?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      className={`mb-2.5 min-h-[60px] flex-row items-center rounded-2xl border px-4 py-3 ${selected ? 'border-ink bg-subtle' : 'border-line bg-paper active:bg-subtle'}`}
      style={{ cursor: 'pointer' } as object}
    >
      {left}
      <View className="flex-1">
        <Text className="font-semibold text-[15px] tracking-tight text-ink">{title}</Text>
        {hint ? <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{hint}</Text> : null}
      </View>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.ink : colors.line} />
    </Pressable>
  );
}

function Faces({ gender }: { gender: Who }) {
  const list = PRESETS.filter((p) => gender === 'any' || p.gender === gender).slice(0, 3);
  return (
    <View className="mr-3 flex-row">
      {list.map((p, i) => (
        <View key={p.id} className="overflow-hidden rounded-full border-2 border-paper bg-subtle" style={{ width: 34, height: 34, marginLeft: i ? -10 : 0 }}>
          <Image source={faceImage({ look: p.look })} style={{ width: 30, height: 30 }} contentFit="cover" />
        </View>
      ))}
    </View>
  );
}

/**
 * BIENVENIDA — la puerta de entrada sin cuenta.
 * Una frase sobre Lovel House y tres preguntas (con quién, qué edad, qué situación).
 * Al terminar, Lovel House elige al personaje, abre una sesión de invitado y te
 * lleva directo al chat: el personaje te escribe primero. Allí puedes personalizarlo.
 */
export default function Welcome() {
  const { t, language } = useI18n();
  const { session, startGuest } = useAuth();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<Who | null>(null);
  const [ageId, setAgeId] = useState<string | null>(null);
  const [category, setCategory] = useState<ScenarioCategory | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [creating, setCreating] = useState<CharacterPreset | null>(null);
  /** Personaje elegido en cuanto se sabe género y edad (así las escenas ya llevan su nombre). */
  const [chosen, setChosen] = useState<CharacterPreset | null>(null);
  const scenarios = useMemo(() => SCENARIOS.filter((s) => s.category === category), [category]);

  const back = () => {
    if (step === 3 && category) {
      setCategory(null);
      setScenarioId(null);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const begin = async () => {
    if (!who || !ageId || !category) return;
    const age = AGES.find((a) => a.id === ageId)!.age;
    const preset = chosen ?? choosePreset(who, age);
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? pick(scenarios);
    setCreating(preset);
    try {
      if (!session) await startGuest();
      const avatar = await createFromDraft({
        name: preset.name,
        gender: preset.gender as Gender,
        age,
        look: preset.look,
        traits: preset.traits,
        scenarioId: scenario.id,
        customScene: '',
        step: 3,
        ready: true,
        snapshot: null,
        savedAt: Date.now(),
      });
      router.replace({ pathname: '/chat/[avatarId]', params: { avatarId: avatar.id, intro: '1' } });
    } catch (e) {
      setCreating(null);
      showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  // ------------------------------------------------ preparando al personaje
  if (creating) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-paper px-8">
        <Animated.View entering={FadeIn.duration(300)} className="items-center">
          <View className="overflow-hidden rounded-3xl border border-line bg-subtle" style={{ width: 180, height: 225 }}>
            <Image source={presetPortrait(creating.id)} style={{ width: 180, height: 225 }} contentFit="cover" />
          </View>
          <Text className="mt-6 text-center font-semibold text-[20px] tracking-tighter text-ink">{t('welcome.creating', { name: creating.name })}</Text>
          <Muted className="mt-1.5 text-center">{t('welcome.creatingHint')}</Muted>
          <ActivityIndicator className="mt-6" color={colors.muted} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------ portada
  if (step === 0) {
    return (
      <SafeAreaView className="flex-1 bg-paper">
        <View className="h-14 flex-row items-center justify-between px-4">
          <Logo size={24} withName />
          {!session ? <Button size="sm" variant="ghost" title={t('login.signIn')} onPress={() => router.push('/login')} /> : null}
        </View>
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 pb-10">
          <View className="w-full self-center" style={{ maxWidth: 440 }}>
            <Animated.View entering={FadeInDown.duration(400)} className="mb-8 flex-row justify-center">
              {['nyx', 'kai', 'aiko'].map((id, i) => (
                <View
                  key={id}
                  className="overflow-hidden rounded-2xl border-2 border-paper bg-subtle"
                  style={{ width: 104, height: 130, marginLeft: i ? -18 : 0, transform: [{ rotate: `${(i - 1) * 5}deg` }, { translateY: i === 1 ? -8 : 0 }], zIndex: i === 1 ? 2 : 1 }}
                >
                  <Image source={presetPortrait(id)} style={{ width: 100, height: 126 }} contentFit="cover" />
                </View>
              ))}
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
              <Text className="text-center font-semibold text-[30px] leading-[36px] tracking-tightest text-ink">{t('welcome.title')}</Text>
              <Muted className="mt-3 text-center text-[15px] leading-[22px]">{t('welcome.body')}</Muted>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(400)} className="mt-8">
              <Button title={t('welcome.start')} size="lg" onPress={() => setStep(1)} />
              <Text className="mt-3 text-center text-[12px] text-muted">{t('welcome.noAccount')}</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------ preguntas
  const canNext = step === 1 ? !!who : step === 2 ? !!ageId : !!category;
  const questions = [t('welcome.q.who'), t('welcome.q.age'), t('welcome.q.situation')];

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <View className="h-14 flex-row items-center px-2">
        <IconButton icon="chevron-back" label={t('common.back')} onPress={back} />
        <View className="mx-3 flex-1 flex-row" style={{ gap: 4 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-ink' : 'bg-line'}`} />
          ))}
        </View>
        <Text className="mr-3 text-[12px] text-muted">{t('create.stepOf', { n: step, total: 3 })}</Text>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-6 pt-4" keyboardShouldPersistTaps="handled">
        <View className="w-full self-center" style={{ maxWidth: 520 }}>
          <Animated.View key={`${step}-${category ?? ''}`} entering={FadeInDown.duration(280)}>
            <Text className="font-semibold text-[24px] leading-[30px] tracking-tighter text-ink">
              {step === 3 && category ? t('welcome.q.scene') : questions[step - 1]}
            </Text>
            <Muted className="mb-6 mt-1.5">{step === 1 ? t('welcome.h.who') : step === 2 ? t('welcome.h.age') : category ? t('welcome.h.scene') : t('welcome.h.situation')}</Muted>

            {step === 1 ? (
              <>
                <Option title={t('welcome.who.female')} selected={who === 'female'} onPress={() => setWho('female')} left={<Faces gender="female" />} />
                <Option title={t('welcome.who.male')} selected={who === 'male'} onPress={() => setWho('male')} left={<Faces gender="male" />} />
                <Option title={t('welcome.who.any')} hint={t('welcome.who.anyHint')} selected={who === 'any'} onPress={() => setWho('any')} left={<Faces gender="any" />} />
              </>
            ) : null}

            {step === 2
              ? AGES.map((a) => <Option key={a.id} title={t('welcome.age.years', { range: a.range })} hint={t(`welcome.age.${a.id}`)} selected={ageId === a.id} onPress={() => setAgeId(a.id)} />)
              : null}

            {step === 3 && !category ? (
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {SCENARIO_CATEGORIES.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCategory(c.id);
                      setScenarioId(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={c.label[language]}
                    className="rounded-2xl border border-line bg-paper p-3.5 active:bg-subtle"
                    style={{ width: '48%', cursor: 'pointer' } as object}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-subtle">
                      <Ionicons name={CATEGORY_ICON[c.id]} size={18} color={colors.ink} />
                    </View>
                    <Text className="mt-2.5 font-semibold text-[15px] tracking-tight text-ink">{c.label[language]}</Text>
                    <Text className="mt-0.5 text-[12px] leading-[17px] text-muted" numberOfLines={2}>
                      {SCENARIOS.find((s) => s.category === c.id)?.title[language]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {step === 3 && category ? (
              <>
                <Option title={t('welcome.surprise')} hint={t('welcome.surpriseHint')} selected={scenarioId === null} onPress={() => setScenarioId(null)} left={<Ionicons name="shuffle" size={18} color={colors.ink} style={{ marginRight: 12 }} />} />
                {scenarios.map((s) => (
                  <Option key={s.id} title={s.title[language]} hint={fillName(s.setup[language], chosen?.name ?? '…')} selected={scenarioId === s.id} onPress={() => setScenarioId(s.id)} />
                ))}
              </>
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>
      <View className="border-t border-line px-5 pb-2 pt-3">
        <View className="w-full self-center" style={{ maxWidth: 520 }}>
          {step < 3 ? (
            <Button
              title={t('common.continue')}
              size="lg"
              disabled={!canNext}
              onPress={() => {
                if (step === 2 && who && ageId) setChosen(choosePreset(who, AGES.find((a) => a.id === ageId)!.age));
                setStep((s) => s + 1);
              }}
            />
          ) : (
            <Button title={t('welcome.go')} size="lg" variant="brand" disabled={!category} onPress={begin} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
