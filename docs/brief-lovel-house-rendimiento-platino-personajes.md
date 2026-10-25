# Brief para Code — Lovel House: velocidad y calidad estricta, Platino, mensajes del personaje y catálogo investigado

Repo: `aresjinwoo94-cpu/lovel-chatbot`. Continúa sobre WP-1 a WP-8 (`docs/brief-lovel-house-coherencia-estilo-tema.md` y `docs/brief-lovel-house-personajes-y-chat.md`).
Lee `AGENTS.md`; usa la documentación de Expo v57; `npx expo lint` + `npx tsc --noEmit` antes de cerrar cada WP.

**Forma de trabajo:** un work package por rama/PR, en el orden de abajo. Cada WP cierra con capturas antes/después, mediciones y verificación por un subagente que no haya escrito el código. Donde el brief dice "espera mi OK", no construyas hasta tenerlo.

---

## Por qué estos cambios

Probé la app en mi teléfono (Android, tema oscuro). Va más lenta de lo que debería, el personaje tarda en cargar en el chat, la foto de perfil en "Historias recientes" sale cortada (se ve un trozo rojo en una esquina) y la boca de la mayoría de los personajes se ve rara.

Lovel House vende emoción. La gente paga por impulso, y solo paga si todo se siente cuidado. Una app lenta o un detalle roto mata la compra. A partir de ahora, **ningún WP se da por terminado si no cumple la Definición de Terminado de abajo.**

---

## Definición de Terminado (aplica a TODO, en este WP y en los siguientes)

Un cambio está terminado solo si:

1. **Rendimiento** dentro de los límites de la tabla (medido, no supuesto).
2. **Revisión visual** en 390 px y 1440 px, tema claro y oscuro, de cada pantalla tocada: nada cortado, desbordado, desalineado, con texto montado o imágenes mal recortadas.
3. **Coherencia**: los mismos nombres, términos y precios en todas partes (inicio, ajustes, paywall, perfil, términos). Si algo cambia de nombre, cambia en todos lados.
4. **Estados cubiertos**: cargando, vacío, error y sin conexión, cada uno con algo digno que mostrar (nunca pantalla en blanco ni spinner eterno).
5. **Revisión por subagente** que actúa como usuario exigente y lista todo lo que se vea descuidado. Se corrige antes de cerrar.

### Presupuestos de rendimiento (Android de gama media, 4G)

| Momento | Límite |
| --- | --- |
| Abrir la app hasta Inicio usable | ≤ 2 s |
| Entrar a un chat: foto/retrato del personaje visible | ≤ 300 ms |
| Personaje 3D visible la primera vez | ≤ 2.5 s |
| Personaje 3D visible si ya se cargó antes | ≤ 800 ms |
| Enviar mensaje hasta ver "escribiendo…" | ≤ 200 ms |
| Animación del personaje | ≥ 45 fps (si baja, degradar efectos solo) |

Mide en un teléfono real con un build de desarrollo o depuración remota de Chrome; el 3D por software del contenedor no sirve como referencia absoluta. Si no puedes medir en un dispositivo real, dame un script o pasos exactos para que yo lo mida y te pase los números.

---

## WP-9 — Velocidad y errores

1. **Diagnóstico primero:** perfila el arranque, la entrada al chat y la carga del 3D. Entrégame una tabla con dónde se va el tiempo antes de optimizar.
2. **Carga del personaje en el chat:**
   - Mostrar al instante el retrato estático del personaje y hacer un fundido al 3D cuando esté listo, para que nunca haya hueco vacío.
   - Los `.vrm` pesan ~6 MB: comprimir geometría y texturas (meshopt/Draco, texturas a 1024 px o KTX2 si three-vrm lo soporta bien) y medir la diferencia.
   - Guardar en caché los modelos ya descargados (Cache Storage en web, sistema de archivos en nativo) para que la segunda vez sea casi instantánea.
   - Precargar el modelo del personaje elegido durante el onboarding y el del último chat al abrir la app.
   - Cargar three.js y el escenario 3D solo cuando hacen falta, no en el arranque.
3. **Foto de perfil cortada** en "Historias recientes" (y revisar barra lateral, cabecera del chat y burbujas): el retrato de cara debe llenar su círculo, centrado en los ojos, sin trozos sueltos. Revisa por qué falla en Android.
4. **Barrido de errores:** revisa la consola y los logs de las Edge Functions durante un recorrido completo (onboarding, chat, voz, personalizar, ajustes, paywall) y corrige todo lo que aparezca. Lista lo encontrado.

