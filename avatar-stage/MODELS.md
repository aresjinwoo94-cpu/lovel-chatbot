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
