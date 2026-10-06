import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, type ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { Badge, Button, Caption, Display, Field, IconButton, Muted, Segmented, Slider, Swatch, Tag } from '@/components/ui';
import { VrmAvatar, type VrmAvatarHandle } from '@/components/VrmAvatar';
import { colors } from '@/constants/theme';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabaseConfig';
import { readRecording } from '@/lib/audio';
import { useAuth } from '@/lib/auth';
import {
  ACCESSORIES,
  ACCESSORY_GROUPS,
  BACKGROUNDS,
  type ColorChoice,
  DEFAULT_FEMALE,
  DEFAULT_MALE,
  EFFECTS,
  EXPRESSIONS,
  EYE_COLORS,
  EYESHADOWS,
  HAIR_COLORS,
  hairCompatible,
  HAIRSTYLES,
  isCustomModel,
  LIGHTINGS,
  LIP_COLORS,
  MARKS,
  modelById,
  MODELS,
  normalizeLook,
  OUTFIT_COLORS,
  OUTLINES,
  POSES,
  presetById,
  randomLook,
  SKIN_TONES,
  toggleAccessory,
  VOICES,
} from '@/lib/character/catalog';
import { modelPortrait } from '@/lib/character/media';
import type { CharacterLook, Outline } from '@/lib/character/types';
import { createFromDraft, isAvatarLimit } from '@/lib/createCharacter';
import { uploadCustomVrm } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { type CharacterDraft, clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import { conflictsWith, fillName, MAX_TRAITS, SCENARIO_CATEGORIES, type ScenarioCategory, scenarioById, SCENARIOS, traitById, TRAITS } from '@/lib/roleplay';
import type { Gender } from '@/lib/types';

type Tab = 'model' | 'hair' | 'face' | 'outfit' | 'accessories' | 'pose' | 'scene' | 'voice' | 'identity';
type View3D = 'face' | 'bust' | 'portrait';
type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { id: Tab; icon: IconName }[] = [
  { id: 'model', icon: 'person-outline' },
  { id: 'hair', icon: 'cut-outline' },
  { id: 'face', icon: 'happy-outline' },
  { id: 'outfit', icon: 'shirt-outline' },
  { id: 'accessories', icon: 'glasses-outline' },
  { id: 'pose', icon: 'body-outline' },
  { id: 'scene', icon: 'image-outline' },
  { id: 'voice', icon: 'mic-outline' },
  { id: 'identity', icon: 'id-card-outline' },
];
const STEPS = 4;
const MAX_VRM_BYTES = 40 * 1024 * 1024;

// ------------------------------------------------------------------ piezas
/** Bloque de ajustes (como los paneles de ElevenLabs): título, ayuda opcional y controles. */
function Group({ title, hint, right, children, first }: { title: string; hint?: string; right?: ReactNode; children: ReactNode; first?: boolean }) {
  return (
    <View className={first ? 'pt-4' : 'mt-5 border-t border-line pt-5'}>
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text className="font-semibold text-[13px] text-ink">{title}</Text>
        {right}
      </View>
      {hint ? <Text className="-mt-1.5 mb-2.5 text-[12px] leading-[17px] text-muted">{hint}</Text> : null}
      {children}
    </View>
  );
}

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
      <View className={`overflow-hidden rounded-xl border-2 ${selected ? 'border-ink' : 'border-transparent'}`}>
        <View className="overflow-hidden rounded-[10px] bg-subtle">
          {image ? <Image source={image} style={{ width: width - 4, height: (width - 4) * 1.1 }} contentFit="cover" contentPosition="top" transition={120} /> : <View style={{ width: width - 4, height: (width - 4) * 1.1 }} />}
        </View>
      </View>
      <Text numberOfLines={1} className={`mt-1.5 text-center text-[12px] ${selected ? 'font-semibold text-ink' : 'text-muted'}`}>
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
        className={`mb-2 mr-2 h-9 items-center justify-center rounded-full border px-3 ${value === null ? 'border-ink bg-ink' : 'border-line bg-paper'}`}
      >
        <Text className={`text-[12px] ${value === null ? 'font-semibold text-paper' : 'font-medium text-ink'}`}>{originalLabel}</Text>
      </Pressable>
      {items.map((c) => (
        <Swatch key={c.id} color={c.hex} label={c.label[language]} selected={value?.toLowerCase() === c.hex.toLowerCase()} onPress={() => onPick(c.hex)} />
      ))}
    </View>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View className="flex-row flex-wrap">
      {options.map((o) => (
        <Tag key={o.id} label={o.label} selected={o.id === value} onPress={() => onChange(o.id)} />
      ))}
    </View>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * CREADOR DE PERSONAJES — público (no hace falta cuenta).
 * 1. Aspecto (modelo, peinado, rostro, ropa, accesorios, pose, escena, voz, identidad)
 * 2. Personalidad · 3. Escena · 4. Vista previa.
 * El borrador se guarda en el dispositivo; la cuenta solo se pide al empezar la historia.
 */
export default function CreateCharacter() {
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { preset: presetId } = useLocalSearchParams<{ preset?: string }>();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const panelW = wide ? Math.min(600, Math.max(480, width * 0.42)) : Math.min(width, 640);
  const railW = wide ? 76 : 0;
  const contentW = panelW - railW - 40;

  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>('model');
  const [view, setView] = useState<View3D>(wide ? 'portrait' : 'bust');
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
  const [selectedVoice, setPlaying] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const history = useRef<CharacterLook[]>([]);
  const stage = useRef<VrmAvatarHandle>(null);
  const scroll = useRef<ScrollView>(null);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const playing = playerStatus.playing ? selectedVoice : null;

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
          setLook(normalizeLook(d.look, d.gender));
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


  const commit = useCallback((next: CharacterLook | ((l: CharacterLook) => CharacterLook)) => {
    setLook((l) => {
      history.current = [...history.current.slice(-29), l];
      return typeof next === 'function' ? next(l) : next;
    });
  }, []);
  const patch = useCallback((p: Partial<CharacterLook>) => commit((l) => ({ ...l, ...p })), [commit]);
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setLook(prev);
  };
  const randomize = () => commit((l) => randomLook(gender, l.voice));
  const reset = () => commit(presetById(presetId)?.look ?? (gender === 'male' ? DEFAULT_MALE : DEFAULT_FEMALE).look);

  const displayName = name.trim() || '…';
  const scenario = scenarioById(scenarioId);
  const sceneOk = !!scenario || customScene.trim().length >= 20;
  const canHair = hairCompatible(look.model);
  const needsHair = modelById(look.model)?.needsHair;

  // ---------------------------------------------------------- voz
  const stopPreview = () => {
    try {
      player.pause();
    } catch {
      // nada que detener
    }
    setPlaying(null);
  };
  const preview = async (voiceId: string) => {
    if (playing === voiceId) return stopPreview();
    setLoadingVoice(voiceId);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ voiceId, lang: language }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error);
      player.replace({ uri: data.url });
      player.play();
      setPlaying(voiceId);
    } catch {
      showDialog(t('create.previewError'));
    } finally {
      setLoadingVoice(null);
    }
  };

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
    stopPreview();
    goTo(step + 1);
  };

  const back = () => {
    if (step > 0) return goTo(step - 1);
    stopPreview();
    if (router.canGoBack()) router.back();
    else router.replace('/explore');
  };

  const start = async () => {
    setSaving(true);
    stopPreview();
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
      patch({ model: url, hair: null, hairColor: null, hairTip: null, outfitColor: null, bottomColor: null, shoesColor: null, accentColor: null, skinTone: null, eyeColor: null });
    } catch (e) {
      showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const toggleTrait = (id: string) => {
    setTraits((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_TRAITS || conflictsWith(id, cur) ? cur : [...cur, id]));
  };

  // ---------------------------------------------------------- pestañas del aspecto
  const cols = contentW >= 420 ? 4 : 3;
  const tile = (contentW - (cols - 1) * 10) / cols;
  const L = (x: { label: { es: string; en: string } }) => x.label[language];

  const tabContent: Record<Tab, () => ReactNode> = {
    model: () => (
      <>
        <Group first title={t('create.sec.model')}>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {MODELS.filter((m) => gender === 'other' || m.gender === gender).map((m) => (
              <OptionTile
                key={m.id}
                width={tile}
                label={m.label[language]}
                image={modelPortrait(m.id)}
                selected={look.model === m.id}
                onPress={() => patch({ model: m.id, hair: m.needsHair ?? (m.vrm1 ? null : look.hair), outfitColor: null, bottomColor: null, shoesColor: null, accentColor: null })}
              />
            ))}
          </View>
        </Group>
        <Group title={t('create.import')}>
          <Pressable onPress={importVrm} disabled={importing} className="flex-row items-center rounded-xl border border-dashed border-line bg-paper p-3.5 active:bg-subtle">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-subtle">
              {importing ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="cloud-upload-outline" size={18} color={colors.ink} />}
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-[13px] text-ink">{isCustomModel(look.model) ? t('create.importDone') : t('create.import')}</Text>
              <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">{t('create.importHint')}</Text>
            </View>
          </Pressable>
        </Group>
      </>
    ),
    hair: () => (
      <>
        <Group first title={t('create.sec.hairStyle')} hint={!canHair ? t('create.hairLocked') : undefined}>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {!needsHair ? (
              <OptionTile width={tile} label={t('create.hairOwn')} image={isCustomModel(look.model) ? undefined : modelPortrait(look.model)} selected={!look.hair} onPress={() => patch({ hair: null })} />
            ) : null}
            {HAIRSTYLES.filter((h) => h.id !== look.model).map((h) => (
              <OptionTile key={h.id} width={tile} label={h.label[language]} image={modelPortrait(h.id)} selected={look.hair === h.id} disabled={!canHair} onPress={() => patch({ hair: h.id })} />
            ))}
          </View>
        </Group>
        <Group title={t('create.sec.hairColor')}>
          <ColorRow items={HAIR_COLORS} value={look.hairColor} onPick={(hex) => patch({ hairColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
        <Group title={t('create.sec.hairTip')}>
          <ColorRow items={HAIR_COLORS} value={look.hairTip} onPick={(hex) => patch({ hairTip: hex })} language={language} originalLabel={t('create.none')} />
        </Group>
      </>
    ),
    face: () => (
      <>
        <Group first title={t('create.sec.expression')}>
          <Chips options={EXPRESSIONS.map((e) => ({ id: e.id, label: L(e) }))} value={look.expression} onChange={(id) => patch({ expression: id })} />
        </Group>
        <Group title={t('create.sec.eyeColor')}>
          <ColorRow items={EYE_COLORS} value={look.eyeColor} onPick={(hex) => patch({ eyeColor: hex })} language={language} originalLabel={t('create.sec.original')} />
          <View className="mt-1 flex-row items-center justify-between rounded-xl border border-line px-3 py-2.5">
            <View className="mr-3 flex-1">
              <Text className="font-medium text-[13px] text-ink">{t('create.sec.eyeShine')}</Text>
              <Text className="mt-0.5 text-[12px] text-muted">{t('create.sec.eyeShineHint')}</Text>
            </View>
            <Switch value={look.eyeShine} onValueChange={(v) => patch({ eyeShine: v })} trackColor={{ true: colors.ink, false: colors.line }} thumbColor={colors.paper} />
          </View>
        </Group>
        <Group title={t('create.sec.skin')}>
          <ColorRow items={SKIN_TONES} value={look.skinTone} onPick={(hex) => patch({ skinTone: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
        <Group title={t('create.sec.makeup')}>
          <Slider label={t('create.sec.blush')} value={look.blush} min={0} max={1} step={0.05} onChange={(v) => patch({ blush: v })} format={pct} left={t('create.none')} right={t('create.intense')} />
          <Text className="mb-2 mt-4 font-medium text-[13px] text-ink">{t('create.sec.lips')}</Text>
          <ColorRow items={LIP_COLORS} value={look.lipColor} onPick={(hex) => patch({ lipColor: hex })} language={language} originalLabel={t('create.none')} />
          <Text className="mb-2 mt-3 font-medium text-[13px] text-ink">{t('create.sec.eyeshadow')}</Text>
          <ColorRow items={EYESHADOWS} value={look.eyeshadow} onPick={(hex) => patch({ eyeshadow: hex })} language={language} originalLabel={t('create.none')} />
        </Group>
        <Group title={t('create.sec.marks')} right={<Caption>{t('create.sec.marksHint')}</Caption>}>
          <View className="flex-row flex-wrap">
            {MARKS.map((m) => {
              const on = look.marks.includes(m.id);
              return (
                <Tag
                  key={m.id}
                  label={L(m)}
                  selected={on}
                  disabled={!on && look.marks.length >= 4}
                  onPress={() => patch({ marks: on ? look.marks.filter((x) => x !== m.id) : [...look.marks, m.id] })}
                />
              );
            })}
          </View>
        </Group>
      </>
    ),
    outfit: () => (
      <>
        <Group first title={t('create.sec.top')} hint={t('create.sec.outfitHint')}>
          <ColorRow items={OUTFIT_COLORS} value={look.outfitColor} onPick={(hex) => patch({ outfitColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
        <Group title={t('create.sec.bottom')}>
          <ColorRow items={OUTFIT_COLORS} value={look.bottomColor} onPick={(hex) => patch({ bottomColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
        <Group title={t('create.sec.shoes')}>
          <ColorRow items={OUTFIT_COLORS} value={look.shoesColor} onPick={(hex) => patch({ shoesColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
        <Group title={t('create.sec.details')}>
          <ColorRow items={OUTFIT_COLORS} value={look.accentColor} onPick={(hex) => patch({ accentColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
      </>
    ),
    accessories: () => (
      <>
        {ACCESSORY_GROUPS.map((g, i) => {
          const items = ACCESSORIES.filter((a) => a.slot === g.slot);
          const current = items.find((a) => look.accessories.includes(a.id))?.id ?? 'none';
          return (
            <Group key={g.slot} first={i === 0} title={g.label[language]}>
              <Chips
                options={[{ id: 'none', label: t('create.none') }, ...items.map((a) => ({ id: a.id, label: L(a) }))]}
                value={current}
                onChange={(id) =>
                  patch({ accessories: id === 'none' ? look.accessories.filter((a) => !items.some((x) => x.id === a)) : toggleAccessory(look.accessories.filter((a) => a !== id), id) })
                }
              />
            </Group>
          );
        })}
        <Group title={t('create.sec.accessoryColor')}>
          <ColorRow items={OUTFIT_COLORS} value={look.accessoryColor} onPick={(hex) => patch({ accessoryColor: hex })} language={language} originalLabel={t('create.sec.original')} />
        </Group>
      </>
    ),
    pose: () => (
      <>
        <Group first title={t('create.sec.stance')}>
          <Chips options={POSES.map((p) => ({ id: p.id, label: L(p) }))} value={look.pose} onChange={(id) => patch({ pose: id })} />
        </Group>
        <Group title={t('create.sec.head')}>
          <Slider label={t('create.sec.headTilt')} value={look.headTilt} min={-1} max={1} step={0.05} onChange={(v) => patch({ headTilt: v })} format={(v) => (v === 0 ? '0' : `${v > 0 ? '+' : ''}${Math.round(v * 100)}`)} left={t('create.left')} right={t('create.right')} />
          <View className="h-3" />
          <Slider label={t('create.sec.headTurn')} value={look.headTurn} min={-1} max={1} step={0.05} onChange={(v) => patch({ headTurn: v })} format={(v) => (v === 0 ? '0' : `${v > 0 ? '+' : ''}${Math.round(v * 100)}`)} left={t('create.left')} right={t('create.right')} />
          <View className="h-3" />
          <Slider label={t('create.sec.headSize')} value={look.headSize} min={0.9} max={1.12} step={0.01} onChange={(v) => patch({ headSize: v })} format={pct} left={t('create.small')} right={t('create.big')} />
        </Group>
      </>
    ),
    scene: () => (
      <>
        <Group first title={t('create.sec.background')}>
          <View className="flex-row flex-wrap">
            {BACKGROUNDS.map((b) => (
              <Swatch key={b.id} color={b.hex} label={L(b)} selected={look.background === b.id} onPress={() => patch({ background: b.id })} />
            ))}
          </View>
        </Group>
        <Group title={t('create.sec.lighting')}>
          <Chips options={LIGHTINGS.map((x) => ({ id: x.id, label: L(x) }))} value={look.lighting} onChange={(id) => patch({ lighting: id })} />
        </Group>
        <Group title={t('create.sec.effect')}>
          <Chips options={EFFECTS.map((x) => ({ id: x.id, label: L(x) }))} value={look.effect} onChange={(id) => patch({ effect: id })} />
        </Group>
        <Group title={t('create.sec.finish')}>
          <Text className="mb-2 font-medium text-[13px] text-ink">{t('create.sec.outline')}</Text>
          <Segmented<Outline> value={look.outline} onChange={(id) => patch({ outline: id })} options={OUTLINES.map((o) => ({ id: o.id, label: L(o) }))} />
          <View className="h-4" />
          <Slider label={t('create.sec.shine')} value={look.shine} min={0} max={1} step={0.05} onChange={(v) => patch({ shine: v })} format={pct} left={t('create.matte')} right={t('create.glossy')} />
        </Group>
      </>
    ),
    voice: () => {
      const order = (g: string) => (g === gender || (gender === 'other' && g === 'neutral') ? 0 : g === 'neutral' ? 1 : 2);
      const voices = [...VOICES].sort((a, b) => order(a.gender) - order(b.gender));
      const row = (id: string | null, title: string, sub: string, badge?: string) => {
        const selected = look.voice.id === id;
        return (
          <Pressable
            key={id ?? 'auto'}
            onPress={() => patch({ voice: { ...look.voice, id } })}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`flex-row items-center border-b border-line px-3 py-2.5 last:border-b-0 ${selected ? 'bg-subtle' : 'active:bg-subtle'}`}
          >
            <View className={`mr-3 h-8 w-8 items-center justify-center rounded-full ${selected ? 'bg-ink' : 'bg-primary-soft'}`}>
              <Text className={`font-semibold text-[12px] ${selected ? 'text-paper' : 'text-primary-deep'}`}>{title.charAt(0)}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="mr-2 font-semibold text-[13px] text-ink">{title}</Text>
                {badge ? <Badge label={badge} /> : null}
              </View>
              <Text className="mt-0.5 text-[12px] text-muted">{sub}</Text>
            </View>
            {id ? (
              <Pressable
                onPress={() => preview(id)}
                accessibilityRole="button"
                accessibilityLabel={playing === id ? t('create.stop') : t('create.play')}
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-full border border-line bg-paper active:bg-subtle"
              >
                {loadingVoice === id ? <ActivityIndicator size="small" color={colors.ink} /> : <Ionicons name={playing === id ? 'pause' : 'play'} size={14} color={colors.ink} style={{ marginLeft: playing === id ? 0 : 2 }} />}
              </Pressable>
            ) : null}
            <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? colors.ink : colors.line} style={{ marginLeft: 10 }} />
          </Pressable>
        );
      };
      return (
        <>
          <Group first title={t('create.sec.voiceLib')}>
            <View className="overflow-hidden rounded-xl border border-line bg-paper">
              {row(null, t('create.sec.voiceAuto'), t('create.sec.voiceAutoHint'))}
              {voices.map((v) => row(v.id, v.name, v.tags[language], v.gender === 'female' ? t('create.gender.female') : v.gender === 'male' ? t('create.gender.male') : undefined))}
            </View>
          </Group>
          <Group title={t('create.sec.voiceSettings')} hint={t('create.sec.voiceNote')}>
            <Slider label={t('create.sec.speed')} value={look.voice.speed} min={0.7} max={1.2} step={0.01} onChange={(v) => patch({ voice: { ...look.voice, speed: v } })} format={(v) => `${v.toFixed(2)}×`} left={t('create.slower')} right={t('create.faster')} />
            <View className="h-3" />
            <Slider label={t('create.sec.style')} value={look.voice.style} min={0} max={1} step={0.05} onChange={(v) => patch({ voice: { ...look.voice, style: v } })} format={pct} left={t('create.stable')} right={t('create.expressive')} />
          </Group>
        </>
      );
    },
    identity: () => (
      <>
        <View className="pt-4">
          <Field label={t('create.name')} value={name} onChangeText={(v) => setName(v.slice(0, 40))} placeholder={t('create.name.placeholder')} />
        </View>
        <Group title={t('create.gender')}>
          <Segmented<Gender>
            value={gender}
            onChange={setGender}
            options={[
              { id: 'female', label: t('create.gender.female') },
              { id: 'male', label: t('create.gender.male') },
              { id: 'other', label: t('create.gender.other') },
            ]}
          />
        </Group>
        <Group title={t('create.age')}>
          <Slider label={t('create.age')} value={age} min={18} max={60} step={1} onChange={(v) => setAge(Math.round(v))} format={(v) => t('create.age.years', { n: Math.round(v) })} left="18" right="60" />
        </Group>
      </>
    ),
  };

  const tabLabel = (k: Tab) => t(`create.tab.${k}`);

  const lookStep = wide ? (
    <View className="flex-1 flex-row">
      {/* Raíl vertical con iconos (como la barra de herramientas de ElevenLabs) */}
      <View className="border-r border-line bg-cream py-3" style={{ width: railW }}>
        {TABS.map((x) => {
          const on = tab === x.id;
          return (
            <Pressable
              key={x.id}
              onPress={() => setTab(x.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tabLabel(x.id)}
              className={`mx-2 mb-1 items-center rounded-lg py-2 ${on ? 'bg-paper' : 'active:bg-subtle'}`}
              style={on ? { borderWidth: 1, borderColor: colors.line } : undefined}
            >
              <Ionicons name={on ? (x.icon.replace('-outline', '') as IconName) : x.icon} size={18} color={on ? colors.ink : colors.muted} />
              <Text className={`mt-1 text-[10px] ${on ? 'font-semibold text-ink' : 'text-muted'}`} numberOfLines={1}>
                {tabLabel(x.id)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView ref={scroll} className="flex-1" contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="pt-5 font-semibold text-[18px] tracking-tight text-ink">{tabLabel(tab)}</Text>
        {tabContent[tab]()}
      </ScrollView>
    </View>
  ) : (
    <View className="flex-1">
      <View className="border-b border-line bg-paper">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-2 py-1.5">
          {TABS.map((x) => {
            const on = tab === x.id;
            return (
              <Pressable
                key={x.id}
                onPress={() => setTab(x.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className={`mr-1 h-8 flex-row items-center rounded-full px-3 ${on ? 'bg-ink' : 'active:bg-subtle'}`}
              >
                <Ionicons name={x.icon} size={14} color={on ? colors.paper : colors.muted} />
                <Text className={`ml-1.5 text-[13px] ${on ? 'font-semibold text-paper' : 'font-medium text-muted'}`}>{tabLabel(x.id)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView ref={scroll} className="flex-1" contentContainerClassName="px-4 pb-8" keyboardShouldPersistTaps="handled">
        {tabContent[tab]()}
      </ScrollView>
    </View>
  );

  const personalityStep = (
    <View>
      <Display className="text-[22px] leading-[28px]">{t('create.personality.q', { name: displayName })}</Display>
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
        <View className="mt-5 rounded-xl border border-line bg-paper">
          {traits.map((id, i) => {
            const tr = traitById(id);
            return tr ? (
              <View key={id} className={`px-4 py-3 ${i < traits.length - 1 ? 'border-b border-line' : ''}`}>
                <Text className="font-semibold text-[13px] text-ink">{tr.label[language]}</Text>
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
      <Display className="text-[22px] leading-[28px]">{t('create.scenario.q')}</Display>
      <Muted className="mb-4 mt-1.5">{t('create.scenario.hint', { name: displayName })}</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-3" contentContainerClassName="px-4">
        <Tag label={t('create.scenario.all')} selected={category === 'all'} onPress={() => setCategory('all')} />
        {SCENARIO_CATEGORIES.map((c) => (
          <Tag key={c.id} label={c.label[language]} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>
      <View className="overflow-hidden rounded-xl border border-line bg-paper">
        {scenarios.map((s, i) => {
          const selected = scenarioId === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setScenarioId(selected ? null : s.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`flex-row px-4 py-3.5 ${i < scenarios.length - 1 ? 'border-b border-line' : ''} ${selected ? 'bg-subtle' : 'active:bg-subtle'}`}
            >
              <View className="mr-3 flex-1">
                <Text className="font-semibold text-[13px] text-ink">{s.title[language]}</Text>
                <Text className="mt-1 text-[13px] leading-[19px] text-muted">{fillName(s.setup[language], displayName)}</Text>
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? colors.ink : colors.line} />
            </Pressable>
          );
        })}
      </View>
      <Text className="mb-2 mt-6 font-semibold text-[13px] text-ink">{t('create.scenario.custom')}</Text>
      <TextInput
        value={customScene}
        onChangeText={(v) => {
          setCustomScene(v.slice(0, 800));
          if (v.trim()) setScenarioId(null);
        }}
        multiline
        placeholder={t('create.scenario.customPlaceholder', { name: displayName })}
        placeholderTextColor={colors.muted}
        className={`min-h-[110px] rounded-xl border bg-paper p-3.5 text-[14px] leading-[21px] text-ink ${!scenario && customScene.trim() ? 'border-ink' : 'border-line'}`}
        style={{ textAlignVertical: 'top', outlineStyle: 'none' } as object}
      />
      <Caption className="mt-1.5">{t('create.scenario.customHint', { name: displayName })}</Caption>
    </View>
  );

  const voice = VOICES.find((v) => v.id === look.voice.id);
  const previewStep = (
    <View>
      <Caption>{t('create.preview.title')}</Caption>
      <Display className="mt-1">{displayName}</Display>
      <Muted className="mt-0.5">
        {t(`create.gender.${gender}`)} · {t('create.age.years', { n: age })} · {t('create.sec.voice')}: {voice?.name ?? t('create.sec.voiceAuto')}
      </Muted>
      <Text className="mb-2 mt-6 font-semibold text-[13px] text-ink">{t('create.preview.personality')}</Text>
      <View className="flex-row flex-wrap">
        {traits.map((id) => (
          <View key={id} className="mb-2 mr-2 h-7 justify-center rounded-full bg-subtle px-3">
            <Text className="font-medium text-[12px] text-ink">{traitById(id)?.label[language]}</Text>
          </View>
        ))}
      </View>
      <Text className="mb-2 mt-5 font-semibold text-[13px] text-ink">{t('create.preview.scene')}</Text>
      <View className="rounded-xl border border-line bg-paper p-4">
        {scenario ? <Text className="mb-1 font-semibold text-[13px] text-ink">{scenario.title[language]}</Text> : null}
        <Text className="text-[14px] leading-[21px] text-ink">{scenario ? fillName(scenario.setup[language], displayName) : customScene.trim()}</Text>
      </View>
      <View className="mt-4 flex-row items-center">
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.muted} />
        <Muted className="ml-2 text-[13px]">{t('create.preview.firstMessage', { name: displayName })}</Muted>
      </View>
    </View>
  );

  if (!loaded) return <View className="flex-1 bg-paper" />;

  const stepLabels = [t('create.step.look'), t('create.step.personality'), t('create.step.scenario'), t('create.step.preview')];
  // En móvil el 3D se ve arriba en "Aspecto" y "Vista previa"; en escritorio siempre a la izquierda.
  const showStage = wide || step === 0 || step === 3;
  const stageH = wide ? undefined : step === 3 ? Math.min(height * 0.48, 440) : Math.min(height * 0.36, 320);
  const framing: View3D = step === 3 && !wide ? 'portrait' : view;

  const primary =
    step < 3 ? (
      <Button title={t('common.continue')} onPress={next} size={wide ? 'md' : 'lg'} />
    ) : (
      <Button title={session ? t('create.preview.cta') : t('create.preview.ctaLogin')} onPress={start} loading={saving} size={wide ? 'md' : 'lg'} variant="brand" />
    );

  const stageView = (
    <View className={wide ? 'flex-1' : 'border-b border-line'} style={wide ? undefined : { height: stageH }}>
      <VrmAvatar ref={stage} look={look} gender={gender} framing={framing} presence={playing ? 'speaking' : 'idle'} style={{ flex: 1 }} onLoaded={() => setStageReady(true)} />
      {!stageReady ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {step === 0 ? (
        <>
          <View className="absolute left-3 top-3" style={{ width: 210 }}>
            <Segmented<View3D>
              value={view}
              onChange={setView}
              options={[
                { id: 'face', label: t('create.view.face') },
                { id: 'bust', label: t('create.view.bust') },
                { id: 'portrait', label: t('create.view.body') },
              ]}
            />
          </View>
          <View className="absolute right-3 top-3 flex-row" style={{ gap: 6 }}>
            <IconButton icon="arrow-undo-outline" variant="outline" size={34} label={t('create.undo')} onPress={undo} />
            <IconButton icon="refresh-outline" variant="outline" size={34} label={t('create.reset')} onPress={reset} />
            <IconButton icon="shuffle" variant="outline" size={34} label={t('create.random')} onPress={randomize} />
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      {/* Barra superior: cerrar · título · pasos · acción principal (escritorio) */}
      <View className="border-b border-line bg-paper">
        <View className="h-14 flex-row items-center px-2">
          <IconButton icon={step === 0 ? 'close' : 'chevron-back'} label={t('common.back')} onPress={back} />
          <Text className="ml-1 font-semibold text-[15px] tracking-tight text-ink">{t('create.title')}</Text>
          {wide ? (
            <View className="ml-6 flex-1 flex-row items-center">
              {stepLabels.map((label, i) => (
                <View key={label} className="flex-row items-center">
                  {i > 0 ? <Ionicons name="chevron-forward" size={13} color={colors.line} style={{ marginHorizontal: 6 }} /> : null}
                  <Pressable onPress={() => (i < step ? goTo(i) : undefined)} disabled={i >= step} className="flex-row items-center rounded-md px-1.5 py-1">
                    <View className={`mr-1.5 h-5 w-5 items-center justify-center rounded-full ${i < step ? 'bg-ink' : i === step ? 'border border-ink' : 'border border-line'}`}>
                      {i < step ? <Ionicons name="checkmark" size={12} color={colors.paper} /> : <Text className={`text-[11px] ${i === step ? 'font-semibold text-ink' : 'text-muted'}`}>{i + 1}</Text>}
                    </View>
                    <Text className={`text-[13px] ${i === step ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Caption className="ml-auto mr-3">
              {t('create.stepOf', { n: step + 1, total: STEPS })} · {stepLabels[step]}
            </Caption>
          )}
          {wide ? <View className="mr-2">{primary}</View> : null}
        </View>
        {!wide ? (
          <View className="flex-row px-4 pb-2.5" style={{ gap: 4 }}>
            {stepLabels.map((label, i) => (
              <Pressable key={label} onPress={() => (i < step ? goTo(i) : undefined)} className="flex-1" accessibilityLabel={label}>
                <View className={`h-1 rounded-full ${i <= step ? 'bg-ink' : 'bg-line'}`} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className={`flex-1 ${wide ? 'flex-row' : ''}`}>
          {showStage ? stageView : null}
          <View className={wide ? 'border-l border-line' : 'flex-1'} style={wide ? { width: panelW } : undefined}>
            {step === 0 ? (
              lookStep
            ) : (
              <ScrollView ref={scroll} className="flex-1" contentContainerClassName="pb-8" keyboardShouldPersistTaps="handled">
                <View className="w-full self-center px-5 pt-5" style={{ maxWidth: 640 }}>
                  {step === 1 ? personalityStep : step === 2 ? scenarioStep : previewStep}
                </View>
              </ScrollView>
            )}
            {!wide ? (
              <View className="border-t border-line bg-paper px-4 pb-2 pt-3">
                {primary}
                {step === 3 && !session ? <Caption className="mt-2 text-center">{t('create.preview.loginNote', { name: displayName })}</Caption> : null}
              </View>
            ) : step === 3 && !session ? (
              <View className="border-t border-line px-5 py-3">
                <Caption>{t('create.preview.loginNote', { name: displayName })}</Caption>
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
