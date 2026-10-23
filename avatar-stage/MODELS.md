# Modelos 3D (VRM) y licencias

Los personajes de Lovel House son modelos **VRM** (el formato abierto que usan
los VTubers) renderizados en vivo con [three.js](https://threejs.org) +
[@pixiv/three-vrm](https://github.com/pixiv/three-vrm) dentro de `stage.html`.

Todos los modelos base permiten **uso comercial por empresas, modificación y
redistribución**, sin obligación de crédito. Aun así los acreditamos aquí.

| id en el catálogo | Modelo original | Autor | Formato | Licencia |
| --- | --- | --- | --- | --- |
| `bibi` | ビビ (Bibi) | VRoid Project (pixiv) | VRM 0 | VRoid Hub: uso comercial corporativo, modificación y redistribución permitidos, crédito no necesario |
| `shino` | 千駄ヶ谷篠 (Sendagaya Shino) | VRoid Project | VRM 0 | VRoid Hub (mismas condiciones) — publicado en OpenGameArt |
| `shibu` | Sendagaya Shibu | VRoid Project | VRM 0 | CC0 |
| `noir` | AvatarSample_D | VRoid Project | VRM 0 | CC0 — OpenGameArt |
| `victoria` | ヴィクトリア・ルービン (Victoria Rubin) | VRoid Project | VRM 0 | VRoid Hub (mismas condiciones) |
| `vita` | ヴィータ (Vita) | VRoid Project | VRM 0 | VRoid Hub (mismas condiciones) |
| `hair_f` | HairSample_Female | VRoid Project | VRM 0 | CC0 — OpenGameArt |
| `hair_m` | HairSample_Male | VRoid Project | VRM 0 | CC0 — OpenGameArt |
| `base_f` | Base_Female | VRoid Project | VRM 0 | CC0 — OpenGameArt |
| `base_m` | Base_Male | VRoid Project | VRM 0 | CC0 — OpenGameArt |
| `fumiriya` | 桜田 史利矢 (Sakurada Fumiriya) | VRoid Project | VRM 0 | VRoid Hub (mismas condiciones) — OpenGameArt |
| `mei` | three-vrm-girl | pixiv Inc. | VRM 0 | VRoid Hub (mismas condiciones) — repo pixiv/three-vrm (MIT) |
| `sample_b` | AvatarSample_B | VRoid Project / pixiv Inc. | VRM 1 | VRM Public License 1.0 (`commercialUsage: corporation`, `allowModificationRedistribution`) |
| `aria` | VRM1_Constraint_Twist_Sample | pixiv Inc. | VRM 1 | VRM Public License 1.0 (`commercialUsage: corporation`, `allowModificationRedistribution`) |

Condiciones VRoid Hub de los modelos marcados "mismas condiciones":
`corporate_commercial_use=allow, modification=allow, redistribution=allow, credit=unnecessary`.

## Dónde viven

- Archivos `.vrm` optimizados (texturas re-codificadas para móvil, ~6 MB c/u):
  bucket público de Supabase Storage `vrm-models`.
- Modelos importados por las personas (VRoid Studio → `.vrm`): bucket
  `vrm-custom`, carpeta por usuario. La persona es responsable de la licencia
  de lo que importa.
- Retratos estáticos (listas, burbujas, explorar): `assets/characters/**`,
  generados desde el propio 3D con `node scripts/render-characters.mjs`.

## Personalización

El aspecto (`CharacterLook` v3) se aplica sobre el modelo en tiempo real:
peinado (intercambio de pelo entre modelos VRM 0) con puntas en degradado
(shader), colores de pelo / ojos / piel y de cada prenda (recoloreado por
luminancia), maquillaje y marcas pintados sobre la textura de la cara (todos
los rostros de VRoid comparten mapa UV), 11 expresiones, 6 poses, cabeza
(inclinación, giro, tamaño), 19 accesorios 3D, 16 fondos, 7 luces y 6 efectos
de partículas. Ningún personaje, asset ni paleta procede
de juegos comerciales.

## Regenerar el escenario

`stage.html` se empaqueta como cadena en `src/lib/avatarStageHtml.ts`:

```bash
node scripts/build-stage.mjs
```

## Añadir al catálogo un modelo propio hecho en VRoid Studio

Para sumar un personaje con un modelo hecho por ti (no confundir con "Importar .vrm" de la
app, que solo lo usa la persona que lo sube y no pasa por QA):

1. **Exportar desde VRoid Studio** (Exportar → Exportar como VRM):
   - Formato **VRM 0.0** si quieres que su peinado pueda prestarse a otros cuerpos y que admita
     peinados de otros (los VRM 1.0 funcionan, pero sin intercambio de pelo).
   - Reducción de polígonos y "Atlas de texturas" a 2048 px como máximo: el archivo debería
     quedar por debajo de ~10 MB (el móvil lo descarga entero).
   - En los metadatos de licencia: uso comercial permitido y modificación permitida. Si el
     modelo usa piezas de terceros (ropa, pelo de Booth…), comprueba que su licencia también lo
     permite y apúntalo en la tabla de arriba.
   - No renombres los materiales: el escenario reconoce cada parte por los nombres que pone
     VRoid (`HAIR` → pelo, `EYEIRIS` → iris, `FACE_00_SKIN` → cara, `TOPS` / `BOTTOMS` /
     `SHOES` → prendas recoloreables; ver `category()` en `stage.html`).
2. **Optimizarlo y subirlo** a Supabase Storage, bucket público `vrm-models`:
   - `npm i --no-save sharp && node scripts/optimize-vrm.cjs aurora.vrm out/aurora.vrm`
     re-codifica las texturas (JPEG si no tienen transparencia, PNG con paleta si la tienen;
     sin tocar la geometría ni las extensiones VRM). Suele ahorrar un 20–30 %.
   - Si su peinado se va a prestar a otros cuerpos: `node scripts/make-hair-vrm.cjs
     out/aurora.vrm out/aurora.hair.vrm` (solo esqueleto, física, pelo y cara sin expresiones;
     ~2 MB en vez de ~5). El escenario carga `<bucket>/<id>.hair.vrm` para los peinados prestados.
   - Sube `<id>.vrm` (y `<id>.hair.vrm`) con la cabecera `cache-control: max-age=604800`
     (id corto en minúsculas, p. ej. `aurora.vrm`). Antes de reemplazar un modelo, guarda una
     copia en `_backup-<fecha>/` del mismo bucket.
3. **Registrarlo** en `src/lib/character/catalog.ts`:
   - en `MODELS`: `{ id: 'aurora', gender: 'female', label: { es: '…', en: '…' }, hairDonor: true }`
     (`vrm1: true` si es VRM 1.0; `alwaysPlain: true` si su ropa no admite recolorear prendas);
   - si su peinado se ofrece en "Peinado", añádelo también a `HAIRSTYLES`;
   - si es un personaje listo, su entrada en `PRESETS` (nombre, edad adulta, frase, rasgos y
     `makeLook({ model: 'aurora', … })`), su forma de ser en `PERSONAS` y sus escenas en
     `CHARACTER_SCENARIOS` (`supabase/functions/_shared/roleplay.ts`).
   - Si al probarlo el pelo prestado no encaja (cejas que asoman, huecos), añade el cruce a
     `BODY_HAIR_CONFLICTS` / `HAIR_ACCESSORY_CONFLICTS`; si el modelo sonríe con los dientes,
     dale un tope en `MODEL_FACE_CAP` (`stage.html`).
4. **Pasar la QA** (obligatorio, ver `docs/qa/CHECKLIST.md`): `npm run qa:characters` con
   `ONLY=<id>`, revisión de la hoja por un subagente, `"status": "approved"` en
   `docs/qa/manifest.json` y `npm run qa:check` en verde.
5. **Generar los retratos**: `node scripts/render-characters.mjs` (mismas variables de
   entorno que la QA) y añadir las imágenes nuevas a `src/lib/character/media.ts`
   (`MODEL_PORTRAITS`, y `PRESET_PORTRAITS` / `PRESET_FACES` si es un personaje listo).
6. Si cambiaste las Edge Functions (personas o escenas), despliega `start-chat`, `chat` y
   `voice-chat`.
