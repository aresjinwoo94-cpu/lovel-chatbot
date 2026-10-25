import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ForwardedRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { useFocusEffect } from 'expo-router';
import { type ImageSourcePropType, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Emotion, Presence } from '@/lib/character/types';
import { perfEnd } from '@/lib/perfMeter';
import { VrmAvatar, type VrmAvatarHandle } from './VrmAvatar';

/**
 * Escenario 3D persistente: UN solo escenario para toda la app, que se coloca encima del hueco
 * (StageSlot) de la pantalla que lo muestra (chat, creador). Al salir del chat no se destruye:
 * se pausa y queda escondido con el personaje ya cargado, así que volver es casi instantáneo
 * (presupuesto WP-9: ≤ 800 ms si ya se cargó antes). Se crea la primera vez que hace falta.
 */
export interface StageProps {
  look: unknown;
  gender?: string;
  presence?: Presence;
  emotion?: Emotion | null;
  emotionId?: string | null;
  framing?: 'bust' | 'face' | 'portrait';
  poster?: ImageSourcePropType;
  onLoaded?: () => void;
  /** Lo que va encima del personaje (nombre, botones): se pinta sobre el escenario. */
  overlay?: ReactNode;
}

type Rect = { x: number; y: number; width: number; height: number };
type Slot = { id: string; props: StageProps; rect: Rect | null };

interface Ctx {
  register: (id: string, props: StageProps) => void;
  setOverlay: (id: string, node: ReactNode) => void;
  update: (id: string, props: StageProps) => void;
  setRect: (id: string, rect: Rect) => void;
  unregister: (id: string) => void;
  handle: RefObject<VrmAvatarHandle | null>;
}

const StageContext = createContext<Ctx | null>(null);

export function StageProvider({ children }: { children: ReactNode }) {
  // pila de huecos: el último montado es el visible (p. ej. el creador encima del chat)
  const [slots, setSlots] = useState<Slot[]>([]);
  // último personaje mostrado: el escenario se queda con él (escondido) cuando no hay hueco
  const [last, setLast] = useState<StageProps | null>(null);
  const handle = useRef<VrmAvatarHandle | null>(null);
  const [overlays] = useState(() => new OverlayStore());
  const ctx = useMemo<Ctx>(
    () => ({
      register: (id, props) => {
        setSlots((s) => [...s.filter((x) => x.id !== id), { id, props, rect: null }]);
        setLast(props);
      },
      update: (id, props) => {
        setSlots((s) => s.map((x) => (x.id === id ? { ...x, props } : x)));
        setLast(props);
      },
      setOverlay: (id, node) => overlays.set(id, node),
      // misma posición: devuelve el mismo array (sin repintar); se mide en cada fotograma al entrar
      setRect: (id, rect) =>
        setSlots((s) => {
          const i = s.findIndex((x) => x.id === id);
          const r = i < 0 ? null : s[i].rect;
          if (i < 0 || (r && r.x === rect.x && r.y === rect.y && r.width === rect.width && r.height === rect.height)) return s;
          return s.map((x, j) => (j === i ? { ...x, rect } : x));
        }),
      unregister: (id) => setSlots((s) => s.filter((x) => x.id !== id)),
      handle,
    }),
    [overlays],
  );
  const active = slots[slots.length - 1] ?? null;
  return (
    <StageContext.Provider value={ctx}>
      {children}
      <StageHostView active={active} last={last} handle={handle} overlays={overlays} />
    </StageContext.Provider>
  );
}

/**
 * Lo que va encima del personaje cambia a menudo (al escribir, al hablar): va por un almacén
 * aparte para que solo se repinte esa capa y no el escenario entero.
 */
class OverlayStore {
  private nodes = new Map<string, ReactNode>();
  private subs = new Set<() => void>();
  set(id: string, node: ReactNode) {
    this.nodes.set(id, node);
    this.subs.forEach((f) => f());
  }
  get = (id: string) => this.nodes.get(id) ?? null;
  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => {
      this.subs.delete(f);
    };
  };
}

function SlotOverlay({ store, id }: { store: OverlayStore; id: string }) {
  const node = useSyncExternalStore(store.subscribe, () => store.get(id), () => store.get(id));
  return <>{node}</>;
}

