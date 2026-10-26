# WP-11 · Platino

Platino es la moneda de Lovel House. El saldo y los descuentos los hace siempre el servidor
(`supabase/migrations/0012_platino.sql`, funciones `platino_*`). La app solo muestra el saldo.

## Reglas (opción B, aprobada)

| Concepto | Valor |
|---|---|
| Mensaje de texto | 1 Platino |
| Nota de voz (transcripción + respuesta + voz) | 8 Platino |
| Invitado | 15 Platino, una sola vez |
| Cuenta gratis | 40 Platino al día. Se renueva a medianoche (hora local) y no se acumula |
| Pro, $9.90 USD/mes | 1.500 Platino al mes, más los 40 diarios |
| Paquete de prueba | 400 Platino por $1.99 USD (no caduca) |
| Paquete mediano | 1.200 Platino por $4.99 USD (no caduca) |
| Orden de gasto | diario → Pro del mes → de prueba → comprado |
| Modelo de IA | Pro: Gemini 3.5 Flash-Lite. Gratis e invitados: Gemini 3.1 Flash-Lite (ver nota) |
| Voz | ElevenLabs Flash v2.5 |

**Nota sobre el modelo gratis.** La calibración B usaba Gemini 2.5 Flash-Lite. Google ya no lo
ofrece a cuentas nuevas: devuelve 404 ("no longer available to new users"). Por eso el plan gratis
usa 3.1 Flash-Lite, el modelo más barato disponible, con 3.5 Flash-Lite de respaldo si está
saturado. Los precios en Platino no cambian. Solo sube el costo para nosotros (ver la tabla).
Se puede cambiar sin desplegar con el secreto `GEMINI_MODEL_FREE`.

## Costos reales por Platino

Precios del proveedor (USD):
- Gemini 3.5 Flash-Lite: $0.30 / $2.50 por millón de tokens.
- Gemini 3.1 Flash-Lite: $0.25 / $1.50 por millón de tokens.
- ElevenLabs Flash: $0.04 por 1.000 caracteres.
- Scribe: $0.22 por hora.

Consumo medido en producción (registro `ai_usage`):
- Prompt: 1.600–2.900 tokens. Crece con la conversación, hasta el límite de historial.
- Respuesta: unos 60 tokens.
- Sin razonamiento y sin caché implícita.

| | Gratis (3.1 FL) | Pro (3.5 FL) |
|---|---|---|
| Mensaje de texto (peor caso, 2.900 tokens) | $0.00082 | $0.00102 |
| Nota de voz (10 s de Scribe + LLM + unos 150 caracteres de voz) | ≈ $0.0074 (8 Platino → $0.00093 c/u) | ≈ $0.0077 |
| **Costo por Platino** (peor caso) | **≈ $0.00093** | **≈ $0.0011** |

| Plan | Platino/mes máx. | Costo máx. | Ingreso neto (tras Stripe 2,9 % + $0.30) | Costo / ingreso |
|---|---|---|---|---|
| Invitado | 15 (una vez) | $0.014 | – | – |
| Gratis | 1.200 | ≈ $1.12 | – | – |
| Pro | 1.500 + 1.200 | ≈ $2.97 | $9.31 | ≈ 32 % (≤ 40 %) |
| Paquete 400 (usuario gratis) | 400 | ≈ $0.37 | $1.63 | ≈ 23 % |
| Paquete 1.200 (usuario gratis) | 1.200 | ≈ $1.12 | $4.55 | ≈ 25 % |

Estos son los peores casos: todo el saldo gastado, conversaciones largas y notas de voz. Un usuario
típico gasta mucho menos. Con 2.5 Flash-Lite, el máximo del plan gratis era de unos $0.48/mes. Con
3.1 Flash-Lite es de unos $1.12/mes. Pro y los paquetes siguen dentro del presupuesto.

## Garantías

- **Gasto atómico.** `platino_spend` bloquea la fila del perfil, renueva el diario si cambió el día,
  descuenta en orden y escribe una fila en `platino_ledger`. Si falla la IA o la voz,
  `platino_refund` devuelve exactamente lo descontado, una sola vez.
- **Saldo insuficiente.** El servidor responde 402 `PLATINO_EMPTY` con el saldo y el costo. La app
  muestra la hoja amable, nunca a mitad de una respuesta. Los invitados reciben 403
  `NEEDS_ACCOUNT`, que invita a crear una cuenta.
- **Stripe idempotente.** Cada crédito lleva una referencia única en el ledger:
  - Paquetes: `stripe:checkout:{session}`.
  - Suscripción: `stripe:sub:{id}:{fin de periodo}`.
  
  Un webhook repetido no acredita dos veces. Las renovaciones reponen 1.500, sin acumular.
- **Preparado para las tiendas.** `platino_credit` y `platino_set_sub` reciben `source`, así que
  pueden llamarlos los webhooks de App Store y Google Play.

### Eventos de Stripe que debe tener el webhook

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

`checkout.session.async_payment_succeeded` es opcional (pagos diferidos).

## Interfaz

- **Chat.** El saldo aparece bajo el campo de texto, con la gema propia y los costos. Al tocarlo se
  abre el desglose por tipo.
- **Sin Platino.** Aparece una hoja amable con:
  - Cuándo vuelve el diario.
  - Los paquetes con su precio real.
  - Pro y la opción "Esperar a mañana".
- **Falta para una nota de voz.** El aviso dice cuántos Platino faltan.
- **Planes y Platino (`/pro`).** Muestra Gratis, Pro y los paquetes, con los enlaces legales junto
  al pago.
- **Perfil y barra lateral.** Muestran el saldo y el diario usado.
- **Errores sin detalles técnicos:**
  - Sin conexión: "inténtalo cuando vuelvas a tener señal; no se ha gastado Platino".
  - Pago que no abre: "no se te ha cobrado nada".

Capturas (390 y 1440 px, claro y oscuro): `docs/wp11/*.jpg`.

## Revisión independiente

Dos rondas con un subagente que no hizo los cambios. La segunda ronda no encontró nada
bloqueante, y los dos puntos importantes que quedaban ya están corregidos:
- La nota de voz sin voz se cobra como mensaje.
- Con un pago pendiente aparece "Administrar suscripción".

Pendiente (no bloquea):
- Quitar el Platino comprado ante reembolsos y disputas de Stripe (`charge.refunded`,
  `charge.dispute.created`).
- Limitar los 15 Platino de invitado por dispositivo.
- Traducir al inglés los errores 4xx del servidor.
