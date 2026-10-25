# WP-10 · Boca y coherencia con la edad

## Boca

**El problema.** Las texturas de cara de VRoid traen dos defectos:
- Un punto de brillo blanco justo bajo la línea de la boca. De lejos parece la boca entreabierta o una segunda línea. Lo tienen 7 de los 9 cuerpos (todos menos `bibi` y `vita`).
- En los cuerpos masculinos (`hair_m`, `fumiriya`), una línea de boca muy larga, gruesa y naranja, que termina en bloque.

**El arreglo.** Va en el motor 3D (`avatar-stage/stage.html`, `cleanMouth`) y se detecta en la propia textura, así que vale para cualquier modelo con el mapa de VRoid:
- El brillo se reconoce por su color: casi blanco, con mucho azul para su rojo. Se rellena fila a fila con la piel de los lados.
- La línea pasa a tono labio, tiene un largo máximo y se afina hacia las comisuras. La piel de referencia es la de justo encima y debajo, para no dejar halos.
- `bibi` y `vita` tienen labios dibujados con forma propia y no se tocan.

**Interior de la boca.** Los gestos base (sonrisa, serio, pícaro) separan un poco los labios, y por la rendija asomaban los dientes como una raya blanca. En reposo, el interior de la boca (dientes y lengua) toma el tono de la sombra entre los labios, así que la rendija se lee como una sola línea. Al hablar, o con una emoción que abre la boca, recupera su color.

**Al hablar.** Las sílabas duran 0,1–0,19 s y la transición de una vocal a otra es suave. Al terminar, la boca se cierra en unos 0,25 s; comprobado que todas las vocales vuelven a 0.

**En la QA.** Cada hoja de `docs/qa/` empieza ahora con la cara en reposo a doble tamaño y la zona de boca y ojos ampliada. `docs/qa/CHECKLIST.md` añade la revisión de boca, ojos y cejas en reposo, y la de edad.

Capturas:
- `docs/wp10/boca-antes.png` y `docs/wp10/boca-despues.png`: los 12 personajes en reposo.
- `docs/wp10/boca-texturas.png`: textura original y limpia de cada cuerpo.

## Edad

El sistema vive en `src/lib/character/ageRanges.ts` y es la única fuente para el cuestionario, Personalizar, el chat y la QA del catálogo.

| Rango | Rostro (escenario 3D) | Ropa (cuerpos fuera) | Peinados fuera | Accesorios fuera | Voces (la 1.ª es la automática) |
|---|---|---|---|---|---|
| 18–22 | Base, cabeza 1,02 | — | — | — | Sarah, Laura, Jessica, Lily / Liam, Chris, Will, Eric |
| 23–27 | Párpado 0,07, iris 97 %; rubor ≤ 0,5 | — | — | — | Sarah, Jessica, Alice, Laura, Lily / Liam, Will, Eric, Chris, Callum |
| 28–34 | Párpado 0,2, iris 90 %, ojos "naturales", cabeza 0,96, sombreado en mejillas; maquillaje discreto (labios, sombra), rubor ≤ 0,2; ropa lisa | Gatita | Coletas, moños | Orejas de gato y conejo, lazo, horquilla de estrella | Alice, Lily, Matilda, Jessica / Eric, Callum, Brian, George, Will |
| 35+ | Párpado 0,36, iris 86 %, cabeza 0,93, sombreado más marcado, sombra de barba leve en hombres; maquillaje discreto, rubor ≤ 0,1; ropa lisa | Princesa, Gatita, Ciencia ficción, Urbano (sudadera), Casual (camiseta) | Coletas, moños, corto futurista | Las anteriores, más orejas de zorro, corona de flores, flor y alas de hada | Matilda, Alice, Lily / Brian, George, Daniel, Callum |

La voz neutra (River) vale para cualquier edad.

**Cómo se aplica:**
- **Rostro.** El escenario lo ajusta a partir de `look.age`: párpado superior, iris y su brillo más pequeños, ojos "naturales" del propio modelo, tamaño de la cabeza y sombreado. Con los rasgos anime de VRoid ese es el margen sin que la cara se vea rara. El resto de la madurez la dan el peinado, la ropa, la voz y la forma de hablar.
- **Personalizar.**
  - Cambiar la edad cambia el aspecto al momento.
  - Cuerpos, peinados, accesorios y voces solo ofrecen lo que encaja.
  - Lo que deja de encajar se sustituye por lo más parecido. Si cambia el cuerpo, se conserva el color de pelo y un peinado parecido (largo por largo).
  - Arriba hay botones con los 4 rangos y debajo la edad exacta.
  - Bajo la barra de edad, un texto explica el rango.
- **Cuestionario.** Los 4 rangos guardan la edad típica del rango: 21, 25, 31 y 38. Se elige con preferencia un personaje cuya ropa y peinado ya encajen, y el aspecto final pasa por `applyAge`.
- **Chat.**
  - Cada personaje se ve con su edad.
  - Si el retrato del catálogo no encaja (por ejemplo, un personaje listo con otra edad), la foto de perfil se saca de su propio 3D la primera vez y se guarda.
- **Forma de hablar.** El prompt del personaje incluye una línea según el rango (`supabase/functions/_shared/systemPrompts.tsx`). La voz automática del servidor sigue los mismos rangos (`pickVoice`).
- **Catálogo.** `npm run qa:check` falla si algún personaje no encaja con su edad declarada. Para cumplirlo se cambiaron dos voces: Vera (28), de Sarah a Matilda, y Vita (27), de Matilda a Alice.

Captura de aceptación: `docs/wp10/edades.png` (Nyx, Sol, Vera y Kai en los 4 rangos).