**Aceptación:** tabla de tiempos antes/después contra los presupuestos, capturas de la foto de perfil corregida en todos los lugares, lista de errores corregidos.

---

## WP-10 — Calidad de los personajes: boca y coherencia con la edad

### Boca
La mayoría de los personajes tienen la boca rara en reposo: entreabierta, con una línea extraña o una forma que no encaja con la cara.

1. En reposo, la boca debe estar **cerrada y natural**, con una sonrisa muy leve o neutra según la personalidad. Revisa qué expresiones base están activas en reposo (p. ej. `relaxed` o restos de habla) y el contorno de los labios del sombreado nuevo.
2. Al hablar, que la boca se mueva de forma suave y vuelva a cerrarse al terminar.
3. Añade al QA de WP-5 un **primer plano de la cara en reposo a doble tamaño** por personaje; el subagente revisa específicamente boca, ojos y cejas.

### Coherencia con la edad
Cuando se elige una edad (18–22, 23–27, 28–34, 35+), la apariencia debe corresponder, siempre adulta:

- **18–22:** joven adulto, rasgos frescos pero nunca infantiles; ropa casual.
- **23–27:** rasgos algo más definidos; ropa casual o de trabajo.
- **28–34:** rostro más maduro (ojos un poco menos grandes, mandíbula más definida), estilo más cuidado.
- **35+:** claramente maduro: peinados, ropa y rasgos de adulto mayor de 35, voz y forma de hablar acordes.

Implementa esto como un sistema: cada rango de edad define ajustes de rostro, proporciones, ropa, peinados permitidos y voz. Al cambiar la edad en Personalizar, el aspecto cambia en consecuencia; las opciones que no encajan con esa edad no se ofrecen. Los personajes del catálogo deben respetar su edad declarada.

**Aceptación:** hojas de QA con primer plano de cara de todos los personajes; capturas de un mismo personaje en los 4 rangos de edad.

---

## WP-11 — Plan gratis diario y sistema Platino

### Decisión de producto
- La competencia recibe quejas por precio y por mensajes gratis muy limitados. Nuestro precio ya es ventaja (Pro $9.90/mes); ahora el plan gratis será generoso **cada día**, para que la gente vuelva a diario.
- La moneda de la app se llama **Platino**. Todo consumo se mide en Platino.

### Reglas (valores iniciales; calíbralos con los costos reales, ver abajo)

| Concepto | Valor inicial |
| --- | --- |
| Mensaje de texto | 1 Platino |
| Nota de voz del personaje | 8 Platino |
| Invitado sin cuenta | 15 Platino una sola vez, luego crear cuenta |
| Plan gratis (con cuenta) | 40 Platino al día, se renueva a medianoche hora local, **no se acumula** |
| Pro ($9.90/mes) | 6.000 Platino al mes (unos 200 mensajes al día) + los 40 diarios gratis |
| Paquete de prueba | 400 Platino por $1.99 |
| Paquete mediano | 1.200 Platino por $4.99 |

- Orden de gasto: primero el Platino diario gratis, luego el de la suscripción, al final el comprado.
- El Platino de la suscripción se renueva cada mes y no se acumula de un mes a otro. El Platino comprado en paquetes **no caduca**.
- Pro también incluye: notas de voz, mensajes del personaje más frecuentes (WP-12) y memoria más larga. Detalla en la pantalla Pro qué incluye cada plan, sin letra pequeña.

### Calibración obligatoria
- Calcula el costo real por mensaje de texto y por nota de voz con el proveedor de IA y voz que usamos en producción. **El chat del plan gratis debe usar un modelo barato** (p. ej. el Gemini Flash-Lite que ya está integrado), nunca un modelo caro.
- Condición: un usuario Pro que gaste los 6.000 Platino completos no debe costarnos más del 40 % de lo que paga. Si no se cumple, ajusta las cantidades y explícame por qué.

### Interfaz
- Saldo de Platino visible y discreto en el chat y en el perfil, con un ícono propio (no un emoji genérico).
- Cuando se acaba el diario: mensaje amable, cuándo se renueva, y las opciones (esperar, paquete de prueba, Pro). Nunca bloquear a mitad de una frase del personaje.
- **Siempre mostrar el precio en dinero real** al comprar. Nada de esconder cuánto cuesta algo detrás del Platino.
- Actualiza todos los textos donde se mencionan mensajes o límites (inicio, "Hazte Pro", paywall, ajustes, términos) para que hablen de Platino de forma coherente.

