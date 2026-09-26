# Vender en línea

Cómo se enciende la tienda de un cliente, cómo cobra y cómo se administran sus pedidos.

## La tienda es opcional

Un cliente sin fila en `store_settings`, o con `isEnabled: false`, **no tiene tienda**: las
rutas públicas de `/api/store` responden 404 y el sitio no muestra nada relacionado. No hay
un estado intermedio.

```bash
curl -X PATCH "$API/api/admin/tenants/$TENANT/store/settings" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"isEnabled": true}'
```

## Precios e impuesto

Todo el dinero viaja en **enteros de pesos**: `29990` es $29.990. Nunca decimales.

Con `taxIncluded: true` (lo normal en Chile) los precios ya traen IVA y `taxCents` solo
informa cuánto de ese total es impuesto. Con `taxIncluded: false` el impuesto se suma al
final. La tasa vive en `taxRatePercent` (19 por defecto).

## Formas de envío

```json
{
  "shippingOptions": [
    {
      "code": "despacho",
      "name": "Despacho en Santiago",
      "priceCents": 3990,
      "estimate": "24 horas",
      "requiresAddress": true
    },
    {
      "code": "retiro",
      "name": "Retiro en local",
      "priceCents": 0,
      "requiresAddress": false
    }
  ],
  "freeShippingThresholdCents": 30000
}
```

El envío gratis se decide sobre lo que la persona **realmente paga** por los productos: un
cupón que baje el subtotal debajo del umbral vuelve a cobrar el despacho.

Un pedido con `delivery.method: "shipping"` sobre una forma de envío con `requiresAddress`
no se acepta sin dirección.

## Cobro

| `paymentProvider` | Qué pasa                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`            | La tienda solo toma pedidos (WhatsApp, etapa 1). No hay checkout con pago.                                                                                                      |
| `transfer`        | El checkout devuelve los datos bancarios del cliente. El pedido queda pendiente hasta que la persona dueña lo marca pagado desde el panel.                                      |
| `flow`            | Redirige a Flow con la cuenta del propio cliente. Flow avisa a `/api/store/payment-callback` y la API **vuelve a preguntarle a Flow** el estado antes de dar el pago por bueno. |

`paymentCredentials` guarda la cuenta de cobro **del cliente**, no de la agencia. Nunca sale
de la API: las respuestas solo dicen `hasPaymentCredentials: true|false`.

Para Flow: `{ "apiKey": "...", "secretKey": "...", "mode": "sandbox" }`. Con
`mode: "production"` se usa `https://www.flow.cl/api`; con cualquier otro valor, el sandbox.

### Pago simulado en las demos de prospecto

En un sitio en estado `demo` el checkout **ignora** el `paymentProvider` configurado y usa un
medio de demostración: el pedido se crea con `paymentProvider: "demo"`, queda `paid` al
instante (referencia `demo-<número>`) y la respuesta trae como `redirectUrl` la misma URL de
retorno que usaría un pago real, para que el sitio muestre su confirmación normal. Nunca se
llama a Flow, no se muestran datos bancarios, no se descuenta stock ni se gasta el cupón y no
sale ningún correo; el aviso del proveedor responde `{ "confirmed": false }` sin consultar a
nadie. `demo` no es un valor que se pueda configurar en la tienda. La tienda de una demo se
puede encender sin los datos del vendedor. Ver [Demos](demos.md).

## Comprar

```bash
# Cotizar: los precios salen SIEMPRE de la base, nunca del cuerpo de la petición.
curl -X POST "$SITE/api/store/quote" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":1,"quantity":2}],"shippingCode":"despacho","couponCode":"VERANO"}'

# Comprar
curl -X POST "$SITE/api/store/checkout" -H 'Content-Type: application/json' \
  -d '{"items":[...],"shippingCode":"despacho",
       "customer":{"name":"Ana","email":"ana@ejemplo.cl","phone":"+56911111111"},
       "delivery":{"method":"shipping","addressLine":"Av. Siempre Viva 742"}}'
```

Un cupón que no sirve **no rompe la cotización**: se informa el motivo en `couponRejection` y
se cobra sin descuento, para que quien compra pueda seguir.

## Términos y condiciones de compra

Genera la página desde la plantilla (`POST .../legal-pages` con `{"kind":"compra"}`, o
`add_legal_page` en el MCP). Trae precios con IVA, despacho, derecho a retracto, garantía
legal y devoluciones según la Ley 19.496, y **nace despublicada**: revísala antes de
publicarla, porque plazos y excepciones dependen de lo que vende cada tienda.

Después apunta la tienda a esa página:

```bash
curl -X PATCH "$API/api/admin/tenants/$TENANT/store/settings" -d '{"termsPageSlug":"terminos-de-compra"}' ...
```

Mientras la página esté **publicada**, comprar exige `"acceptedTerms": true` (la API lo
valida, no solo el sitio) y el pedido guarda `termsAcceptedAt` y `termsVersion`, que es la
fecha de publicación de la versión aceptada: con el historial de la página se puede ver el
texto exacto. Si la página no está publicada no se exige, porque no se puede pedir aceptar
algo que el comprador no puede leer.

## Compras repetidas (idempotencia)

`POST /api/store/checkout` acepta el header `Idempotency-Key`. La misma clave con la misma
compra devuelve el mismo pedido sin crear otro (`Idempotent-Replayed: true`); con otra
compra responde 422; dos peticiones simultáneas con la misma clave crean un solo pedido y
la segunda recibe 409 con `Retry-After`. Una compra que falla suelta la clave para poder
corregir y reintentar. Las claves son por cliente y vencen a las 24 horas.

El sitio genera una clave por compra y la reutiliza en dobles clics y reintentos.

## Stock

`stock: null` en un producto significa "no se controla". `0` significa agotado: el producto
se muestra como agotado (`isSoldOut`) y el carrito lo rechaza. Comprar más unidades de las
que quedan también se rechaza, con el número exacto en el mensaje.

El stock se descuenta **al confirmar el pago**, no al crear el pedido: un carrito abandonado
no puede dejar sin stock a quien sí va a comprar. Cancelar un pedido ya pagado lo devuelve.

## Pedidos

Estados: `pending → paid → preparing → shipped → delivered`, y `cancelled` en cualquier
momento antes de entregar. Un pedido no retrocede, y entregado o cancelado ya no cambia.

Marcarlo `paid` a mano (el caso de la transferencia) hace lo mismo que el aviso del
proveedor: descuenta stock, gasta el cupón y manda los correos al comprador y a la dueña.

```bash
curl "$API/api/admin/tenants/$TENANT/store/orders?status=pending" -H "Authorization: Bearer $TOKEN"
curl -X PATCH "$API/api/admin/tenants/$TENANT/store/orders/$ORDER/status" \
  -H "Authorization: Bearer $TOKEN" -d '{"status":"paid"}'
curl "$API/api/admin/tenants/$TENANT/store/report?from=2026-01-01" -H "Authorization: Bearer $TOKEN"
```

El reporte cuenta solo pedidos pagados y no cancelados: ventas por día, promedio y los diez
productos más vendidos.

## Desde el MCP

`get_store_settings`, `update_store_settings`, `list_orders`, `update_order_status`,
`sales_report`, `list_coupons`, `create_coupon` y `delete_coupon` (esta última exige
`confirm: true`).

## Aislamiento entre clientes

Cada pedido, cupón y configuración está scoped por `tenantId` en la consulta, no solo en la
ruta: pedirle a `/api/admin/tenants/44/store/orders/7` un pedido del cliente 40 responde 404,
no el pedido de otro.
