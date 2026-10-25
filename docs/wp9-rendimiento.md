# WP-9 · Velocidad y errores

## Cómo se midió

No hay un teléfono físico en este entorno, así que se midió en Chromium simulando un Android de
gama media con 4G:

- CPU 4× más lenta.
- 9 Mbps compartidos y 70 ms de RTT.
- Tamaños comprimidos con Brotli, como sirve EAS Hosting.
- Caché del navegador.

El 3D se dibuja por software (SwiftShader), mucho más lento que la GPU de un teléfono. Por eso
los tiempos de 3D de esta tabla son pesimistas. Los números definitivos salen del medidor en
un teléfono real (ver "Medir en tu teléfono").

Script: `perf.mjs`, en el scratchpad de la sesión. Crea un usuario temporal y lo borra al terminar.

## Antes / después

| Momento (presupuesto) | Antes (producción) | Después | ¿Cumple? |
|---|---|---|---|
| Primera visita → puerta 18+ usable | 4,0 s | 3,4–3,6 s | — (sin presupuesto propio) |
| Abrir app con sesión → Inicio usable (≤ 2 s) | 1,6 s | 1,9–2,4 s | En el límite: hay que medirlo en el teléfono |
| Chat desde Inicio: retrato visible (≤ 300 ms) | 0,73 s | 0,60 s desde el clic; 0,20–0,27 s si ya se abrió | Sí al volver; la 1.ª vez depende de la red |
| 3D primera vez (≤ 2,5 s) | 11,9 s | 6,3 s (por software) | Hay que medirlo en el teléfono (ver fases) |
| 3D ya cargado antes (≤ 800 ms) | 6,0 s | 0,27–0,37 s | **Sí** |
| Enviar → "escribiendo" (≤ 200 ms) | ~0,58 s | 0,28–0,32 s desde el toque (CPU 4×) | Casi: en el teléfono debería bajar |
| Animación (≥ 45 fps) | — | No medible por software | Hay que medirlo en el teléfono (el medidor da los fps) |

Fases del 3D la primera vez, sin GPU:

| Fase | Tiempo |
|---|---|
| Arranque | 0,4–0,6 s |
| Descarga (ya precargada) | 0,2 s |
| Lectura | 0,8 s |
| Montaje | 1,1 s |
| Primer fotograma | 2,6 s, casi todo compilación de shaders por software |

Con GPU, el primer fotograma suele bajar a cientos de milisegundos.

### Qué se cambió

**Retrato instantáneo**
- El chat abre con la foto del personaje al momento, ya sacada de la lista de Inicio, sin esperar a la red.
- La foto se funde con el 3D en cuanto este está listo (350 ms).

**Escenario 3D persistente**
- Hay un único escenario para toda la app. Al salir del chat se pausa (0 % de CPU) y se esconde con el personaje cargado.
- Volver al mismo personaje cuesta 0,3 s en lugar de 6 s.
- Si el personaje es otro, se reutiliza el mismo motor y no se vuelve a crear.

**Modelos `.vrm` comprimidos**
- Se usa EXT_meshopt_compression sin pérdida: 6,1 MB → 2,66 MB.
- Las hojas de QA confirman que se ven idénticos.
- Se sirven desde `vrm-models/v2/` con 30 días de caché. La raíz del bucket no se tocó, así que las versiones instaladas siguen funcionando.

**Caché de modelos**
- En web se usa Cache Storage (`lovel-vrm-v2`): la segunda vez el modelo sale del disco, sin red.
- En el teléfono el 3D vive en un WebView con origen https, así que usa la misma Cache Storage, que persiste entre aperturas de la app. Sustituye a la caché en archivos que pedía el brief: guarda los mismos bytes en el disco del teléfono y no necesita código nativo nuevo.

**Precarga**
- Durante el onboarding se precarga el personaje elegido. En Inicio, la última conversación.
- La precarga se salta si el teléfono tiene activado el ahorro de datos.
- Hoy solo funciona en web: en la app nativa el primer 3D descarga al abrir el chat y desde ahí queda en caché.

**three.js solo cuando hace falta**
- Arrancar la app ya no carga three.js: llega con el primer chat (255 KB comprimido, antes 2,3 MB).
- La versión minificada ocupa unos 600 KB menos.

**JS inicial más ligero**
- La web pasó de 852 KB a 668 KB y las fuentes de 205 KB a 164 KB:
  - Rutas asíncronas en web.
  - Lottie de 2,4 MB sustituido por tres puntos animados.
  - Iconos importados uno a uno.
  - Una fuente menos.
