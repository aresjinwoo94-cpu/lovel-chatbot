import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, type ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { Button, Caption, Display, Field, IconButton, Muted, SectionLabel, Segmented, Swatch, Tag } from '@/components/ui';
import { VrmAvatar, type VrmAvatarHandle } from '@/components/VrmAvatar';
import { colors } from '@/constants/theme';
import { readRecording } from '@/lib/audio';
import { useAuth } from '@/lib/auth';
import {
  ACCESSORIES,
  BACKGROUNDS,
  type ColorChoice,
  DEFAULT_FEMALE,
  EXPRESSIONS,
  EYE_COLORS,
  HAIR_COLORS,
  hairCompatible,
  HAIRSTYLES,
  isCustomModel,
  MODELS,
  OUTFIT_COLORS,
  presetById,
  SKIN_TONES,
  toggleAccessory,
} from '@/lib/character/catalog';
import { modelPortrait } from '@/lib/character/media';
import type { CharacterLook, Expression } from '@/lib/character/types';
import { createFromDraft, isAvatarLimit } from '@/lib/createCharacter';
import { uploadCustomVrm } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { type CharacterDraft, clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import { conflictsWith, fillName, MAX_TRAITS, SCENARIO_CATEGORIES, type ScenarioCategory, scenarioById, SCENARIOS, traitById, TRAITS } from '@/lib/roleplay';
import type { Gender } from '@/lib/types';

type Tab = 'model' | 'hair' | 'colors' | 'style' | 'identity';
const STEPS = 4;
const MAX_VRM_BYTES = 40 * 1024 * 1024;

// ------------------------------------------------------------------ piezas
function OptionTile({ label, image, selected, onPress, width, disabled }: { label: string; image?: ImageSourcePropType; selected: boolean; onPress: () => void; width: number; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={{ width }}
      className={disabled ? 'opacity-35' : 'active:opacity-80'}
    >
      <View className={`overflow-hidden rounded-xl border-2 ${selected ? 'border-primary' : 'border-transparent'}`}>
        <View className="overflow-hidden rounded-[10px] bg-subtle">
          {image ? <Image source={image} style={{ width: width - 4, height: (width - 4) * 1.1 }} contentFit="cover" contentPosition="top" transition={120} /> : <View style={{ width: width - 4, height: (width - 4) * 1.1 }} />}
        </View>
      </View>
      <Text numberOfLines={1} className={`mt-1.5 text-center text-[12px] ${selected ? 'font-semibold text-primary-deep' : 'font-medium text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function ColorRow({ items, value, onPick, language, originalLabel }: { items: ColorChoice[]; value: string | null; onPick: (hex: string | null) => void; language: 'es' | 'en'; originalLabel: string }) {
  return (
    <View className="flex-row flex-wrap items-center">
      <Pressable
        onPress={() => onPick(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === null }}
        className={`mb-2.5 mr-2.5 h-10 items-center justify-center rounded-full border px-3.5 ${value === null ? 'border-primary bg-primary-soft' : 'border-line bg-paper'}`}
      >
        <Text className={`text-[12px] ${value === null ? 'font-semibold text-primary-deep' : 'font-medium text-ink'}`}>{originalLabel}</Text>
      </Pressable>
      {items.map((c) => (
        <Swatch key={c.id} color={c.hex} label={c.label[language]} selected={value?.toLowerCase() === c.hex.toLowerCase()} onPress={() => onPick(c.hex)} />
      ))}
    </View>
  );
}

/**
 * CREADOR DE PERSONAJES — público (no hace falta cuenta).
 * 1. Aspecto (modelo VRM, peinado, colores, estilo) · 2. Personalidad · 3. Escena · 4. Vista previa.
 * El borrador se guarda en el dispositivo; la cuenta solo se pide al empezar la historia.
 */
export default function CreateCharacter() {
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { preset: presetId } = useLocalSearchParams<{ preset?: string }>();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const panelW = wide ? Math.min(560, width - Math.min(width * 0.42, 520)) : Math.min(width, 640);
  const contentW = panelW - 32;

  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>('model');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [age, setAge] = useState(24);
  const [look, setLook] = useState<CharacterLook>(DEFAULT_FEMALE.look);
  const [traits, setTraits] = useState<string[]>([]);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [customScene, setCustomScene] = useState('');
  const [category, setCategory] = useState<ScenarioCategory | 'all'>('all');
  const [stageReady, setStageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const stage = useRef<VrmAvatarHandle>(null);
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
        if (d && (d.look as { v?: number })?.v === 3) {
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

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => saveDraft(draft), 400);
    return () => clearTimeout(id);
  }, [draft, loaded]);

  const patch = useCallback((p: Partial<CharacterLook>) => setLook((l) => ({ ...l, ...p })), []);
  const displayName = name.trim() || '…';
  const scenario = scenarioById(scenarioId);
  const sceneOk = !!scenario || customScene.trim().length >= 20;
  const canHair = hairCompatible(look.model);

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
    setSaving(true);
    // Foto de perfil desde el 3D (primer plano, ojos abiertos).
    const snapshot = await stage.current?.snapshot({ framing: 'face', size: 384 }).catch(() => null);
    const final: Omit<CharacterDraft, 'savedAt'> = { ...draft, snapshot: snapshot ?? null, ready: true };
    if (!session) {
      await saveDraft(final);
      setSaving(false);
      // replace: al iniciar sesión la navegación vuelve al inicio y /start crea el personaje.
      router.replace('/login');
      return;
    }
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

  const importVrm = async () => {
    if (!session) {
      return showDialog(t('create.importNeedsAccount'), undefined, [
        { text: t('login.signIn'), onPress: () => router.push('/login') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const file = res.assets[0];
    if (!file.name.toLowerCase().endsWith('.vrm')) return showDialog(t('create.vrmOnly'));
    if ((file.size ?? 0) > MAX_VRM_BYTES) return showDialog(t('create.vrmTooBig'));
    setImporting(true);
    try {
      const { base64 } = await readRecording(file.uri);
      const url = await uploadCustomVrm(base64);
      setLook((l) => ({ ...l, model: url, hair: null, hairColor: null, outfitColor: null, skinTone: null, eyeColor: null }));
    } catch (e) {
      showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const toggleTrait = (id: string) => {
    setTraits((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_TRAITS || conflictsWith(id, cur) ? cur : [...cur, id]));
  };

  // ---------------------------------------------------------- pasos
  const cols = contentW >= 480 ? 4 : 3;
  const tile = (contentW - (cols - 1) * 10) / cols;

  const lookStep = (
    <View>
      <View className="-mx-4 mb-1 border-b border-line">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
          {(['model', 'hair', 'colors', 'style', 'identity'] as Tab[]).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} className={`mr-5 border-b-2 pb-2.5 pt-1 ${tab === k ? 'border-ink' : 'border-transparent'}`}>
              <Text className={`text-[14px] ${tab === k ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>{t(`create.tab.${k}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {tab === 'model' ? (
        <View>
          <SectionLabel>{t('create.sec.model')}</SectionLabel>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {MODELS.filter((m) => gender === 'other' || m.gender === gender).map((m) => (
              <OptionTile
                key={m.id}
                width={tile}
                label={m.label[language]}
                image={modelPortrait(m.id)}
                selected={look.model === m.id}
                onPress={() => patch({ model: m.id, hair: m.vrm1 ? null : look.hair, outfitColor: null })}
              />
            ))}
          </View>
          <Pressable onPress={importVrm} disabled={importing} className="mt-5 flex-row items-center rounded-2xl border border-dashed border-line bg-paper p-4 active:bg-subtle">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-subtle">
              {importing ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="cloud-upload-outline" size={20} color={colors.ink} />}
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-[14px] text-ink">{isCustomModel(look.model) ? t('create.importDone') : t('create.import')}</Text>
              <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">{t('create.importHint')}</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {tab === 'hair' ? (
        <View>
          <SectionLabel>{t('create.sec.hairStyle')}</SectionLabel>
          {!canHair ? <Muted className="mb-3 text-[13px]">{t('create.hairLocked')}</Muted> : null}
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            <OptionTile width={tile} label={t('create.hairOwn')} image={isCustomModel(look.model) ? undefined : modelPortrait(look.model)} selected={!look.hair} onPress={() => patch({ hair: null })} />
            {HAIRSTYLES.filter((h) => h.id !== look.model).map((h) => (
              <OptionTile key={h.id} width={tile} label={h.label[language]} image={modelPortrait(h.id)} selected={look.hair === h.id} disabled={!canHair} onPress={() => patch({ hair: h.id })} />
            ))}
          </View>
        </View>
      ) : null}

      {tab === 'colors' ? (
        <View>
          <SectionLabel>{t('create.sec.hairColor')}</SectionLabel>
          <ColorRow items={HAIR_COLORS} value={look.hairColor} onPick={(hex) => patch({ hairColor: hex })} language={language} originalLabel={t('create.sec.original')} />
          <SectionLabel>{t('create.sec.eyeColor')}</SectionLabel>
          <ColorRow items={EYE_COLORS} value={look.eyeColor} onPick={(hex) => patch({ eyeColor: hex })} language={language} originalLabel={t('create.sec.original')} />
          <SectionLabel>{t('create.sec.skin')}</SectionLabel>
          <ColorRow items={SKIN_TONES} value={look.skinTone} onPick={(hex) => patch({ skinTone: hex })} language={language} originalLabel={t('create.sec.original')} />
          <SectionLabel>{t('create.sec.outfitColor')}</SectionLabel>
          <ColorRow items={OUTFIT_COLORS} value={look.outfitColor} onPick={(hex) => patch({ outfitColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </View>
      ) : null}

      {tab === 'style' ? (
        <View>
          <SectionLabel>{t('create.sec.expression')}</SectionLabel>
          <Segmented<Expression> value={look.expression} onChange={(id) => patch({ expression: id })} options={EXPRESSIONS.map((e) => ({ id: e.id, label: e.label[language] }))} />
          <SectionLabel>{t('create.sec.accessories')}</SectionLabel>
          <View className="flex-row flex-wrap">
            {ACCESSORIES.map((a) => (
              <Tag key={a.id} label={a.label[language]} selected={look.accessories.includes(a.id)} onPress={() => patch({ accessories: toggleAccessory(look.accessories, a.id) })} />
            ))}
          </View>
          <SectionLabel>{t('create.sec.background')}</SectionLabel>
          <View className="flex-row flex-wrap">
            {BACKGROUNDS.map((b) => (
              <Swatch key={b.id} color={b.hex} label={b.label[language]} selected={look.background === b.id} onPress={() => patch({ background: b.id })} />
            ))}
          </View>
        </View>
      ) : null}

      {tab === 'identity' ? (
        <View>
          <View className="mt-5">
            <Field label={t('create.name')} value={name} onChangeText={(v) => setName(v.slice(0, 40))} placeholder={t('create.name.placeholder')} />
          </View>
          <SectionLabel>{t('create.gender')}</SectionLabel>
          <Segmented<Gender>
            value={gender}
            onChange={setGender}
            options={[
              { id: 'female', label: t('create.gender.female') },
              { id: 'male', label: t('create.gender.male') },
              { id: 'other', label: t('create.gender.other') },
            ]}
          />
          <SectionLabel>{t('create.age')}</SectionLabel>
          <View className="flex-row items-center">
            <IconButton icon="remove" variant="outline" label="-" onPress={() => setAge((a) => Math.max(18, a - 1))} />
            <Text className="mx-5 min-w-[88px] text-center font-semibold text-[16px] text-ink">{t('create.age.years', { n: age })}</Text>
            <IconButton icon="add" variant="outline" label="+" onPress={() => setAge((a) => Math.min(60, a + 1))} />
          </View>
        </View>
      ) : null}
    </View>
  );

  const personalityStep = (
    <View>
      <Display className="text-[24px] leading-[30px]">{t('create.personality.q', { name: displayName })}</Display>
      <Muted className="mb-5 mt-1.5">{t('create.personality.hint')}</Muted>
      <View className="flex-row flex-wrap">
        {TRAITS.map((tr) => {
          const selected = traits.includes(tr.id);
          const blocked = !selected && (traits.length >= MAX_TRAITS || !!conflictsWith(tr.id, traits));
          return <Tag key={tr.id} label={tr.label[language]} selected={selected} disabled={blocked} onPress={() => toggleTrait(tr.id)} />;
        })}
      </View>
      <Caption className="mt-2">
        {traits.length}/{MAX_TRAITS}
        {traits.length >= MAX_TRAITS ? ` · ${t('create.personality.max')}` : ''}
      </Caption>
      {traits.length ? (
        <View className="mt-5 rounded-2xl border border-line bg-paper">
          {traits.map((id, i) => {
            const tr = traitById(id);
            return tr ? (
              <View key={id} className={`px-4 py-3 ${i < traits.length - 1 ? 'border-b border-line' : ''}`}>
                <Text className="font-semibold text-[14px] text-ink">{tr.label[language]}</Text>
                <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{tr.prompt.split(': ').slice(1).join(': ')}</Text>
              </View>
            ) : null;
          })}
        </View>
      ) : null}
    </View>
  );

  const scenarios = SCENARIOS.filter((s) => category === 'all' || s.category === category);
  const scenarioStep = (
    <View>
      <Display className="text-[24px] leading-[30px]">{t('create.scenario.q')}</Display>
      <Muted className="mb-4 mt-1.5">{t('create.scenario.hint', { name: displayName })}</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-3" contentContainerClassName="px-4">
        <Tag label={t('create.scenario.all')} selected={category === 'all'} onPress={() => setCategory('all')} />
        {SCENARIO_CATEGORIES.map((c) => (
          <Tag key={c.id} label={c.label[language]} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>
      <View className="overflow-hidden rounded-2xl border border-line bg-paper">
        {scenarios.map((s, i) => {
          const selected = scenarioId === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setScenarioId(selected ? null : s.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`flex-row px-4 py-3.5 ${i < scenarios.length - 1 ? 'border-b border-line' : ''} ${selected ? 'bg-primary-soft' : 'active:bg-subtle'}`}
            >
              <View className="mr-3 flex-1">
                <Text className="font-semibold text-[14px] text-ink">{s.title[language]}</Text>
                <Text className="mt-1 text-[13px] leading-[19px] text-muted">{fillName(s.setup[language], displayName)}</Text>
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.line} />
            </Pressable>
          );
        })}
      </View>
      <SectionLabel>{t('create.scenario.custom')}</SectionLabel>
      <TextInput
        value={customScene}
        onChangeText={(v) => {
          setCustomScene(v.slice(0, 800));
          if (v.trim()) setScenarioId(null);
        }}
        multiline
        placeholder={t('create.scenario.customPlaceholder', { name: displayName })}
        placeholderTextColor={colors.muted}
        className={`min-h-[110px] rounded-xl border bg-paper p-3.5 text-[15px] leading-[22px] text-ink ${!scenario && customScene.trim() ? 'border-primary' : 'border-line'}`}
        style={{ textAlignVertical: 'top', outlineStyle: 'none' } as object}
      />
      <Caption className="mt-1.5">{t('create.scenario.customHint', { name: displayName })}</Caption>
    </View>
  );

  const previewStep = (
    <View>
      <Caption>{t('create.preview.title')}</Caption>
      <Display className="mt-1">{displayName}</Display>
      <Muted className="mt-0.5">
        {t(`create.gender.${gender}`)} · {t('create.age.years', { n: age })}
      </Muted>
      <SectionLabel>{t('create.preview.personality')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {traits.map((id) => (
          <View key={id} className="mb-2 mr-2 h-8 justify-center rounded-full bg-subtle px-3">
            <Text className="font-medium text-[13px] text-ink">{traitById(id)?.label[language]}</Text>
          </View>
        ))}
      </View>
      <SectionLabel>{t('create.preview.scene')}</SectionLabel>
      <View className="rounded-2xl border border-line bg-paper p-4">
        {scenario ? <Text className="mb-1 font-semibold text-[14px] text-ink">{scenario.title[language]}</Text> : null}
        <Text className="text-[14px] leading-[21px] text-ink">{scenario ? fillName(scenario.setup[language], displayName) : customScene.trim()}</Text>
      </View>
      <View className="mt-4 flex-row items-center">
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.muted} />
        <Muted className="ml-2 text-[13px]">{t('create.preview.firstMessage', { name: displayName })}</Muted>
      </View>
    </View>
  );

  if (!loaded) return <View className="flex-1 bg-cream" />;

  const stepLabels = [t('create.step.look'), t('create.step.personality'), t('create.step.scenario'), t('create.step.preview')];
  // En móvil el escenario 3D se ve arriba en "Aspecto" y "Vista previa"; en escritorio siempre a la izquierda.
  const showStage = wide || step === 0 || step === 3;
  const stageH = wide ? undefined : step === 3 ? Math.min(height * 0.48, 440) : Math.min(height * 0.38, 330);

  const stageView = (
    <View className={wide ? 'flex-1 border-r border-line' : 'border-b border-line'} style={wide ? undefined : { height: stageH }}>
      <VrmAvatar ref={stage} look={look} gender={gender} framing={wide || step === 3 ? 'portrait' : 'bust'} style={{ flex: 1 }} onLoaded={() => setStageReady(true)} />
      {!stageReady ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      {/* Barra superior con pasos */}
      <View className="border-b border-line bg-cream">
        <View className="h-14 flex-row items-center px-2">
          <IconButton icon={step === 0 ? 'close' : 'chevron-back'} label={t('common.back')} onPress={back} />
          <Text className="ml-1 flex-1 font-semibold text-[15px] tracking-tight text-ink">{t('create.title')}</Text>
          <Caption className="mr-3">
            {t('create.stepOf', { n: step + 1, total: STEPS })} · {stepLabels[step]}
          </Caption>
        </View>
        <View className="flex-row px-4 pb-3" style={{ gap: 4 }}>
          {stepLabels.map((label, i) => (
            <Pressable key={label} onPress={() => (i < step ? goTo(i) : undefined)} className="flex-1" accessibilityLabel={label}>
              <View className={`h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-line'}`} />
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className={`flex-1 ${wide ? 'flex-row' : ''}`}>
          {showStage ? stageView : null}
          <View className={wide ? '' : 'flex-1'} style={wide ? { width: panelW } : undefined}>
            <ScrollView ref={scroll} className="flex-1" contentContainerClassName="pb-8" keyboardShouldPersistTaps="handled">
              <View className="w-full self-center px-4 pt-4" style={{ maxWidth: 640 }}>
                {step === 0 ? lookStep : step === 1 ? personalityStep : step === 2 ? scenarioStep : previewStep}
              </View>
            </ScrollView>
            <View className="border-t border-line bg-cream px-4 pb-2 pt-3">
              {step < 3 ? (
                <Button title={t('common.continue')} onPress={next} size="lg" />
              ) : (
                <>
                  <Button title={session ? t('create.preview.cta') : t('create.preview.ctaLogin')} onPress={start} loading={saving} size="lg" variant="brand" />
                  {!session ? <Caption className="mt-2 text-center">{t('create.preview.loginNote', { name: displayName })}</Caption> : null}
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
