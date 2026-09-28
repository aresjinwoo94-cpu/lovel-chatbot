import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Language } from './types';

/**
 * Textos de la app. Tono: cálido, humano, frases cortas.
 * Nada de jerga técnica ni de "IA" en la interfaz.
 */
const es = {
  appName: 'Lovel House',
  'common.cancel': 'Cancelar',
  'common.confirm': 'Confirmar',
  'common.error': 'Algo salió mal',
  'common.ok': 'Entendido',
  'common.save': 'Guardar',
  'common.saved': 'Guardado',

  'login.tagline': 'Alguien que te escucha, cuando lo necesitas.',
  'login.google': 'Continuar con Google',
  'login.or': 'o con tu correo',
  'login.email': 'Correo electrónico',
  'login.password': 'Contraseña',
  'login.signIn': 'Entrar',
  'login.signUp': 'Crear cuenta',
  'login.toSignUp': '¿Primera vez? Crea tu cuenta',
  'login.toSignIn': '¿Ya tienes cuenta? Entra',
  'login.checkEmail': 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve aquí.',
  'login.forgot': '¿Olvidaste tu contraseña?',
  'login.resetSent': 'Te enviamos un enlace para crear una contraseña nueva.',
  'login.needEmail': 'Escribe tu correo primero.',
  'login.privacy': 'Tus conversaciones son privadas y solo tuyas.',

  'welcome.title': 'Bienvenido a Lovel House.',
  'welcome.question': '¿Quieres crear tu primer avatar?',
  'welcome.body': 'Será alguien con quien hablar, a tu ritmo. Solo te tomará un minuto.',
  'welcome.cta': 'Sí, crear mi avatar',
  'welcome.later': 'Ahora no',

  'create.title': 'Tu avatar',
  'create.step.gender': 'Género',
  'create.step.age': 'Edad',
  'create.step.appearance': 'Apariencia',
  'create.step.situation': 'Situación',
  'create.gender.q': '¿Cómo es tu avatar?',
  'create.gender.female': 'Mujer',
  'create.gender.male': 'Hombre',
  'create.gender.other': 'Otro',
  'create.name': 'Su nombre',
  'create.name.placeholder': 'Ej: Lucía',
  'create.age.q': '¿Qué edad tiene?',
  'create.age.years': '{n} años',
  'create.appearance.q': '¿Cómo se ve?',
  'create.appearance.select': 'Elegir',
  'create.appearance.upload': 'Desde una foto',
  'create.appearance.skin': 'Piel',
  'create.appearance.hair': 'Cabello',
  'create.appearance.style': 'Peinado',
  'create.appearance.eyes': 'Ojos',
  'create.appearance.outfit': 'Ropa',
  'create.appearance.background': 'Fondo',
  'create.appearance.glasses': 'Lentes',
  'create.appearance.freckles': 'Pecas',
  'create.appearance.beard': 'Barba',
  'create.appearance.describe': 'Descríbelo en pocas palabras',
  'create.appearance.describe.placeholder': 'Ej: sonrisa tranquila, pelo recogido, suéter de lana',
  'create.appearance.pick': 'Elegir una foto',
  'create.appearance.analyzing': 'Mirando tu foto con cariño…',
  'create.appearance.photoNote': 'La foto solo inspira el dibujo. No la guardamos.',
  'create.appearance.photoDone': 'Listo. Puedes ajustar cualquier detalle abajo.',
  'hair.side': 'Flequillo lateral',
  'hair.long': 'Largo',
  'hair.bob': 'Bob',
  'hair.curly': 'Rizado',
  'hair.bun': 'Moño',
  'hair.short': 'Corto',
  'hair.buzz': 'Rapado',
  'create.situation.q': 'La situación',
  'create.situation.intro': 'Esta es la situación exacta en la que quieres sumergirte… ¿cómo la imaginas tú?',
  'create.situation.placeholder': 'Escríbelo como te salga. No hay respuestas incorrectas.',
  'create.situation.examples': 'Ejemplos',
  'create.situation.ex1': 'Estoy abrazando a mi mamá después de una pelea',
  'create.situation.ex2': 'Tu profesor explicando matemáticas con voz cálida',
  'create.situation.tip': 'Puedes contar quién es, dónde están y cómo te sientes. Con una frase basta.',
  'create.situation.help': '¿Qué escribo aquí?',
  'create.next': 'Continuar',
  'create.back': 'Atrás',
  'create.save': 'Guardar y continuar',
  'create.saving': 'Preparando a {name}…',
  'create.portrait': 'Crear también un retrato ilustrado',
  'create.portraitPro': 'Retrato ilustrado (Pro)',
  'create.limitReached': 'Con el plan gratuito puedes tener un avatar. Hazte Pro para crear más.',
  'create.defaultName': 'Luna',

  'chat.typing': 'escribiendo…',
  'chat.online': 'en línea',
  'chat.listening': 'escuchando tu nota…',
  'chat.placeholder': 'Escribe un mensaje',
  'chat.empty': 'Dile hola a {name}. Está aquí para ti.',
  'chat.situation': 'La situación',
  'chat.export': 'Exportar conversación',
  'chat.voiceNote': 'Nota de voz',
  'chat.errorSend': 'No pudimos enviar tu mensaje. Inténtalo de nuevo.',
  'chat.loadingOlder': 'Cargando mensajes anteriores…',
  'chat.freeLeft': 'Te quedan {n} mensajes gratis',
  'chat.proUnlimited': 'Pro · ilimitado',

  'voice.tap': 'Toca el micrófono para grabar',
  'voice.recording': 'Grabando…',
  'voice.stop': 'Detener',
  'voice.preview': 'Escucha antes de enviar',
  'voice.send': 'Enviar',
  'voice.discard': 'Descartar',
  'voice.permission': 'Necesitamos acceso al micrófono para grabar tu voz.',
  'voice.tooShort': 'La nota es muy corta. Mantén un poco más.',
  'voice.play': 'Reproducir',
  'voice.pause': 'Pausa',
  'voice.transcript': 'Transcripción',

  'pro.title': '¿Quieres continuar hablando ilimitadamente con este avatar?',
  'pro.body': '{name} quiere seguir escuchándote.',
  'pro.price': '$9.90 USD / mes',
  'pro.priceNote': 'o su equivalente en tu moneda. Cancela cuando quieras.',
  'pro.f1': 'Conversaciones ilimitadas',
  'pro.f2': 'Más avatares',
  'pro.f3': 'Memoria: recuerda lo que le cuentas',
  'pro.f4': 'Notas de voz sin límite',
  'pro.f5': 'Retratos ilustrados',
  'pro.cta': 'Continuar con Pro',
  'pro.notNow': 'Ahora no',
  'pro.opening': 'Abriendo pago seguro…',
  'pro.success': '¡Listo! Ya eres Pro. Sigue hablando todo lo que quieras.',
  'pro.pending': 'Estamos confirmando tu pago…',
  'pro.manage': 'Administrar suscripción',
  'pro.active': 'Pro activo',

  'tabs.chats': 'Chats',
  'tabs.profile': 'Perfil',
  'tabs.settings': 'Ajustes',

  'chats.title': 'Chats',
  'chats.new': 'Nuevo avatar',
  'chats.empty': 'Aún no tienes avatares.',
  'chats.startHint': 'Toca para empezar a hablar',
  'chats.delete': 'Eliminar',
  'chats.deleteConfirm': '¿Eliminar a {name} y toda su conversación?',
  'chats.voice': '🎤 Nota de voz',

  'profile.title': 'Perfil',
  'profile.name': 'Tu nombre',
  'profile.plan': 'Tu plan',
  'profile.free': 'Gratuito',
  'profile.pro': 'Pro',
  'profile.upgrade': 'Hazte Pro · $9.90/mes',
  'profile.stats': '{avatars} avatares · {messages} mensajes',
  'profile.signOut': 'Cerrar sesión',
  'profile.since': 'En Lovel House desde {date}',
  'profile.renews': 'Se renueva el {date}',

  'settings.title': 'Ajustes',
  'settings.language': 'Idioma',
  'settings.privacy': 'Privacidad',
  'settings.storeVoice': 'Guardar mis notas de voz',
  'settings.storeVoiceHint': 'Si lo desactivas, tus audios solo se transcriben y no se guardan.',
  'settings.privacyNote': 'Tus conversaciones son privadas. Nadie más puede leerlas.',
  'settings.password': 'Cambiar contraseña',
  'settings.newPassword': 'Nueva contraseña',
  'settings.passwordSaved': 'Contraseña actualizada.',
  'settings.deleteChats': 'Borrar todas mis conversaciones',
  'settings.deleteChatsConfirm': 'Se borrarán todos los mensajes y audios. Tus avatares se quedan.',
  'settings.deleteAccount': 'Eliminar mi cuenta',
  'settings.deleteAccountConfirm': 'Se borrará todo: avatares, conversaciones y audios. No se puede deshacer.',
  'settings.version': 'Versión {v}',

  'export.title': 'Exportar conversación',
  'export.html': 'Texto + audios (HTML)',
  'export.txt': 'Solo texto (.txt)',
  'export.preparing': 'Preparando tu conversación…',
  'export.header': 'Conversación con {name}',
  'export.you': 'Tú',
};