### Pagos
- Usa Stripe (ya configurado): suscripción Pro y pagos únicos para paquetes. Webhook que acredita el Platino una sola vez por pago (idempotente).
- Saldo y descuentos solo en el servidor, con transacciones atómicas y un registro de movimientos.
- Nota para después: si publicamos en Google Play o App Store, los paquetes y Pro dentro de la app tendrán que ir por sus sistemas de compra. Deja el código preparado para eso, pero no lo implementes ahora.

**Antes de construir, muéstrame la tabla final calibrada con los costos reales y espera mi OK.**

---

## WP-12 — Mensajes del personaje por su cuenta (opcional)

El personaje puede escribirte primero, en momentos que tengan sentido con la historia.

### Reglas de producto
- **Apagado por defecto.** Se activa por personaje desde el chat o Ajustes, con una explicación clara de qué hace.
- Frecuencia elegible: "De vez en cuando" o "Seguido". El personaje decide el momento según la escena y lo último que hablaron (p. ej. retomar algo pendiente, contar qué le pasó, preguntar cómo te fue en algo que mencionaste).
- Límites: gratis, máximo 1 al día; Pro, hasta 3 al día. Estos mensajes **no gastan Platino** del usuario.
- Horario de silencio: nada entre las 22:00 y las 9:00 hora local, configurable.
- Si el usuario no responde a un mensaje espontáneo, el personaje **no vuelve a escribir** hasta que el usuario hable.
- El mensaje debe ser concreto y con contexto, fácil de responder.

### Reglas de cuidado (obligatorias, en el prompt y en tests)
- El personaje nunca culpa, presiona ni hace sentir mal al usuario por no escribir ("¿por qué me abandonaste?", "me siento sola sin ti").
- Nunca menciona compras, Platino ni el plan Pro.
- Desactivar debe estar a un toque, desde el propio mensaje o la notificación.

### Técnica
- Programación en el servidor (tarea programada de Supabase / pg_cron) que decide quién recibe mensaje, con el modelo barato.
- Entrega: mensaje en el chat + notificación. En web, notificaciones push si el navegador lo permite; en Android/iOS, `expo-notifications` (requiere build de desarrollo). Dime qué parte funciona ya en web y qué necesita build nativo.

**Aceptación:** prueba con un reloj simulado que muestre cuándo se envían, que se respetan límites y horarios, y 10 ejemplos de mensajes revisados por un subagente según las reglas de cuidado.

---

## WP-13 — Investigación y catálogo ampliado

Queremos más personajes, pero con criterio, no por cantidad.

### Fase 1: investigación (entregable: `docs/investigacion-personajes.md`)
Investiga en la web:
- Los personajes y categorías más populares en Character.AI, Talkie, Chai, Janitor/OOC y similares (qué arquetipos, qué situaciones, qué títulos tienen los más usados).
- Reseñas de esas apps en Google Play y App Store: qué piden y de qué se quejan los usuarios sobre personajes e historias.
- Qué situaciones enganchan más según la **edad del usuario** (18–24, 25–34, 35+): por ejemplo, vida universitaria y primeros trabajos, convivencia y pareja estable, segundas oportunidades, etc.
- Qué funciona en español y en Latinoamérica.

Resume en conclusiones concretas con fuentes. Nada de ideas abstractas.

### Fase 2: propuesta (espera mi OK)
Con la investigación, propón **24 personajes nuevos** (sumados a los actuales), equilibrados entre mujeres y hombres y entre rangos de edad. Para cada uno:
- nombre, edad, en una frase quién es **para el usuario** (vecina, compañero de trabajo, ex, jefe, amiga de la infancia…);
- personalidad concreta y forma de hablar;
- look coherente con su edad (WP-10) y su personalidad;
- 2–3 escenas de inicio **cotidianas y claras**: dónde estás, qué acaba de pasar, qué te dice. Nada metafórico ni críptico (regla de WP-7);
- a qué hallazgo de la investigación responde.

### Fase 3: construcción
Tras mi OK, construye los aprobados. Todos pasan el QA de WP-5 y WP-10 y la prueba de claridad de WP-7.

---

## Al terminar cada WP

Resumen breve: qué cambió, mediciones contra los presupuestos, capturas, y lo que necesito decidir yo.
