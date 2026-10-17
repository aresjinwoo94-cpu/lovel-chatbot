/**
 * Textos legales de Lovel House (Términos y Privacidad): cortos y en lenguaje claro.
 * Revisados por la persona responsable del servicio antes de publicarlos como definitivos.
 */
import type { Language } from './types';

/** Correo de contacto que aparece en los textos legales (pendiente: lo indica la persona responsable). */
export const CONTACT_EMAIL = '';

export interface LegalDoc {
  title: string;
  updated: string;
  sections: { h: string; p: string[] }[];
}

const contact = (lang: Language) =>
  CONTACT_EMAIL
    ? [{ h: lang === 'es' ? 'Contacto' : 'Contact', p: [lang === 'es' ? `Escríbenos a ${CONTACT_EMAIL}.` : `Write to us at ${CONTACT_EMAIL}.`] }]
    : [];

const docs: Record<'terms' | 'privacy', Record<Language, LegalDoc>> = {
  terms: {
    es: {
      title: 'Términos de uso',
      updated: 'Última actualización: 17 de octubre de 2026',
      sections: [
        { h: 'Solo mayores de 18', p: ['Lovel House es solo para personas mayores de 18 años. Si eres menor, no puedes usarla. Cerraremos las cuentas de menores.'] },
        { h: 'Qué es', p: ['Una app de historias de ficción con personajes de inteligencia artificial. Los personajes no son personas reales, todos son adultos, y lo que dicen es ficción.'] },
        { h: 'Normas', p: ['Nada de contenido sexual explícito, nada que involucre a menores y nada de violencia, acoso u odio reales. Podemos cerrar las cuentas que no lo respeten.'] },
        { h: 'Cuenta y plan Pro', p: ['Puedes borrar tus conversaciones o tu cuenta desde Ajustes. Pro es una suscripción mensual que puedes cancelar cuando quieras.'] },
        { h: 'Cambios', p: ['Si cambiamos algo importante, te avisaremos en la app.'] },
      ],
    },
    en: {
      title: 'Terms of use',
      updated: 'Last updated: October 17, 2026',
      sections: [
        { h: 'Adults 18+ only', p: ['Lovel House is only for people aged 18 and over. If you are a minor, you can’t use it. We close accounts that belong to minors.'] },
        { h: 'What it is', p: ['A fiction app with AI characters. Characters are not real people, they are all adults, and what they say is fiction.'] },
        { h: 'Rules', p: ['No sexually explicit content, nothing involving minors, and no real violence, harassment or hate. We may close accounts that break these rules.'] },
        { h: 'Account and Pro', p: ['You can delete your conversations or your account from Settings. Pro is a monthly subscription you can cancel at any time.'] },
        { h: 'Changes', p: ['If we change something important, we’ll let you know in the app.'] },
      ],
    },
  },
  privacy: {
    es: {
      title: 'Política de privacidad',
      updated: 'Última actualización: 17 de octubre de 2026',
      sections: [
        { h: 'Solo mayores de 18', p: ['Lovel House es solo para personas mayores de 18 años. Si vemos que una cuenta es de un menor, la borramos con sus datos.'] },
        { h: 'Qué guardamos', p: ['Tu correo, el nombre con el que quieres que te llamen, tu idioma, tu confirmación de edad, tus personajes y tus conversaciones. Tus notas de voz solo si lo permites en Ajustes.'] },
        { h: 'Para qué', p: ['Para que los personajes respondan, recuerden vuestra historia y hablen con voz, y para gestionar tu plan. No vendemos tus datos ni los usamos para publicidad.'] },
        { h: 'Con quién', p: ['Solo con los proveedores que hacen funcionar la app (servidores, inteligencia artificial, voz y pagos). Tus conversaciones son privadas.'] },
        { h: 'Tus derechos', p: ['Desde Ajustes puedes exportar o borrar tus conversaciones y eliminar tu cuenta con todos tus datos.'] },
      ],
    },
    en: {
      title: 'Privacy policy',
      updated: 'Last updated: October 17, 2026',
      sections: [
        { h: 'Adults 18+ only', p: ['Lovel House is only for people aged 18 and over. If we find an account belongs to a minor, we delete it with its data.'] },
        { h: 'What we store', p: ['Your email, the name you want to be called, your language, your age confirmation, your characters and your conversations. Your voice notes only if you allow it in Settings.'] },
        { h: 'Why', p: ['So characters can reply, remember your story and speak, and to manage your plan. We don’t sell your data or use it for ads.'] },
        { h: 'Who with', p: ['Only the providers that run the app (servers, AI, voice and payments). Your conversations are private.'] },
        { h: 'Your rights', p: ['From Settings you can export or delete your conversations and delete your account with all your data.'] },
      ],
    },
  },
};

export const legalDoc = (kind: 'terms' | 'privacy', lang: Language): LegalDoc => {
  const d = docs[kind][lang];
  return { ...d, sections: [...d.sections, ...contact(lang)] };
};
