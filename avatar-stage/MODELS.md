# Modelos VRM base de Lovel House

Los avatares de Lovel House son modelos **VRM**, el formato abierto que usan los VTubers
(se crean, por ejemplo, con VRoid Studio). La app incluye cuatro modelos base oficiales de
pixiv / VRoid, publicados en el repositorio de [three-vrm](https://github.com/pixiv/three-vrm)
con licencias que permiten uso comercial, modificación y redistribución:

| Archivo | Modelo original | Autor | Licencia (según los metadatos del propio VRM) |
| --- | --- | --- | --- |
| `shibu.vrm` | Sendagaya Shibu | VRoid (pixiv) | CC0 |
| `shino.vrm` | Sendagaya Shino | VRoid (pixiv) | VRoid Hub: uso por cualquiera, comercial permitido, modificación y redistribución permitidas, sin crédito obligatorio |
| `mei.vrm` | three-vrm-girl | pixiv Inc. | VRoid Hub: igual que el anterior |
| `aria.vrm` | VRM1_Constraint_Twist_Sample | pixiv Inc. | VRM Public License 1.0: avatar para todos, uso comercial corporativo, modificación y redistribución permitidas |

Están subidos al bucket público `vrm-models` de Supabase. Para volver a subirlos:

```bash
# con la service role key del proyecto
for f in avatar-stage/models/*.vrm; do
  curl -X POST -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "x-upsert: true" \
    -H "cache-control: max-age=31536000" -H "content-type: application/octet-stream" \
    --data-binary @$f "$SUPABASE_URL/storage/v1/object/vrm-models/$(basename $f)"
done
```

Los usuarios Pro pueden subir su propio VRM (exportado desde VRoid Studio, gratis), que se
guarda en el bucket `vrm-custom` dentro de su carpeta.
