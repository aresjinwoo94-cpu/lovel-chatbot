# WP-13 · Lote 1 (6 personajes, ocultos hasta validar)

Seis personajes de la propuesta: 3 mujeres y 3 hombres de 18 a 34 años, uno por tropo clave de
la investigación. Ya están en el catálogo (`PRESETS`), pero **no en `SHOWCASE`**: la bienvenida y
Explorar siguen mostrando solo Nyx, Irene, Ren y Dante.

| Personaje | Edad | Para ti | Tropo | Escenas |
|---|---|---|---|---|
| Lucía | 20 | Tu nueva compañera de piso | Convivencia | `lucia-move`, `lucia-exam` |
| Carla | 26 | Compañera de mesa en la oficina | Falso noviazgo | `carla-favor`, `carla-wedding` |
| Paula | 28 | Florista de enfrente, empezando de cero tras divorciarse | Segunda oportunidad | `paula-shop`, `paula-tulips` |
| Hugo | 20 | Tu rival por la beca | Rivales a amantes | `hugo-grades`, `hugo-truce` |
| Gael | 24 | Tu mejor amigo del grupo | Amigos a amantes | `gael-walk`, `gael-app` |
| Bruno | 26 | El hermano mayor de tu mejor amiga | Prohibido suave | `bruno-cake`, `bruno-rain` |

## Cambios respecto a la propuesta

- **Paula pasa de 34 a 28.** Las caras apenas envejecen y con 34 no aparentaba la edad; esa limitación queda para después de validar.
- **Ningún peinado prestado en el cuerpo Minimal.** El cuerpo `aria` (VRM 1) no acepta peinados de otros modelos: se rompía la cabeza. El creador ya lo impedía; ahora `makeLook` también.
- **Gael lleva su propio peinado.** No existe `fumiriya.hair.vrm`.
- **Hombres que se parecen entre sí.** Con solo 2 cuerpos masculinos, se distinguen por color, ropa y fondo (revisado).

## QA

- **Visual (WP-5 y WP-10):** `docs/qa/<id>.png` y `npm run qa:check` (18 personajes al día). Un subagente independiente hizo 3 rondas:
  1. falló Lucía (cuerpo `aria`);
  2. falló Paula (edad), y Bruno salía con chaleco tipo uniforme en blanco;
  3. después de ajustar el aspecto (y el fondo de Bruno, revisado aparte), todos aprobados.
- **Tono:** forma de ser y escenas sin reproches ni control: Gael no quita el móvil, Bruno no insiste.
- **Pendiente:**
  - la **prueba de claridad de WP-7** (primer mensaje real de cada escena, leído por un subagente);
  - **desplegar** las escenas y personalidades nuevas a las Edge Functions.

  Las dos cosas necesitan renovar el `SUPABASE_ACCESS_TOKEN` del entorno (hoy responde 401).
