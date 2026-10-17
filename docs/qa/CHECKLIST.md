# QA visual de personajes — lista de revisión

Cada hoja (`docs/qa/<id>.png`) muestra un personaje del catálogo con el escenario 3D real:
6 expresiones (neutral, feliz, triste, sorprendida, tímida, enojada), 5 vocales al hablar
(aa, ih, ou, ee, oh), dos mezclas de emoción + habla, busto, busto feliz hablando y cuerpo.

La revisa **alguien que no haya creado ni cambiado el personaje** (en este proyecto, un
subagente independiente). Marca un fallo si ves cualquiera de estas cosas:

1. **Accesorios** (gafas, monóculo, parche, orejas, cuernos, diademas, lazos, auriculares)
   que atraviesan el pelo, la cara o las orejas, o que flotan separados de la cabeza.
2. **Bocas**: deformes o torcidas, dientes o lengua demasiado visibles fuera de las vocales,
   labios que se cruzan, mueca con dientes cuando debería ser una sonrisa.
3. **Ojos**: que se cierran mal (a medias o asimétricos sin motivo), que atraviesan el
   flequillo o desaparecen.
4. **Pelo** que atraviesa la cara, la ropa o el cuerpo de forma visible.
5. **Ropa** que se lea como uniforme escolar (falda plisada con chaleco o corbata, etc.):
   todos los personajes son adultos (regla de WP-1).
6. Cualquier otra cosa que rompa la ilusión: piel o pelo con colores rotos, partes del
   modelo que faltan, encuadre que corta la cabeza.

Cuando una hoja no tiene fallos, el personaje se marca `"status": "approved"` en
`docs/qa/manifest.json`. `node scripts/qa-characters.mjs --check` falla si algún personaje
del catálogo o el motor (`avatar-stage/stage.html`) cambió desde la última QA aprobada.

## Qué NO detecta este proceso

- Fallos que solo aparecen en movimiento (por ejemplo, el pelo que atraviesa los hombros
  al girar la cabeza, o un parpadeo a mitad de una vocal): las hojas son fotos fijas.
- Combinaciones que la persona crea en "Personalizar" fuera del catálogo: para esas valen
  las reglas del motor (topes de expresión, gafas sobre el flequillo, compatibilidades),
  no una revisión una a una.
- Modelos `.vrm` importados por la persona.
