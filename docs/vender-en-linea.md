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
