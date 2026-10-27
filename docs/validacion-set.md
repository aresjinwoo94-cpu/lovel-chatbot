# Set de validación (WP-13 en pausa)

Antes de construir más personajes, se valida con gente real con un set reducido: **Nyx, Irene, Ren y Dante**.

Criterios de elección:
- Son los más limpios en el QA visual (`docs/qa/*.png`) y tienen siluetas muy distintas.
- Hay 2 mujeres y 2 hombres, así que "Con una mujer" y "Con un hombre" siguen teniendo dónde elegir.
- Cubren lo que la investigación señala (`docs/investigacion-personajes.md`):
  - Nyx: misterio y *slow burn*;
  - Irene: estatus alto sin toxicidad;
  - Ren: cotidiano y cálido;
  - Dante: protector.

Qué cambia en la app:
- La bienvenida y Explorar solo muestran `SHOWCASE` (`src/lib/character/catalog.ts`).
- Con 6 personajes o menos, Explorar no muestra la búsqueda ni los filtros.
- Los demás siguen en `PRESETS`: nadie pierde su personaje.

Tono (todo el catálogo):
- **Aperturas:** regla nueva: nunca reprochar que la persona llegue tarde o no viniera.
- **Nyx:** la apertura de la librería pasa de "molesta, ¿de dónde lo has sacado?" a curiosa y cálida. Su forma de ser pasa de "pone a prueba a la gente" a irónica pero acogedora.
- **Dante:**
  - en la pista ya no agarra del brazo; avisa sin tocar;
  - habla coloquial, sin palabrotas (antes salió "pasan folladas").
- **Saludos:** el saludo por defecto y la muestra de voz ya no dicen "por fin llegas".

Pendiente hasta validar: más personajes, modelos de hombre, caras de 35+, la sudadera de Kai, las notas de voz de invitado y la vista previa oculta en los avisos.
