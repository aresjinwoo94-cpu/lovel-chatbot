import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterPortrait } from '@/components/CharacterPortrait';
import { Text, TextInput } from '@/components/Themed';
import { Button, Chip, Muted, SectionLabel, Swatch } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  ACCESSORY_CHOICES,
  BACKGROUND_CHOICES,
  BROW_CHOICES,
  type Choice,
  type ColorChoice,
  DEFAULT_FEMALE,
  EYE_CHOICES,
  EYE_COLORS,
  FACE_CHOICES,
  HAIR_CHOICES,
  HAIR_COLORS,
  MARK_CHOICES,
  MOUTH_CHOICES,
  OUTFIT_CHOICES,
  OUTFIT_COLORS,
  presetById,
  SKIN_CHOICES,
  toggleAccessory,
} from '@/lib/character/options';
import { BACKGROUNDS } from '@/lib/character/render';
import type { CharacterLook } from '@/lib/character/types';
import { createFromDraft, isAvatarLimit } from '@/lib/createCharacter';
import { showDialog } from '@/lib/dialog';
import { type CharacterDraft, clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import {
  conflictsWith,
  fillName,
  MAX_TRAITS,
  SCENARIO_CATEGORIES,
  type ScenarioCategory,
  scenarioById,
  SCENARIOS,
  traitById,
  TRAITS,
} from '@/lib/roleplay';
import type { Gender } from '@/lib/types';

type Tab = 'identity' | 'face' | 'hair' | 'outfit' | 'extras';
const STEPS = ['look', 'personality', 'scenario', 'preview'] as const;

const pickRandom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function randomLook(prev: CharacterLook): CharacterLook {
  const acc = Math.random() < 0.6 ? [pickRandom(ACCESSORY_CHOICES).id] : [];
  return {
    ...prev,
    face: pickRandom(FACE_CHOICES).id,
    skin: pickRandom(SKIN_CHOICES).hex,
    eyes: pickRandom(EYE_CHOICES).id,
    eyeColor: pickRandom(EYE_COLORS).hex,
    brows: pickRandom(BROW_CHOICES).id,
    mouth: pickRandom(MOUTH_CHOICES).id,
    marks: Math.random() < 0.7 ? ['blush'] : [],
    hair: pickRandom(HAIR_CHOICES).id,
    hairColor: pickRandom(HAIR_COLORS).hex,
    outfit: pickRandom(OUTFIT_CHOICES).id,
    outfitColor: null,
    accessories: acc,
    background: pickRandom(BACKGROUND_CHOICES).id,
  };
}

interface OptionGridProps {
  items: Choice[];
  value: string | string[];
  apply: (id: string) => CharacterLook;
  onPick: (look: CharacterLook) => void;
  tile: number;
  language: 'es' | 'en';
  crop?: 'face' | 'bust';
  multi?: boolean;
}

/** Cuadrícula de opciones con miniatura real del personaje con esa opción aplicada. */
function OptionGrid({ items, value, apply, onPick, tile, language, crop = 'face', multi }: OptionGridProps) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
      {items.map((it) => {
        const selected = Array.isArray(value) ? value.includes(it.id) : value === it.id;
        const preview = apply(it.id);
        return (
          <Pressable
            key={it.id}
            onPress={() => onPick(preview)}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: selected } : { selected }}
            accessibilityLabel={it.label[language]}
            style={{ width: tile }}
            className={`overflow-hidden rounded-2xl border-2 bg-paper ${selected ? 'border-primary' : 'border-line'}`}
          >
            <CharacterPortrait look={preview} size={tile - 4} crop={crop} animate={false} />
            <Text numberOfLines={1} className={`px-1.5 py-1.5 text-center text-[11px] ${selected ? 'font-semibold text-primary-deep' : 'text-ink'}`}>
              {it.label[language]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Swatches({ items, value, onPick, language }: { items: ColorChoice[]; value: string | null; onPick: (hex: string) => void; language: 'es' | 'en' }) {
  return (
    <View className="flex-row flex-wrap">
      {items.map((c) => (
        <Swatch key={c.id} color={c.hex} label={c.label[language]} selected={value?.toLowerCase() === c.hex.toLowerCase()} onPress={() => onPick(c.hex)} />
      ))}
    </View>
  );
}

/**
 * CREADOR DE PERSONAJES — público (no hace falta cuenta).
 * 1. Aspecto (cara, pelo, ropa, accesorios) · 2. Personalidad · 3. Escena · 4. Vista previa.
 * El borrador se guarda en el dispositivo; la cuenta solo se pide al empezar la historia.
 */
export default function CreateCharacter() {
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { preset: presetId } = useLocalSearchParams<{ preset?: string }>();
  const { width } = useWindowDimensions();
  const contentW = Math.min(width, 560) - 32;

  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>('identity');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [age, setAge] = useState(24);
  const [look, setLook] = useState<CharacterLook>(DEFAULT_FEMALE.look);
  const [traits, setTraits] = useState<string[]>([]);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [customScene, setCustomScene] = useState('');
  const [category, setCategory] = useState<ScenarioCategory | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const scroll = useRef<ScrollView>(null);

  // ---------------------------------------------------------- estado inicial
  useEffect(() => {
    (async () => {
      const preset = presetById(presetId);
      if (preset) {
        setName(preset.name);
        setGender(preset.gender);
        setAge(preset.age);
        setLook(preset.look);
        setTraits(preset.traits);
      } else {
        const d = await loadDraft();
        if (d) {
          setName(d.name);
          setGender(d.gender);
          setAge(d.age);
          setLook(d.look);
          setTraits(d.traits);
          setScenarioId(d.scenarioId);
          setCustomScene(d.customScene);
          setStep(Math.min(d.step, 3));
        }
      }
      setLoaded(true);
    })();
  }, [presetId]);

  const draft = useMemo<Omit<CharacterDraft, 'savedAt'>>(
    () => ({ name, gender, age, look, traits, scenarioId, customScene, step, ready: false }),
    [name, gender, age, look, traits, scenarioId, customScene, step],
  );

  // Guarda el borrador (sobrevive a recargas y al login).
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => saveDraft(draft), 400);
    return () => clearTimeout(id);
  }, [draft, loaded]);

  const set = useCallback(<K extends keyof CharacterLook>(key: K, value: CharacterLook[K]) => setLook((l) => ({ ...l, [key]: value })), []);
  const displayName = name.trim() || '…';
  const scenario = scenarioById(scenarioId);
  const sceneOk = !!scenario || customScene.trim().length >= 20;

  // ---------------------------------------------------------- navegación
  const goTo = (n: number) => {
    setStep(n);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const next = () => {
    if (step === 0 && !name.trim()) {
      setTab('identity');
      return showDialog(t('create.needName'));
    }
    if (step === 1 && traits.length === 0) return showDialog(t('create.needTraits'));
    if (step === 2 && !sceneOk) return showDialog(t('create.needScenario'));
    goTo(step + 1);
  };

  const back = () => {
    if (step > 0) return goTo(step - 1);
    if (router.canGoBack()) router.back();
    else router.replace('/explore');
  };

  const start = async () => {
    const final: Omit<CharacterDraft, 'savedAt'> = { ...draft, ready: true };
    if (!session) {
      // Sin cuenta: guardamos el personaje y pedimos la cuenta. Al entrar, /start lo crea.
      await saveDraft(final);
      // replace: al iniciar sesión, la navegación vuelve al inicio y /start crea el personaje.
      router.replace('/login');
      return;
    }
    setSaving(true);
    try {
      const avatar = await createFromDraft({ ...final, savedAt: Date.now() });
      await clearDraft();
      router.replace({ pathname: '/chat/[avatarId]', params: { avatarId: avatar.id } });
    } catch (e) {
      if (isAvatarLimit(e)) {
        showDialog(t('create.limitReached'), undefined, [
          { text: t('pro.cta'), onPress: () => router.push('/pro') },
          { text: t('pro.notNow'), style: 'cancel' },
        ]);
      } else showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleTrait = (id: string) => {
    setTraits((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_TRAITS || conflictsWith(id, cur) ? cur : [...cur, id]));
  };

  // ---------------------------------------------------------- piezas
  const cols = contentW > 420 ? 4 : 3;
  const tile = (contentW - (cols - 1) * 10) / cols;

  // ---------------------------------------------------------- pasos
  const lookStep = (
    <View>
      <View className="-mx-4 mb-1 flex-row border-b border-line px-4">
        {(['identity', 'face', 'hair', 'outfit', 'extras'] as Tab[]).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} className={`mr-4 border-b-2 pb-2 pt-1 ${tab === k ? 'border-primary' : 'border-transparent'}`}>
            <Text className={`text-sm ${tab === k ? 'font-bold text-primary-deep' : 'text-muted'}`}>{t(`create.tab.${k}`)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'identity' ? (
        <Animated.View entering={FadeIn}>
          <SectionLabel>{t('create.name')}</SectionLabel>
          <TextInput
            value={name}
            onChangeText={(v) => setName(v.slice(0, 40))}
            placeholder={t('create.name.placeholder')}
            placeholderTextColor={colors.muted}
            className="h-14 rounded-2xl border border-line bg-paper px-5 font-serif text-xl text-ink"
          />
          <SectionLabel>{t('create.gender')}</SectionLabel>
          <View className="flex-row flex-wrap">
            {(['female', 'male', 'other'] as Gender[]).map((g) => (
              <Chip key={g} label={t(`create.gender.${g}`)} selected={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>
          <SectionLabel>{t('create.age')}</SectionLabel>
          <View className="flex-row items-center">
            <Pressable onPress={() => setAge((a) => Math.max(18, a - 1))} className="h-11 w-11 items-center justify-center rounded-full border border-line bg-paper">
              <Ionicons name="remove" size={20} color={colors.ink} />
            </Pressable>
            <Text className="mx-5 min-w-[96px] text-center font-semibold text-lg text-ink">{t('create.age.years', { n: age })}</Text>
            <Pressable onPress={() => setAge((a) => Math.min(60, a + 1))} className="h-11 w-11 items-center justify-center rounded-full border border-line bg-paper">
              <Ionicons name="add" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <Pressable onPress={() => setLook(randomLook(look))} className="mt-6 flex-row items-center self-start rounded-full bg-primary-soft px-4 py-2.5 active:opacity-80">
            <Ionicons name="shuffle" size={18} color={colors.primaryDeep} />
            <Text className="ml-2 font-semibold text-sm text-primary-deep">{t('create.randomize')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {tab === 'face' ? (
        <Animated.View entering={FadeIn}>
          <SectionLabel>{t('create.sec.faceShape')}</SectionLabel>
          <OptionGrid tile={tile} language={language} onPick={setLook} items={FACE_CHOICES} value={look.face} apply={(id) => ({ ...look, face: id })} />
          <SectionLabel>{t('create.sec.skin')}</SectionLabel>
          <Swatches language={language} items={SKIN_CHOICES} value={look.skin} onPick={(hex) => set('skin', hex)} />
          <SectionLabel>{t('create.sec.eyes')}</SectionLabel>
          <OptionGrid tile={tile} language={language} onPick={setLook} items={EYE_CHOICES} value={look.eyes} apply={(id) => ({ ...look, eyes: id })} />
          <SectionLabel>{t('create.sec.eyeColor')}</SectionLabel>
          <Swatches language={language} items={EYE_COLORS} value={look.eyeColor} onPick={(hex) => set('eyeColor', hex)} />
          <SectionLabel>{t('create.sec.brows')}</SectionLabel>
          <OptionGrid tile={tile} language={language} onPick={setLook} items={BROW_CHOICES} value={look.brows} apply={(id) => ({ ...look, brows: id })} />
          <SectionLabel>{t('create.sec.mouth')}</SectionLabel>
          <OptionGrid tile={tile} language={language} onPick={setLook} items={MOUTH_CHOICES} value={look.mouth} apply={(id) => ({ ...look, mouth: id })} />
          <SectionLabel>{t('create.sec.marks')}</SectionLabel>
          <OptionGrid
            tile={tile}
            language={language}
            onPick={setLook}
            multi
            items={MARK_CHOICES}
            value={look.marks}
            apply={(id) => ({ ...look, marks: look.marks.includes(id) ? look.marks.filter((m) => m !== id) : [...look.marks, id] })}
          />
        </Animated.View>
      ) : null}

      {tab === 'hair' ? (
        <Animated.View entering={FadeIn}>
          <SectionLabel>{t('create.sec.hairColor')}</SectionLabel>
          <Swatches language={language} items={HAIR_COLORS} value={look.hairColor} onPick={(hex) => set('hairColor', hex)} />
          <SectionLabel>{t('create.sec.hairStyle')}</SectionLabel>
          <OptionGrid tile={tile} language={language} onPick={setLook} items={HAIR_CHOICES} value={look.hair} apply={(id) => ({ ...look, hair: id })} crop="bust" />
        </Animated.View>
      ) : null}

      {tab === 'outfit' ? (
        <Animated.View entering={FadeIn}>
          <SectionLabel>{t('create.sec.outfit')}</SectionLabel>
          <OptionGrid tile={tile} language={language} onPick={setLook} items={OUTFIT_CHOICES} value={look.outfit} apply={(id) => ({ ...look, outfit: id, outfitColor: null })} crop="bust" />
          <SectionLabel>{t('create.sec.outfitColor')}</SectionLabel>
          <View className="flex-row flex-wrap items-center">
            <Pressable
              onPress={() => set('outfitColor', null)}
              className={`mb-2 mr-2 h-11 items-center justify-center rounded-full border-2 px-3 ${look.outfitColor === null ? 'border-primary' : 'border-line'}`}
            >
              <Text className="text-xs text-ink">{t('create.sec.original')}</Text>
            </Pressable>
            <Swatches language={language} items={OUTFIT_COLORS} value={look.outfitColor} onPick={(hex) => set('outfitColor', hex)} />
          </View>
        </Animated.View>
      ) : null}

      {tab === 'extras' ? (
        <Animated.View entering={FadeIn}>
          <SectionLabel>{t('create.sec.accessories')}</SectionLabel>
          <Muted className="-mt-1 mb-2 text-xs">{t('create.sec.accessoriesHint')}</Muted>
          <OptionGrid tile={tile} language={language} onPick={setLook} multi items={ACCESSORY_CHOICES} value={look.accessories} apply={(id) => ({ ...look, accessories: toggleAccessory(look.accessories, id) })} crop="bust" />
          <SectionLabel>{t('create.sec.background')}</SectionLabel>
          <View className="flex-row flex-wrap">
            {BACKGROUND_CHOICES.map((b) => (
              <Swatch key={b.id} color={BACKGROUNDS[b.id][0]} label={b.label[language]} selected={look.background === b.id} onPress={() => set('background', b.id)} />
            ))}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );

  const personalityStep = (
    <Animated.View entering={FadeIn}>
      <Text className="font-serif text-[28px] leading-[34px] text-ink">{t('create.personality.q', { name: displayName })}</Text>
      <Muted className="mb-4 mt-1">{t('create.personality.hint')}</Muted>
      <View className="flex-row flex-wrap">
        {TRAITS.map((tr) => {
          const selected = traits.includes(tr.id);
          const blocked = !selected && (traits.length >= MAX_TRAITS || !!conflictsWith(tr.id, traits));
          return <Chip key={tr.id} emoji={tr.emoji} label={tr.label[language]} selected={selected} disabled={blocked} onPress={() => toggleTrait(tr.id)} />;
        })}
      </View>
      <Muted className="mt-2 text-xs">
        {traits.length}/{MAX_TRAITS}
        {traits.length >= MAX_TRAITS ? ` · ${t('create.personality.max')}` : ''}
      </Muted>
      {traits.map((id) => {
        const tr = traitById(id);
        return tr ? (
          <Muted key={id} className="mt-2 text-[13px] leading-5">
            {tr.emoji} <Text className="font-semibold text-[13px] text-ink">{tr.label[language]}</Text> — {tr.prompt.split(': ').slice(1).join(': ')}
          </Muted>
        ) : null;
      })}
    </Animated.View>
  );

  const scenarios = SCENARIOS.filter((s) => category === 'all' || s.category === category);
  const scenarioStep = (
    <Animated.View entering={FadeIn}>
      <Text className="font-serif text-[28px] leading-[34px] text-ink">{t('create.scenario.q')}</Text>
      <Muted className="mb-3 mt-1">{t('create.scenario.hint', { name: displayName })}</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-2" contentContainerClassName="px-4">
        <Chip label={t('create.scenario.all')} selected={category === 'all'} onPress={() => setCategory('all')} />
        {SCENARIO_CATEGORIES.map((c) => (
          <Chip key={c.id} emoji={c.emoji} label={c.label[language]} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>
      {scenarios.map((s) => {
        const selected = scenarioId === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => setScenarioId(selected ? null : s.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`mb-3 rounded-3xl border-2 bg-paper p-4 ${selected ? 'border-primary' : 'border-line'}`}
          >
            <View className="flex-row items-center">
              <Text className="mr-2 text-xl">{s.emoji}</Text>
              <Text className="flex-1 font-bold text-base text-ink">{s.title[language]}</Text>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </View>
            <Text className="mt-2 text-sm leading-5 text-muted">{fillName(s.setup[language], displayName)}</Text>
          </Pressable>
        );
      })}
      <View className={`mb-2 rounded-3xl border-2 bg-paper p-4 ${!scenario && customScene.trim() ? 'border-primary' : 'border-dashed border-line'}`}>
        <Text className="font-bold text-base text-ink">✍️ {t('create.scenario.custom')}</Text>
        <Muted className="mt-1 text-[13px]">{t('create.scenario.customHint', { name: displayName })}</Muted>
        <TextInput
          value={customScene}
          onChangeText={(v) => {
            setCustomScene(v.slice(0, 800));
            if (v.trim()) setScenarioId(null);
          }}
          multiline
          placeholder={t('create.scenario.customPlaceholder', { name: displayName })}
          placeholderTextColor={colors.muted}
          className="mt-3 min-h-[96px] rounded-2xl bg-cream p-3 text-[15px] leading-[22px] text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </View>
    </Animated.View>
  );

  const previewSize = Math.min(contentW, 340);
  const previewStep = (
    <Animated.View entering={FadeInDown.duration(350)} className="items-center">
      <View className="overflow-hidden rounded-[32px] border-4 border-paper" style={{ shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 20, elevation: 5 }}>
        <CharacterPortrait look={look} gender={gender} size={previewSize} />
      </View>
      <Text className="mt-5 font-serif text-[40px] leading-[46px] text-ink">{displayName}</Text>
      <Muted>
        {t(`create.gender.${gender}`)} · {t('create.age.years', { n: age })}
      </Muted>
      <View className="mt-5 w-full">
        <SectionLabel className="mt-0">{t('create.preview.personality')}</SectionLabel>
        <View className="flex-row flex-wrap">
          {traits.map((id) => (
            <View key={id} className="mb-2 mr-2 rounded-full bg-primary-soft px-3 py-1.5">
              <Text className="text-sm text-primary-deep">
                {traitById(id)?.emoji} {traitById(id)?.label[language]}
              </Text>
            </View>
          ))}
        </View>
        <SectionLabel>{t('create.preview.scene')}</SectionLabel>
        <View className="rounded-3xl bg-accent-soft p-4">
          {scenario ? <Text className="mb-1 font-bold text-base text-ink">{scenario.emoji} {scenario.title[language]}</Text> : null}
          <Text className="font-serif text-[17px] leading-6 text-ink">{scenario ? fillName(scenario.setup[language], displayName) : customScene.trim()}</Text>
        </View>
        <View className="mt-4 flex-row items-center justify-center">
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
          <Muted className="ml-2">{t('create.preview.firstMessage', { name: displayName })}</Muted>
        </View>
      </View>
    </Animated.View>
  );

  if (!loaded) return <View className="flex-1 bg-cream" />;

  const stepLabels = [t('create.step.look'), t('create.step.personality'), t('create.step.scenario'), t('create.step.preview')];

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Encabezado con pasos */}
        <View className="w-full self-center px-4 pb-2 pt-1" style={{ maxWidth: 560 }}>
          <View className="flex-row items-center">
            <Pressable onPress={back} hitSlop={10} accessibilityLabel={t('common.back')} className="h-10 w-10 items-center justify-center rounded-full bg-paper">
              <Ionicons name={step === 0 ? 'close' : 'chevron-back'} size={22} color={colors.ink} />
            </Pressable>
            <Text className="ml-3 flex-1 font-bold text-base text-ink">{t('create.title')}</Text>
            <Text className="font-semibold text-xs text-muted">
              {step + 1}/{STEPS.length}
            </Text>
          </View>
          <View className="mt-3 flex-row" style={{ gap: 6 }}>
            {stepLabels.map((label, i) => (
              <Pressable key={label} onPress={() => (i < step ? goTo(i) : undefined)} className="flex-1">
                <View className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-line'}`} />
                <Text className={`mt-1 text-[10px] ${i === step ? 'font-semibold text-primary-deep' : 'text-muted'}`} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Vista previa en vivo mientras personalizas */}
        {step === 0 ? (
          <View className="items-center pb-2">
            <View className="overflow-hidden rounded-[28px] border-4 border-paper">
              <CharacterPortrait look={look} gender={gender} size={Math.min(contentW * 0.58, 230)} />
            </View>
            <Text className="mt-1 font-serif text-2xl text-ink" numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        ) : null}

        <ScrollView ref={scroll} className="flex-1" contentContainerClassName="pb-6" keyboardShouldPersistTaps="handled">
          <View className="w-full self-center px-4 pt-2" style={{ maxWidth: 560 }}>
            {step === 0 ? lookStep : step === 1 ? personalityStep : step === 2 ? scenarioStep : previewStep}
          </View>
        </ScrollView>

        {/* Pie con acciones */}
        <View className="w-full self-center border-t border-line bg-cream px-4 pb-2 pt-3" style={{ maxWidth: 560 }}>
          {step < 3 ? (
            <Button title={t('common.continue')} onPress={next} />
          ) : (
            <>
              <Button title={session ? t('create.preview.cta') : t('create.preview.ctaLogin')} onPress={start} loading={saving} />
              {!session ? <Muted className="mt-2 text-center text-xs">{t('create.preview.loginNote', { name: displayName })}</Muted> : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
