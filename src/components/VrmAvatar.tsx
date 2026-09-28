import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ForwardedRef } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { MODEL_BASE_URL, normalizeAppearance } from '@/lib/avatarOptions';
import { AVATAR_STAGE_HTML } from '@/lib/avatarStageHtml';
import type { AvatarAppearance } from '@/lib/types';

import type { AvatarMood } from './AnimatedAvatar';

export interface VrmAvatarHandle {
  /** Captura la imagen actual del avatar (JPEG en data URL) para usarla como miniatura. */
  snapshot: () => Promise<string>;
}

interface Props {
  appearance: Partial<AvatarAppearance>;
  mood?: AvatarMood;
  speaking?: boolean;
  /** 'bust': busto con hombros · 'face': primer plano (foto de perfil). */
  framing?: 'bust' | 'face';
  /** Recorte circular hecho dentro del propio escenario (Android no recorta bien los WebView). */
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
  onLoaded?: () => void;
  onError?: (message: string) => void;
}

type StageMessage = { type: 'ready' | 'loaded' | 'error' | 'snapshot'; message?: string; dataUrl?: string };

/**
 * Avatar VRM en vivo (estilo VTuber): modelo 3D con sombreado anime que parpadea,
 * mueve la cabeza, sonríe, "piensa" y mueve los labios al hablar.
 * En móvil se dibuja dentro de un WebView; en web, dentro de un iframe.
 */
function VrmAvatarBase(
  { appearance, mood = 'idle', speaking = false, framing = 'bust', circle = false, style, onLoaded, onError }: Props,
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

  // Apariencia: modelo, colores y fondo
  const appearanceKey = JSON.stringify(normalizeAppearance(appearance as AvatarAppearance));
  useEffect(() => {
    post({ type: 'appearance', appearance: JSON.parse(appearanceKey), modelBaseUrl: MODEL_BASE_URL, framing, shape: circle ? 'circle' : 'rect' });
  }, [appearanceKey, framing, circle, post]);

  // Estado de ánimo y labios
  useEffect(() => {
    post({ type: 'state', mood, speaking });
  }, [mood, speaking, post]);

  useImperativeHandle(
    ref,
    () => ({
      snapshot: () =>
        new Promise<string>((resolve, reject) => {
          pendingSnapshot.current = resolve;
          post({ type: 'snapshot' });
          setTimeout(() => {
            if (pendingSnapshot.current === resolve) {
              pendingSnapshot.current = null;
              reject(new Error('No se pudo capturar el avatar'));
            }
          }, 8000);
        }),
    }),
    [post],
  );

  // Web: escuchamos los mensajes del iframe
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
      <View style={[{ overflow: 'hidden', backgroundColor: 'transparent' }, style]}>
        <iframe
          ref={frameRef}
          srcDoc={AVATAR_STAGE_HTML}
          title="avatar"
          style={{ border: 0, width: '100%', height: '100%', background: 'transparent' }}
          allow="autoplay"
        />
      </View>
    );
  }

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: 'transparent' }, style]}>
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
        allowsInlineMediaPlayback
        cacheEnabled
        androidLayerType="hardware"
        style={{ flex: 1, backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}

export const VrmAvatar = forwardRef(VrmAvatarBase);
