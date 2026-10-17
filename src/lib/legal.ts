/**
 * Textos legales base de Lovel House (Términos y Privacidad).
 * BORRADOR: redactado como punto de partida; debe revisarlo la persona responsable
 * del servicio (y, si procede, un abogado) antes de darlo por definitivo.
 */
import type { Language } from './types';

export interface LegalDoc {
  title: string;
  updated: string;
  sections: { h: string; p: string[] }[];
}

const UPDATED = { es: 'Última actualización: 17 de octubre de 2026', en: 'Last updated: October 17, 2026' };

const terms: Record<Language, LegalDoc> = {
  es: {
    title: 'Términos de uso',
    updated: UPDATED.es,
    sections: [
      {
        h: '1. Solo para mayores de 18 años',
        p: [
          'Lovel House es un servicio exclusivo para personas adultas. Para usarlo debes tener al menos 18 años (o la mayoría de edad de tu país, si es mayor). Al entrar confirmas que cumples este requisito.',
          'Si nos consta que una cuenta pertenece a una persona menor de edad, la cerraremos y borraremos sus datos.',
        ],
      },
      {
        h: '2. Qué es Lovel House',
        p: [
          'Lovel House es una app de ficción conversacional: hablas con personajes creados por inteligencia artificial. Los personajes no son personas reales y sus respuestas son ficción generada automáticamente; pueden contener errores y no constituyen consejo profesional de ningún tipo.',
          'Todos los personajes y situaciones de Lovel House representan a personas adultas.',
        ],
      },
      {
        h: '3. Uso aceptable',
        p: [
          'No puedes usar Lovel House para crear, pedir ni difundir contenido sexual explícito, contenido que involucre o sexualice a menores de edad, ni contenido que promueva la violencia real, el acoso, el odio o actividades ilegales.',
          'No intentes que un personaje interprete a una persona menor de edad. Los personajes están configurados para negarse.',
          'Podemos limitar o cerrar cuentas que incumplan estas normas.',
        ],
      },
      {
        h: '4. Tu cuenta y modo invitado',
        p: [
          'Puedes empezar sin cuenta (modo invitado). Si creas una cuenta, eres responsable de mantener tu acceso seguro. Puedes borrar tus conversaciones o eliminar tu cuenta en cualquier momento desde Ajustes.',
        ],
      },
      {
        h: '5. Plan Pro y pagos',
        p: [
          'El plan gratuito tiene límites de mensajes y notas de voz. El plan Pro es una suscripción mensual que se gestiona a través de nuestro proveedor de pagos y que puedes cancelar cuando quieras; seguirá activa hasta el final del periodo pagado.',
        ],
      },
      {
        h: '6. Contenido que importas',
        p: [
          'Si importas un modelo 3D propio, declaras que tienes derecho a usarlo y que representa a una persona adulta.',
        ],
      },
      {
        h: '7. Cambios',
        p: ['Podemos actualizar estos términos. Si el cambio es importante, te avisaremos dentro de la app.'],
      },
    ],
  },
  en: {
    title: 'Terms of use',
    updated: UPDATED.en,
    sections: [
      {
        h: '1. Adults only (18+)',
        p: [
          'Lovel House is a service for adults only. You must be at least 18 years old (or the age of majority in your country, if higher) to use it. By entering you confirm that you meet this requirement.',
          'If we learn that an account belongs to a minor, we will close it and delete its data.',
        ],
      },
      {
        h: '2. What Lovel House is',
        p: [
          'Lovel House is a conversational fiction app: you talk with characters powered by artificial intelligence. Characters are not real people and their replies are automatically generated fiction; they may contain mistakes and are not professional advice of any kind.',
          'Every character and situation in Lovel House depicts adults.',
        ],
      },
      {
        h: '3. Acceptable use',
        p: [
          'You may not use Lovel House to create, request or share sexually explicit content, content that involves or sexualizes minors, or content that promotes real-world violence, harassment, hate or illegal activity.',
          'Do not try to make a character play a minor. Characters are configured to refuse.',
          'We may limit or close accounts that break these rules.',
        ],
      },
      {
        h: '4. Your account and guest mode',
        p: [
          'You can start without an account (guest mode). If you create an account, you are responsible for keeping your access secure. You can delete your conversations or your account at any time from Settings.',
        ],
      },
      {
        h: '5. Pro plan and payments',
        p: [
          'The free plan has message and voice note limits. Pro is a monthly subscription handled by our payment provider; you can cancel at any time and it stays active until the end of the paid period.',
        ],
      },
      {
        h: '6. Content you import',
        p: ['If you import your own 3D model, you confirm you have the right to use it and that it depicts an adult.'],
      },
      {
        h: '7. Changes',
        p: ['We may update these terms. If a change is significant, we will let you know in the app.'],
      },
    ],
  },
};