/** El escenario único, colocado sobre el hueco activo (o escondido y en pausa si no hay ninguno). */
function StageHostView({ active, last, handle, overlays }: { active: Slot | null; last: StageProps | null; handle: RefObject<VrmAvatarHandle | null>; overlays: OverlayStore }) {
  const loadedKey = useRef<string | null>(null);
  const onLoadedRef = useRef<(() => void) | undefined>(undefined);
  const props = active?.props ?? last;
  const lookKey = props ? JSON.stringify(props.look) : null;
  const activeId = active?.id;

  useEffect(() => {
    onLoadedRef.current = active?.props.onLoaded;
  });
  // el hueco nuevo con el mismo personaje ya cargado: avisa enseguida (no habrá otro "loaded")
  useEffect(() => {
    if (activeId && loadedKey.current && loadedKey.current === lookKey) {
      perfEnd('portrait');
      perfEnd('stage', 'stageAgain');
      onLoadedRef.current?.();
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // se crea la primera vez que una pantalla lo necesita (three.js no se carga en el arranque)
  if (!props) return null;
  const rect = active?.rect;
  const visible = !!(active && rect && rect.width > 0 && rect.height > 0);
  return (
    <View
      testID={visible ? 'stage-visible' : 'stage-hidden'}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        { position: 'absolute', overflow: 'hidden' },
        visible ? { left: rect!.x, top: rect!.y, width: rect!.width, height: rect!.height, opacity: 1 } : { left: 0, top: 0, width: 2, height: 2, opacity: 0 },
      ]}
    >
      <VrmAvatar
        ref={handle}
        look={props.look}
        gender={props.gender}
        presence={props.presence}
        emotion={props.emotion}
        emotionId={props.emotionId}
        framing={props.framing}
        poster={props.poster}
        active={visible}
        style={{ flex: 1 }}
        onLoaded={() => {
          loadedKey.current = lookKey;
          perfEnd('portrait');
          perfEnd('stage', 'stageFirst');
          onLoadedRef.current?.();
        }}
      />
      {visible ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <SlotOverlay store={overlays} id={active!.id} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Hueco donde se ve el escenario. Ocupa su sitio en la pantalla y el escenario único se coloca
 * encima. Mide su posición en la ventana al montarse, al cambiar de tamaño y durante las
 * transiciones de entrada (que mueven la pantalla sin avisar con onLayout).
 */
function StageSlotBase({ style, overlay, ...props }: StageProps & { style?: StyleProp<ViewStyle> }, ref: ForwardedRef<VrmAvatarHandle>) {
  const ctx = useContext(StageContext);
  const id = useId();
  const view = useRef<View>(null);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  useImperativeHandle(ref, () => ({ snapshot: (opts) => ctx?.handle.current?.snapshot(opts) ?? Promise.reject(new Error('Sin escenario')) }), [ctx]);

  const measure = useCallback(() => {
    view.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) ctx?.setRect(id, { x, y, width, height });
    });
  }, [ctx, id]);

  // solo mientras su pantalla está delante: si encima se abre otra (Pro, términos…), se esconde.
  // Al ganar el foco se mide durante ~1 s (la animación de entrada mueve la pantalla sin onLayout).
  useFocusEffect(
    useCallback(() => {
      if (!ctx) return;
      ctx.register(id, propsRef.current);
      let frames = 0;
      let raf = requestAnimationFrame(function loop() {
        measure();
        if (++frames < 60) raf = requestAnimationFrame(loop);
      });
      return () => {
        cancelAnimationFrame(raf);
        ctx.unregister(id);
      };
    }, [ctx, id, measure]),
  );

  // la capa de encima, en cada render (solo repinta esa capa)
  useEffect(() => {
    ctx?.setOverlay(id, overlay);
  });
  // el escenario, solo cuando cambia algo que lo afecta (no al escribir en el chat)
  const { look, gender, presence, emotion, emotionId, framing, poster } = props;
  const stageKey = JSON.stringify([look, gender, presence, emotion, emotionId, framing, poster]);
  useEffect(() => {
    ctx?.update(id, propsRef.current);
  }, [ctx, id, stageKey]);

  // en web, también al cambiar el tamaño de la ventana
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return <View ref={view} style={style} onLayout={measure} collapsable={false} />;
}

export const StageSlot = forwardRef(StageSlotBase);
