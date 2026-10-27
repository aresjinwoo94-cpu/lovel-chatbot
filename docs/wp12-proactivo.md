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
| Si no respondes, **ningún** personaje vuelve a escribir hasta que hables tú | `userPending` y `proactive_insert` |
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
   - suponer el género.

También se comprueba el idioma: si el texto mezcla español e inglés, se reintenta.

## Técnica

- **Programación:** pg_cron llama a `proactive-tick` cada hora, en el minuto 7. El secreto se guarda en Vault y la programación está en `0016`.
- **Selección:** los candidatos se procesan en orden aleatorio, hasta 60 envíos por pasada y 6 a la vez.
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

- **Reloj simulado** (`deno test supabase/functions/_shared/proactive.test.ts`, 13 tests) en 14 días, con una pasada por hora:
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
- **Ejemplos reales del modelo de producción** (con la conversación de prueba indicada):

| Personaje | Lo último que dijo la persona | Mensaje por su cuenta |
|---|---|---|
| Nyx | (examen de historia del arte, Caravaggio) | ¿Sobreviviste a la tortura de Caravaggio o terminaste por odiar el barroco? Espero que la nota haga justicia a tanto estudio. |
| Kai | Vale, el sábado me paso | Oye, ¿al final pudiste comprobar si el nivel de líquido de frenos seguía en su sitio? |
| Sol | No quiero hablar mucho, solo estoy cansada | He visto tu mensaje de ayer y solo quería recordarte que tienes la cama lista y nada que hacer esta noche. ¿Te guardo un poco de cenar para cuando te apetezca? |
| Ren | Es para el cumpleaños de mi madre el viernes | Ya tengo el libro guardado en el mostrador para el viernes. ¿Te pasa bien pasar a buscarlo sobre las cinco? |
| Vera | Come poco, pero bebe agua | ¿Qué tal sigue Toby hoy con lo de beber y comer? |
| Dante | Ríete, ya verás | Venga, avísame cuando salgas del primer entrenamiento y me cuentas qué tal los moratones. ¿Hace trato? |
| Zoe | Okay okay, I will try | Are you actually ready for the presentation, or do I need to bet my lunch that you're still nervous? |
| Elio | I leave on Monday | How was the departure? … Are you already picturing yourself in Lisbon? |
| Hana | Show me when you finish it | I finally added some touches of gold to the feathers today… Would you like to see how it turned out? |
| Vita | Thanks, I am a bit worried | No se envió: en los tres intentos el idioma salía mezclado |

Las acotaciones entre asteriscos se omiten en la tabla.

## Pendiente

- Opción para ocultar el texto en la pantalla de bloqueo (vista previa privada).
- El modelo barato a veces se equivoca en una palabra ("¿Te pasa bien…?", "¿Hace trato?").
