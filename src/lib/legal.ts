/**
 * Textos legales de Lovel House (Términos y Privacidad): cortos y en lenguaje claro.
 * Textos aprobados por la persona responsable del servicio.
 */
import type { Language } from './types';

/** Correo de contacto que aparece en los textos legales. */
export const CONTACT_EMAIL = 'aresjinwoo94@gmail.com';

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
        {
          h: 'Platino',
          p: [
            'Platino es la unidad con la que se usa la app: cada mensaje cuesta 1 Platino y cada nota de voz del personaje, 8. No es dinero, no se puede canjear por dinero ni transferir a otra cuenta.',
            'Con una cuenta gratuita recibes 40 Platino cada día; se renueva a medianoche de tu zona horaria y no se acumula. Como invitado, sin cuenta, tienes 15 Platino de prueba una sola vez.',
            'Pro ($9.90 USD al mes) incluye 1.500 Platino cada mes, además de los 40 diarios; el Platino del mes no se acumula al siguiente. Los paquetes (400 Platino por $1.99 USD y 1.200 Platino por $4.99 USD) son pagos únicos y su Platino no caduca.',
            'Se gasta primero el Platino diario, luego el de Pro, después el de prueba y al final el comprado. Si una respuesta falla, el Platino gastado se devuelve; si el personaje no puede responder con voz, la nota de voz se cobra como un mensaje (1 Platino). Los precios se muestran siempre en dinero real antes de pagar; los pagos los procesa Stripe.',
          ],
        },
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
        {
          h: 'Platinum',
          p: [
            'Platinum is how you use the app: each message costs 1 Platinum and each character voice note 8. It is not money, cannot be exchanged for money or transferred to another account.',
            'With a free account you get 40 Platinum every day; it renews at midnight in your time zone and doesn’t stack. As a guest, without an account, you get 15 trial Platinum once.',
            'Pro ($9.90 USD a month) includes 1,500 Platinum every month, on top of the daily 40; monthly Platinum doesn’t carry over. Packs (400 Platinum for $1.99 USD and 1,200 Platinum for $4.99 USD) are one-time payments and their Platinum never expires.',
            'Daily Platinum is spent first, then Pro, then trial, and purchased last. If a reply fails, the Platinum spent is returned; if the character can’t reply with voice, the voice note is charged as a message (1 Platinum). Prices are always shown in real money before paying; payments are processed by Stripe.',
          ],
        },
        { h: 'Changes', p: ['If we change something important, we’ll let you know in the app.'] },
      ],
    },
  },
  privacy: {
    es: {
      title: 'Política de privacidad',
      updated: 'Última actualización: 23 de octubre de 2026',
      sections: [
        { h: 'Solo mayores de 18', p: ['Lovel House es solo para personas mayores de 18 años. Si vemos que una cuenta es de un menor, la borramos con sus datos.'] },
        { h: 'Qué guardamos', p: ['Tu correo, el nombre con el que quieres que te llamen, tu idioma, tu confirmación de edad, tus personajes y tus conversaciones. Tus notas de voz solo si lo permites en Ajustes.', 'Además, estadísticas de uso para mejorar la app: qué pantallas visitas, cuánto tiempo y el país aproximado (según la zona horaria de tu dispositivo). No guardamos tu IP ni tu ubicación.'] },
        { h: 'Para qué', p: ['Para que los personajes respondan, recuerden vuestra historia y hablen con voz, y para gestionar tu plan. No vendemos tus datos ni los usamos para publicidad.'] },
        { h: 'Con quién', p: ['Solo con los proveedores que hacen funcionar la app (servidores, inteligencia artificial, voz y pagos). Tus conversaciones son privadas.'] },
        { h: 'Tus derechos', p: ['Desde Ajustes puedes exportar o borrar tus conversaciones y eliminar tu cuenta con todos tus datos.'] },
      ],
    },
    en: {
      title: 'Privacy policy',
      updated: 'Last updated: October 23, 2026',
      sections: [
        { h: 'Adults 18+ only', p: ['Lovel House is only for people aged 18 and over. If we find an account belongs to a minor, we delete it with its data.'] },
        { h: 'What we store', p: ['Your email, the name you want to be called, your language, your age confirmation, your characters and your conversations. Your voice notes only if you allow it in Settings.', 'We also keep usage statistics to improve the app: which screens you visit, for how long, and your approximate country (from your device’s time zone). We don’t store your IP address or your location.'] },
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