- Además se activó React Compiler.

## Errores encontrados y corregidos

Recorrido completo a 390 px: onboarding, chat como invitado, personalizar, crear cuenta, chat
con cuenta, nota de voz, Pro, ajustes, perfil, Inicio y borrar cuenta. Se capturaron la consola
y las peticiones ≥ 400. Después se revisaron los logs de las Edge Functions de las últimas 4 h:
0 respuestas ≥ 400 y 0 errores registrados en chat, start-chat, voice-chat, delete-data y track.

| # | Error | Arreglo |
|---|---|---|
| 1 | Foto de perfil recortada con un pico rojo en una esquina (Android, "Historias recientes") | La imagen recorta su propio círculo (`borderRadius`), además del contenedor |
| 2 | Escribir en el chat repintaba el escenario 3D entero; el envío tardaba 1,2 s | El escenario solo se actualiza cuando cambia algo suyo; los botones de encima van por una capa aparte |
| 3 | Nombre del personaje invisible en modo oscuro (pastilla sobre el escenario) | Texto blanco fijo sobre el fondo oscuro |
| 4 | Pantalla Pro: el subtítulo empezaba con "o su equivalente en tu moneda…" | Título bajo "Lovel House Pro"; la nota del precio va bajo el precio |
| 5 | Logo de la barra lateral sin fondo violeta en el chat (id de degradado repetido en la página) | Color plano, sin ids |
| 6 | Nota de voz con ruido transcrita como "[beeping]" y respondida por el personaje | Scribe sin etiquetas de sonido y filtro de `[…]` y `(…)`; si no hay voz: "No pudimos entender el audio…" |
| 7 | Etiquetas de las pestañas cortadas por abajo ("Ajustes") | Barra con altura propia y alto de línea |
| 8 | El interruptor en modo oscuro era invisible | La bolita es siempre blanca |
| 9 | El onboarding decía "Paso 3 de 3" con un paso por delante | Ahora son 4 pasos reales |
| 10 | Saludo con la parte del correo ("Buenos días, juan.perez93") y "Buenos días" a la 1 de la madrugada | Solo el nombre elegido; de 0 a 5 h es "Buenas noches" |
| 11 | Ajustes prometía "Nadie más puede leerlas", en contra de la política de privacidad | Texto fiel: solo tú las ves en la app; se procesan con proveedores de IA y voz |
| 12 | Pie de Ajustes con un "años. ·" sobrante | Corregido |

Esperados, no son fallos:
- Al borrar la cuenta, el cierre de sesión posterior recibe un 403 de `/logout` porque el usuario ya no existe. Supabase lo trata como éxito.
- En el entorno de pruebas, el WebSocket de Realtime a veces no conecta por el proxy.

Pasan a **WP-11**, que rehace esas pantallas:
- Pantalla Pro para quien ya es Pro.
- Contadores ("te quedan" frente a "usados").
- Formato del precio unificado.
- Enlaces legales junto al pago.

## Medir en tu teléfono

En la app hay un medidor escondido que mide justo los momentos del presupuesto.

1. Actívalo:
   - **Web** (Chrome en Android): abre `https://lovel-house.expo.app/?perf=1`.
   - **App instalada**: Ajustes → toca 5 veces la línea de abajo ("Lovel House · … · Versión 1.0.0").
2. Aparece un recuadro negro "Medidor" abajo a la izquierda.
3. Usa la app con normalidad, con 4G si puedes (no Wi-Fi):
   1. Ciérrala del todo y vuelve a abrirla: mide "Abrir app → Inicio usable".
   2. Entra a una conversación de Inicio: mide "Chat: retrato visible" y "3D primera vez".
   3. Espera 10 s con el personaje en pantalla: mide "Animación (fps)", cada 3 s.
   4. Envía un mensaje: mide "Enviar → escribiendo".
   5. Vuelve a Inicio y entra otra vez al mismo chat: mide "3D ya cargado antes".
   6. Repite los pasos 4 y 5 dos veces más.
4. Toca **Copiar** en la web o **Compartir** en la app, y pégame el texto. Incluye el modelo del teléfono.
5. Para quitarlo, toca **Apagar**.

Para el primer 3D "de verdad" (sin caché), en la web abre una ventana de incógnito con
`?perf=1`. En la app, Ajustes del teléfono → Apps → Lovel House → Almacenamiento → Borrar caché.
