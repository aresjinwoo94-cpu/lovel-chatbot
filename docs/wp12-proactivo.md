# WP-12 · Mensajes del personaje por su cuenta

Cada personaje puede escribirte primero. Está **apagado por defecto** y se activa por personaje:
- desde el chat, con la campana;
- desde Ajustes → Mensajes por su cuenta.

La opción se explica antes de activarla y tiene dos frecuencias: "De vez en cuando" y "Seguido".

## Reglas

| Regla | Dónde se cumple |
|---|---|
| Gratis: 1 al día; Pro: hasta 3 (entre todos los personajes) | `decide()` y `proactive_insert` (atómico) |
| No gasta Platino | No pasa por `platino_spend` |
| Horario de silencio de 22:00 a 9:00 (hora local), configurable | `inQuietHours`. La app no deja guardar inicio = fin |
| Un aviso que no se entrega caduca antes de que empiece el silencio | `secondsUntilQuiet`, que fija el TTL de Web Push y de Expo |
| Si no respondes, **ningún** personaje vuelve a escribir hasta que hables tú, a cualquiera. Un personaje que apagaste no cuenta | `proactive_user_pending` (`0017`) y `proactive_insert` |
| Un personaje por persona en cada pasada | `proactive-tick` |
| El personaje puede decidir que ahora no es el momento | Responde `[WAIT]` y no se envía nada |
| Desactivar a un toque | "Que no me escriba" bajo el mensaje y en la notificación (enlace firmado que solo apaga) |

## Reglas de cuidado

Cada mensaje pasa por tres filtros. Si falla, se reintenta hasta dos veces; si sigue fallando, no se envía.

1. **Prompt.** El mensaje se escribe a distancia y retoma algo concreto. Lleva la fecha y la hora locales y lo último que dijo la persona. Prohíbe:
   - la culpa, la presión, echar de menos o la soledad;
   - las compras, el Platino, Pro, la app y la IA.

   Además pide no suponer el género de la persona y ser suave si pidió espacio.
2. **Frases prohibidas.** Expresiones regulares, con tests: `proactive.test.ts`.
3. **Revisor.** Un modelo barato recibe la situación de la historia, la fecha de cada mensaje y la hora actual. Rechaza:
   - culpa o presión;
   - echar de menos;
   - compras;
   - mensajes genéricos;
   - gestos "delante" de la persona;
   - contradicciones de tiempo;
   - suponer el género;
   - hechos inventados o que no encajan con el personaje;
   - errores de gramática.

   Recibe también quién es el personaje y cómo se llama la persona.

También se comprueba el idioma: las acotaciones escritas en otro idioma se quitan, y si el diálogo está en otro idioma, se reintenta.

## Técnica

- **Programación:** pg_cron llama a `proactive-tick` cada hora, en el minuto 7. El secreto se guarda en Vault y la programación está en `0016`.
- **Selección:** los candidatos se procesan en orden aleatorio (Fisher-Yates), hasta 40 envíos por pasada y 8 a la vez. Pasados 90 s no se empiezan más envíos.
- **Modelo:** Gemini 3.1 Flash-Lite. Los reintentos usan 3.5 Flash-Lite.
- **Avisos web:** Web Push con VAPID y `public/sw.js`.
- **Avisos en Android/iOS:** `expo-notifications`.
- **Suscripciones:** cada suscripción pertenece a la cuenta con sesión (`claim_push_subscription`) y se libera al cerrar sesión.

### Qué funciona ya y qué necesita build nativo

| | Web (lovel-house.expo.app) | Android / iOS |
|---|---|---|
| Mensaje en el chat | Sí | Sí |
| Avisos | Chrome, Edge y Firefox. En iPhone, solo con la web añadida a la pantalla de inicio | Necesita build de desarrollo (`eas build --profile development`). En Expo Go para Android no hay push remoto |
| Botón "Que no me escriba" en la notificación | Chrome y Edge. En Safari y Firefox está en el mensaje que abre la notificación | Sí, con la build nativa |

## Aceptación

- **Reloj simulado** (`deno test supabase/functions/_shared/proactive.test.ts`, 14 tests) en 14 días, con una pasada por hora:
  - gratis, "De vez en cuando", responde siempre: 9 mensajes, nunca 2 el mismo día, nunca en silencio;
  - Pro, "Seguido": hasta 3 al día, nunca en silencio;
  - si nunca responde: un solo mensaje;
  - silencio personalizado de 13 a 16 en Madrid: se respeta.
- **Carrera:** tres pasadas a la vez sobre el mismo personaje guardan un solo mensaje.
- **Flujo real:**
  - activar desde el chat;
  - el servidor envía;
  - aparece "Te escribió por su cuenta · Que no me escriba";
  - un toque lo apaga.

  Se revisó a 390 y 1440 px, en claro y oscuro (`docs/wp12/*.jpg`).
- **Ejemplos reales del modelo de producción**, generados con el código final y la conversación de prueba indicada. Ante la duda, el sistema no envía:

| Personaje | Lo último que dijo la persona | Mensaje por su cuenta |
|---|---|---|
| Nyx | Claroscuro, escenas de la calle, modelos reales. Quédate con eso y mañana me cuentas. | ¿Sobreviviste a Caravaggio o al final te persiguió en sueños? |
| Kai | Vale, el sábado me paso | No se envió: el revisor lo consideró presión o fuera de tiempo, y se reintenta en la próxima hora |
| Sol | No quiero hablar mucho, solo estoy cansada | Te dejo esto por aquí para cuando te apetezca picar algo, sin presión. |
| Ren | ¡Sí, porfa! Es para el cumpleaños de mi madre el viernes | Al final encontré también una edición ilustrada de Bashō que creo que le va a encantar a tu madre. ¿Te paso ambas cuando vengas por la biblioteca? |
| Vera | Come poco, pero bebe agua | ¿Sigue sin querer probar bocado?  No me gusta que esté así, avísame en cuanto puedas y si se mueve o sigue muy apático. |
| Dante | Ríete, ya verás | Bueno, todavía no es jueves, ¿o es que te estás entrenando a escondidas? |
| Zoe | Okay okay, I will try | Still breathing after that presentation, or did the client actually survive your pitch? I bet you didn't even break a sweat. |
| Elio | Noted! I leave on Monday | No se envió: el revisor lo consideró presión o fuera de tiempo, y se reintenta en la próxima hora |
| Hana | Show me when you finish it | The sky finally stopped looking so moody, so it’s almost ready. Would you like to swing by the studio tomorrow to see the birds? |
| Vita | Thanks, I am a bit worried | I was just thinking about your grandmother's surgery coming up this Thursday. How are you holding up with all the anticipation? |

Las acotaciones entre asteriscos se omiten en la tabla.

## Pendiente

- Opción para ocultar el texto en la pantalla de bloqueo (vista previa privada).
- El revisor prioriza la seguridad: a veces descarta mensajes válidos. El personaje lo intenta de nuevo la hora siguiente.
- La apertura del personaje de catálogo Nyx ("Llegas tarde… pensé que ya no vendrías") suena a reproche. Queda fuera de este WP; propongo revisarla con los personajes de WP-13.