const privacy: Record<Language, LegalDoc> = {
  es: {
    title: 'Política de privacidad',
    updated: UPDATED.es,
    sections: [
      {
        h: '1. Servicio para mayores de 18 años',
        p: [
          'Lovel House es solo para personas adultas. No recopilamos a sabiendas datos de menores de 18 años; si detectamos que una cuenta pertenece a un menor, la eliminamos junto con sus datos.',
        ],
      },
      {
        h: '2. Qué datos tratamos',
        p: [
          'Datos de cuenta: correo electrónico (o el de Google, si entras con Google), el nombre con el que quieres que te llamen, idioma y tu confirmación de mayoría de edad.',
          'Contenido: los personajes que creas, tus conversaciones y, si lo permites en Ajustes, tus notas de voz. Si desactivas esa opción, el audio solo se transcribe y no se guarda.',
          'Pagos: si te suscribes a Pro, el pago lo procesa nuestro proveedor de pagos; nosotros no vemos ni guardamos los datos de tu tarjeta.',
        ],
      },
      {
        h: '3. Para qué los usamos',
        p: [
          'Para que los personajes respondan y recuerden vuestra historia, para generar sus voces, para aplicar los límites del plan gratuito y para gestionar tu suscripción. No vendemos tus datos ni los usamos para publicidad.',
        ],
      },
      {
        h: '4. Con quién se comparten',
        p: [
          'Usamos proveedores que procesan datos en nuestro nombre: alojamiento y base de datos, un proveedor de modelos de lenguaje para generar las respuestas, un proveedor de síntesis y transcripción de voz, y el proveedor de pagos. Solo reciben lo necesario para prestar el servicio.',
        ],
      },
      {
        h: '5. Tus conversaciones son privadas',
        p: ['Solo tú puedes ver tus conversaciones desde la app. No las publicamos ni las compartimos con otras personas usuarias.'],
      },
      {
        h: '6. Tus derechos',
        p: [
          'Desde Ajustes puedes exportar o borrar tus conversaciones y eliminar tu cuenta con todos sus datos. También puedes pedirnos acceso, corrección o borrado de tus datos.',
        ],
      },
      {
        h: '7. Cambios',
        p: ['Si cambiamos esta política de forma importante, te avisaremos dentro de la app.'],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    updated: UPDATED.en,
    sections: [
      {
        h: '1. A service for adults (18+)',
        p: [
          'Lovel House is for adults only. We do not knowingly collect data from anyone under 18; if we find that an account belongs to a minor, we delete it together with its data.',
        ],
      },
      {
        h: '2. What data we process',
        p: [
          'Account data: your email (or your Google email, if you sign in with Google), the name you want to be called, language and your age confirmation.',
          'Content: the characters you create, your conversations and, if you allow it in Settings, your voice notes. If you turn that off, audio is only transcribed and not stored.',
          'Payments: if you subscribe to Pro, payment is processed by our payment provider; we never see or store your card details.',
        ],
      },
      {
        h: '3. Why we use it',
        p: [
          'So characters can reply and remember your story, to generate their voices, to apply the free plan limits and to manage your subscription. We do not sell your data or use it for advertising.',
        ],
      },
      {
        h: '4. Who we share it with',
        p: [
          'We use providers that process data on our behalf: hosting and database, a language model provider to generate replies, a voice synthesis and transcription provider, and the payment provider. They only receive what is needed to run the service.',
        ],
      },
      {
        h: '5. Your conversations are private',
        p: ['Only you can see your conversations in the app. We do not publish them or share them with other users.'],
      },
      {
        h: '6. Your rights',
        p: [
          'From Settings you can export or delete your conversations and delete your account with all its data. You can also ask us for access to, correction or deletion of your data.',
        ],
      },
      {
        h: '7. Changes',
        p: ['If we change this policy in a significant way, we will let you know in the app.'],
      },
    ],
  },
};

export const legalDoc = (kind: 'terms' | 'privacy', lang: Language) => (kind === 'terms' ? terms : privacy)[lang];