type Key = keyof typeof es;

const en: Record<Key, string> = {
  appName: 'Lovel House',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.error': 'Something went wrong',
  'common.ok': 'Got it',
  'common.save': 'Save',
  'common.saved': 'Saved',

  'login.tagline': 'Someone who listens, whenever you need it.',
  'login.google': 'Continue with Google',
  'login.or': 'or with your email',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.signIn': 'Sign in',
  'login.signUp': 'Create account',
  'login.toSignUp': 'First time? Create your account',
  'login.toSignIn': 'Already have an account? Sign in',
  'login.checkEmail': 'We sent you an email to confirm your account. Open it and come back.',
  'login.forgot': 'Forgot your password?',
  'login.resetSent': 'We sent you a link to create a new password.',
  'login.needEmail': 'Type your email first.',
  'login.privacy': 'Your conversations are private and only yours.',

  'welcome.title': 'Welcome to Lovel House.',
  'welcome.question': 'Would you like to create your first avatar?',
  'welcome.body': 'Someone to talk to, at your own pace. It only takes a minute.',
  'welcome.cta': 'Yes, create my avatar',
  'welcome.later': 'Not now',

  'create.title': 'Your avatar',
  'create.step.gender': 'Gender',
  'create.step.age': 'Age',
  'create.step.appearance': 'Look',
  'create.step.situation': 'Situation',
  'create.gender.q': 'Who is your avatar?',
  'create.gender.female': 'Woman',
  'create.gender.male': 'Man',
  'create.gender.other': 'Other',
  'create.name': 'Their name',
  'create.name.placeholder': 'e.g. Lucy',
  'create.age.q': 'How old are they?',
  'create.age.years': '{n} years old',
  'create.appearance.q': 'What do they look like?',
  'create.appearance.select': 'Choose',
  'create.appearance.upload': 'From a photo',
  'create.appearance.skin': 'Skin',
  'create.appearance.hair': 'Hair',
  'create.appearance.style': 'Hairstyle',
  'create.appearance.eyes': 'Eyes',
  'create.appearance.outfit': 'Outfit',
  'create.appearance.background': 'Background',
  'create.appearance.glasses': 'Glasses',
  'create.appearance.freckles': 'Freckles',
  'create.appearance.beard': 'Beard',
  'create.appearance.describe': 'Describe them in a few words',
  'create.appearance.describe.placeholder': 'e.g. calm smile, hair tied up, wool sweater',
  'create.appearance.pick': 'Choose a photo',
  'create.appearance.analyzing': 'Looking at your photo with care…',
  'create.appearance.photoNote': 'The photo only inspires the drawing. We don’t keep it.',
  'create.appearance.photoDone': 'Done. You can adjust any detail below.',
  'hair.side': 'Side bangs',
  'hair.long': 'Long',
  'hair.bob': 'Bob',
  'hair.curly': 'Curly',
  'hair.bun': 'Bun',
  'hair.short': 'Short',
  'hair.buzz': 'Buzz',
  'create.situation.q': 'The situation',
  'create.situation.intro': 'This is the exact situation you want to step into… how do you picture it?',
  'create.situation.placeholder': 'Write it however it comes. There are no wrong answers.',
  'create.situation.examples': 'Examples',
  'create.situation.ex1': 'I’m hugging my mom after a fight',
  'create.situation.ex2': 'Your teacher explaining math in a warm voice',
  'create.situation.tip': 'You can say who they are, where you are and how you feel. One sentence is enough.',
  'create.situation.help': 'What do I write here?',
  'create.next': 'Continue',
  'create.back': 'Back',
  'create.save': 'Save and continue',
  'create.saving': 'Getting {name} ready…',
  'create.portrait': 'Also create an illustrated portrait',
  'create.portraitPro': 'Illustrated portrait (Pro)',
  'create.limitReached': 'The free plan includes one avatar. Go Pro to create more.',
  'create.defaultName': 'Luna',

  'chat.typing': 'typing…',
  'chat.online': 'online',
  'chat.listening': 'listening to your note…',
  'chat.placeholder': 'Type a message',
  'chat.empty': 'Say hi to {name}. They’re here for you.',
  'chat.situation': 'The situation',
  'chat.export': 'Export conversation',
  'chat.voiceNote': 'Voice note',
  'chat.errorSend': 'We couldn’t send your message. Please try again.',
  'chat.loadingOlder': 'Loading earlier messages…',
  'chat.freeLeft': '{n} free messages left',
  'chat.proUnlimited': 'Pro · unlimited',

  'voice.tap': 'Tap the microphone to record',
  'voice.recording': 'Recording…',
  'voice.stop': 'Stop',
  'voice.preview': 'Listen before sending',
  'voice.send': 'Send',
  'voice.discard': 'Discard',
  'voice.permission': 'We need microphone access to record your voice.',
  'voice.tooShort': 'That note is too short. Hold on a little longer.',
  'voice.play': 'Play',
  'voice.pause': 'Pause',
  'voice.transcript': 'Transcript',

  'pro.title': 'Would you like to keep talking with this avatar without limits?',
  'pro.body': '{name} wants to keep listening to you.',
  'pro.price': '$9.90 USD / month',
  'pro.priceNote': 'or the equivalent in your currency. Cancel anytime.',
  'pro.f1': 'Unlimited conversations',
  'pro.f2': 'More avatars',
  'pro.f3': 'Memory: remembers what you share',
  'pro.f4': 'Unlimited voice notes',
  'pro.f5': 'Illustrated portraits',
  'pro.cta': 'Continue with Pro',
  'pro.notNow': 'Not now',
  'pro.opening': 'Opening secure checkout…',
  'pro.success': 'Done! You’re Pro now. Keep talking as much as you like.',
  'pro.pending': 'We’re confirming your payment…',
  'pro.manage': 'Manage subscription',
  'pro.active': 'Pro active',

  'tabs.chats': 'Chats',
  'tabs.profile': 'Profile',
  'tabs.settings': 'Settings',

  'chats.title': 'Chats',
  'chats.new': 'New avatar',
  'chats.empty': 'You don’t have any avatars yet.',
  'chats.startHint': 'Tap to start talking',
  'chats.delete': 'Delete',
  'chats.deleteConfirm': 'Delete {name} and the whole conversation?',
  'chats.voice': '🎤 Voice note',

  'profile.title': 'Profile',
  'profile.name': 'Your name',
  'profile.plan': 'Your plan',
  'profile.free': 'Free',
  'profile.pro': 'Pro',
  'profile.upgrade': 'Go Pro · $9.90/month',
  'profile.stats': '{avatars} avatars · {messages} messages',
  'profile.signOut': 'Sign out',
  'profile.since': 'On Lovel House since {date}',
  'profile.renews': 'Renews on {date}',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.privacy': 'Privacy',
  'settings.storeVoice': 'Keep my voice notes',
  'settings.storeVoiceHint': 'If you turn this off, your audio is only transcribed and never stored.',
  'settings.privacyNote': 'Your conversations are private. No one else can read them.',
  'settings.password': 'Change password',
  'settings.newPassword': 'New password',
  'settings.passwordSaved': 'Password updated.',
  'settings.deleteChats': 'Delete all my conversations',
  'settings.deleteChatsConfirm': 'All messages and audio will be deleted. Your avatars stay.',
  'settings.deleteAccount': 'Delete my account',
  'settings.deleteAccountConfirm': 'Everything will be deleted: avatars, conversations and audio. This can’t be undone.',
  'settings.version': 'Version {v}',

  'export.title': 'Export conversation',
  'export.html': 'Text + audio (HTML)',
  'export.txt': 'Text only (.txt)',
  'export.preparing': 'Preparing your conversation…',
  'export.header': 'Conversation with {name}',
  'export.you': 'You',
};

const dictionaries: Record<Language, Record<Key, string>> = { es, en };
const STORAGE_KEY = 'hc.language';

export type TFunction = (key: Key, vars?: Record<string, string | number>) => string;

interface I18nValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? 'es';
  return code === 'en' ? 'en' : 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'es' || stored === 'en') setLanguageState(stored);
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback<TFunction>(
    (key, vars) => {
      let text = dictionaries[language][key] ?? es[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return ctx;
}
