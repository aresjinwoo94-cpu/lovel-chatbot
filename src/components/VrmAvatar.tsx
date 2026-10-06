import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ForwardedRef } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { MODEL_BASE_URL } from '@/lib/character/media';
import { normalizeLook } from '@/lib/character/catalog';
import type { Presence } from '@/lib/character/types';
import { AVATAR_STAGE_HTML } from '@/lib/avatarStageHtml';

export interface VrmAvatarHandle {
  /** Captura el personaje como JPEG (data URL). `framing: 'face'` = foto de perfil cuadrada. */
  snapshot: (opts?: { framing?: 'face' | 'bust' | 'portrait'; size?: number }) => Promise<string>;
}

interface Props {
  look: unknown;
  gender?: string;
  presence?: Presence;
  /** bust: busto · face: primer plano · portrait: medio cuerpo vertical. */
  framing?: 'bust' | 'face' | 'portrait';
  /** Fondo transparente (el contenedor pone el color). */
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
  onLoaded?: () => void;
  onError?: (message: string) => void;
}

type StageMessage = { type: 'ready' | 'loaded' | 'error' | 'snapshot'; message?: string; dataUrl?: string };

/**
 * Personaje VRM en vivo (el formato 3D de los VTubers): sombreado anime,
 * parpadeo, respiración, expresiones y labios que se mueven al hablar.
 * En móvil se dibuja en un WebView; en web, en un iframe.
 */
function VrmAvatarBase(
  { look, gender, presence = 'idle', framing = 'bust', transparent = false, style, onLoaded, onError }: Props,
  ref: ForwardedRef<VrmAvatarHandle>,
) {
  const webRef = useRef<WebView>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const queue = useRef<object[]>([]);
  const pendingSnapshot = useRef<((url: string) => void) | null>(null);

  const post = useCallback((msg: object) => {
    if (!ready.current) {
      queue.current.push(msg);
      return;
    }
    const data = JSON.stringify(msg);
    if (Platform.OS === 'web') frameRef.current?.contentWindow?.postMessage(data, '*');
    else webRef.current?.postMessage(data);
  }, []);

  const handle = useCallback(
    (raw: string) => {
      let msg: StageMessage;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.type === 'ready') {
        ready.current = true;
        const pending = queue.current;
        queue.current = [];
        pending.forEach(post);
      } else if (msg.type === 'loaded') onLoaded?.();
      else if (msg.type === 'error') onError?.(msg.message ?? 'Error');
      else if (msg.type === 'snapshot' && msg.dataUrl) {
        pendingSnapshot.current?.(msg.dataUrl);
        pendingSnapshot.current = null;
      }
    },
    [onLoaded, onError, post],
  );

  const lookKey = JSON.stringify(normalizeLook(look, gender));
  useEffect(() => {
    post({ type: 'look', look: JSON.parse(lookKey), modelBaseUrl: MODEL_BASE_URL, framing, transparent });
  }, [lookKey, framing, transparent, post]);

  useEffect(() => {
    post({ type: 'state', mood: presence });
  }, [presence, post]);

  useImperativeHandle(
    ref,
    () => ({
      snapshot: (opts) =>
        new Promise<string>((resolve, reject) => {
          pendingSnapshot.current = resolve;
          post({ type: 'snapshot', framing: opts?.framing, size: opts?.size ?? 384 });
          setTimeout(() => {
            if (pendingSnapshot.current === resolve) {
              pendingSnapshot.current = null;
              reject(new Error('No se pudo capturar el personaje'));
            }
          }, 8000);
        }),
    }),
    [post],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMsg = (e: MessageEvent) => {
      if (e.source === frameRef.current?.contentWindow && typeof e.data === 'string') handle(e.data);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [handle]);

  if (Platform.OS === 'web') {
    return (
      <View style={[{ overflow: 'hidden' }, style]}>
        <iframe ref={frameRef} srcDoc={AVATAR_STAGE_HTML} title="personaje" style={{ border: 0, width: '100%', height: '100%', background: 'transparent' }} />
      </View>
    );
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: AVATAR_STAGE_HTML, baseUrl: 'https://app.lovelhouse.local/' }}
        onMessage={(e: WebViewMessageEvent) => handle(e.nativeEvent.data)}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        cacheEnabled
        androidLayerType="hardware"
        style={{ flex: 1, backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}

export const VrmAvatar = forwardRef(VrmAvatarBase);
