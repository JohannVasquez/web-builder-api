# Demos

En la plataforma hay **dos cosas distintas** que se llaman "demo". No se mezclan ni en el
código ni en la operación:

|                   | Sitios de demostración (#104)                       | Demos de prospecto                                                                          |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Qué son           | Tres sitios **inventados** para mostrar capacidades | El sitio **privado** de un negocio real que todavía no compró                               |
| Quién los ve      | Cualquiera: son públicos                            | Solo quien trae su enlace; el resto recibe 404                                              |
| Estado del tenant | `active`                                            | `demo`                                                                                      |
| Dónde viven       | `prisma/seeders/demo-templates.ts` (siembra)        | Módulo `src/modules/Demo`, tablas `prospects`, `demos`, `demo_access_tokens`, `demo_visits` |
| Cómo nacen        | `pnpm tsx prisma/seed.ts`                           | `POST /api/admin/demos`                                                                     |
| Buscadores        | Se indexan como cualquier sitio                     | Nunca: `noindex`, fuera del sitemap                                                         |

Que el slug de un sitio empiece con `demo-` **no** lo convierte en demo de prospecto (los
sitios de demostración se llaman `demo-pasteleria`, `demo-construccion` y `demo-spa`). Lo
único que cuenta es `Tenant.status === 'demo'`.

## Sitios de demostración

Tres sitios con contenido ficticio pero realista de negocios chilenos, uno por estilo visual
(`classic`, `minimal` y `neo-brutalism`), para que un prospecto vea cómo se vería su página.

### Cómo se siembran

```bash
pnpm tsx prisma/seed.ts
```

La siembra es **idempotente**: se puede repetir para restaurar su contenido original sin
duplicar páginas ni configuraciones.

### Cómo se usan para vender

1. **Mostrar capacidades:** diseño, navegación y velocidad de un sitio final.
2. **Crear clientes rápido:** al cerrar una venta se puede crear el cliente copiando uno de
   ellos (`duplicateFromTenantId`). La copia nace **sin publicar**.

### Qué queda pendiente

1. **Despliegue y URLs definitivas** (depende de #98): publicarlos en dominios accesibles para
   mandarlos por WhatsApp.
2. **Imágenes reales:** nacen sin fotos porque falta un bucket real; los bloques se ven bien
   sin ellas mientras tanto.

## Demos de prospecto

Para la venta en frío: se arma el sitio de un negocio con buenas reseñas y sin sitio (o con uno
malo), y se lo llama con la página lista. El sitio es un tenant normal en estado `demo`, así
que al vender se convierte en cliente sin copiar nada (etapa 3).

### Crear una demo

`POST /api/admin/demos` (agencia o clave con permiso `write` y sin alcance limitado):

```json
{
  "slug": "pasteleria-luna",
  "name": "Pastelería Luna",
  "templateId": "pasteleria",
  "prospect": {
    "businessName": "Pastelería Luna",
    "contactName": "Luna Pérez",
    "phone": "+56 9 1234 5678",
    "email": "luna@ejemplo.cl",
    "industry": "pastelería",
    "source": "Google Maps",
    "notes": "4,8 estrellas, sin sitio"
  }
}
```

- Origen igual que un cliente: `templateId` (kit), `duplicateFromTenantId` (copia) o ninguno
  (vacía). Para una segunda propuesta al mismo negocio se manda `prospectId` en vez de
  `prospect`: cada propuesta es otro tenant con otra dirección.
- El tenant nace con slug `demo-<slug>`, estado `demo` y **una sola dirección**,
  `demo-<slug>.<PLATFORM_DOMAIN>`, verificada y principal.
- Todas las páginas nacen **publicadas**, también al duplicar: el prospecto solo ve lo
  publicado.
- Vence a los 14 días (`DEMO_DURATION_DAYS`); ver [Ciclo de vida](#ciclo-de-vida).
- Sitio, ficha, demo y enlaces se escriben en una sola transacción.
- Si la dirección está ocupada responde `409` con el siguiente slug libre:
  `{ "error": "Conflict", "message": "...", "suggestedSlug": "pasteleria-luna-2" }`.
- La respuesta trae `demo`, `prospect` y **los dos enlaces en claro, una única vez**. Ninguna
  otra respuesta los vuelve a mostrar; la base guarda su SHA-256.

### Los dos enlaces

|                  | Enlace de prospecto                                             | Enlace de equipo                             |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------- |
| Para quién       | El prospecto (se manda por WhatsApp)                            | Owner y editores de la agencia               |
| Vale mientras    | La demo esté **vigente** (no vencida, descartada ni convertida) | La demo exista, también vencida o descartada |
| Registra visitas | Sí                                                              | Nunca                                        |

- Token: `demo_` + 32 bytes aleatorios en hex (256 bits). Prefijo propio para no confundirlo
  con un enlace de revisión (`prev_`).
- URL entregada: `https://demo-<slug>.<PLATFORM_DOMAIN>/demo/<token>`. La webapp la canjea
  (DEMO W1): guarda el token y lo manda en el header `X-Demo-Token` en cada llamada a la API.
- En desarrollo, si la dirección es `localhost` o termina en `.localhost`, la URL va con
  `http://` y **sin puerto** (el puerto lo pone quien arma el entorno local o Caddy).
- `POST /api/admin/demos/:demoId/prospect-link` y `.../team-link` regeneran uno: el anterior
  deja de funcionar en la petición siguiente y el nuevo se devuelve en claro una vez.

### Qué hace la guarda

Va pegada al resolver de tenant en **todas** las rutas públicas scoped por tenant, antes de
`siteAvailability` (una prueba de `src/app.spec.ts` falla si una ruta nueva se la salta). Para
un tenant que no es demo no hace nada.

En un tenant `demo`:

- Sin `X-Demo-Token`, con un token inexistente, anulado, de otra demo, o de prospecto con la
  demo vencida o descartada: **404** con el mismo cuerpo que un recurso inexistente,
  `{ "error": "NotFound", "message": "No encontramos lo que buscas." }`. Sin 403, sin código
  propio y sin el nombre del negocio.
- Con token válido: se sirve el sitio **publicado** (aunque llegue también un
  `X-Preview-Token`) y la respuesta lleva `X-Demo: true`.
- Toda respuesta, con o sin acceso: `X-Robots-Tag: noindex, nofollow` y
  `Cache-Control: private, no-store`.
- Las páginas salen con `noindex: true` y `GET /api/pages` (lo que alimenta el sitemap)
  responde `{ "pages": [] }` aunque haya acceso. La webapp no debería generar sitemap ni RSS
  cuando ve `X-Demo: true`.
- `siteAvailability` deja pasar la demo solo si la guarda validó el enlace; si alguna ruta
  llegara sin pasar por la guarda, responde el mismo 404 y nunca el 503 de mantención (que
  diría el nombre del negocio).

Para la webapp: **toda** llamada a la API de una demo necesita el header, también
`/api/media/...`. Una imagen pedida directamente por el navegador (`<img src>`) no lo lleva,
así que esas llamadas tienen que pasar por el servidor de Next o por un proxy que lo agregue.

### Una demo no le escribe ni le cobra a nadie

Con cualquiera de los dos enlaces, cada acción pública responde como si hubiera funcionado:

| Acción               | En una demo                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Contacto             | Se guarda con la constancia `No enviado (Demo)`; no sale correo                                             |
| Newsletter           | Responde éxito; no se guarda el suscriptor ni su consentimiento                                             |
| Solicitudes de datos | Responde lo mismo; no se guarda ni se manda la verificación. Confirmar un token desde una demo no hace nada |
| Retractos y reclamos | Se registran; no se avisa a nadie                                                                           |
| Aviso de cookies     | Responde el consentimiento con la misma forma, sin registrarlo                                              |
| Tienda               | Pago simulado (ver abajo)                                                                                   |

El mecanismo es único: la guarda marca la petición y cada acción pregunta
`isDemoRequest(res)` (`src/shared/presentation/demoRequest.ts`). `src/container.spec.ts` lee el
cableado y falla si un controller público que puede mandar correos no lo considera.

**Pago simulado.** En una demo el checkout ignora el medio configurado (aunque sea Flow con
credenciales): el pedido se crea con `paymentProvider = "demo"`, queda `paid` al instante con
referencia `demo-<número>`, y la respuesta trae como `redirectUrl` la misma URL de retorno que
usaría un pago real (`/tienda/gracias` del propio dominio, o el `returnUrl` pedido). No se
descuenta stock ni se gasta el cupón, no sale ningún correo, y el aviso del proveedor
(`/api/store/payment-callback`) no consulta a nadie. La tienda de una demo se puede encender
sin los datos del vendedor (sí exige la página de términos publicada, como cualquiera).

### Visitas

Cada `GET /api/pages/:slug` servido con el **enlace de prospecto** deja una visita: página,
fecha y hora, huella de la IP (misma sal y criterio que el consentimiento, `CONSENT_IP_SALT`;
sin sal no se guarda huella) y el agente de usuario recortado a 255 caracteres. El registro
corre después de responder: la página no lo espera y, si falla, queda en el log.

La demo guarda sus contadores (`visits.count`, `visits.firstAt`, `visits.lastAt`), que
sobreviven al borrado de las visitas. `GET /api/admin/demos/:demoId/visits?page=&perPage=`
las lista, lo más reciente primero.

### Consultar y editar

- `GET /api/admin/demos?status=&prospectId=&createdBy=` — estado derivado (`vigente`,
  `vencida`, `convertida`, `descartada`), negocio, contacto y teléfono, si tiene correo
  (`prospect.hasEmail`), dirección, vencimiento (`expiresAt`, `neverExpires`,
  `extensionCount`), quién la creó y visitas. `status=por-vencer` trae las vigentes que vencen
  en los próximos `DEMO_EXPIRY_WARNING_DAYS` días, la más próxima primero.
- `GET /api/admin/demos/:demoId` — la demo, la ficha del prospecto y sus otras demos.
- `PATCH /api/admin/demos/:demoId/prospect` — edita la ficha (al menos un campo).

Crear, editar la ficha, regenerar enlaces y cambiar el vencimiento queda en el registro de
actividad (`demo.create`, `demo.prospect.update`, `demo.link.regenerate`, `demo.extend`,
`demo.expiry.update`) con quién lo hizo y **sin** tokens.

### Ciclo de vida

```text
crear ──▶ vigente ──(pasa expiresAt)──▶ vencida
             ▲                             │
             └───────── extender ──────────┘

"sin vencimiento" (expiresAt nulo): se queda vigente
```

El estado es **derivado**, no una columna: se calcula con la hora de cada consulta, así que
nadie tiene que acordarse de actualizarlo.

| Estado       | Cuándo                                      | Prospecto | Equipo, panel y MCP |
| ------------ | ------------------------------------------- | --------- | ------------------- |
| `vigente`    | Sin resultado y `expiresAt` futuro (o nulo) | Entra     | Entra y edita       |
| `vencida`    | Sin resultado y `expiresAt` ya pasó         | 404       | Entra y edita       |
| `convertida` | `outcome = converted` (etapa 3)             | 404       | Es un cliente       |
| `descartada` | `outcome = discarded` (etapa 3)             | 404       | Entra               |

- **Vence sola** a los `DEMO_DURATION_DAYS` (14) de crearse. El enlace del prospecto responde
  404 **en el mismo instante** en que vence: la guarda compara con la hora de la petición y no
  espera a ninguna tarea programada.
- **Extender:** `POST /api/admin/demos/:demoId/extend` suma 14 días a lo que sea más tarde entre
  ahora y el vencimiento actual. A una vigente que vence en 5 días la deja venciendo en 19; a una
  vencida hace 10 días la deja vigente 14 días desde hoy, y el prospecto vuelve a entrar con el
  **mismo enlace**. Sin máximo; `extensionCount` cuenta cuántas veces se extendió.
- **Sin vencimiento:** `PATCH /api/admin/demos/:demoId/expiry` con `{ "neverExpires": true }`
  deja `expiresAt` en nulo (una demo de portafolio, por ejemplo). Con `false` le vuelve a poner
  vencimiento a 14 días desde hoy; si ya vencía, no le cambia la fecha. Extender una demo sin
  vencimiento responde 422: primero hay que devolverle el vencimiento.
- Ninguna de las dos acciones vale sobre una demo convertida, descartada o ya borrada (422).
  Si dos personas cambian el vencimiento a la vez, la segunda recibe 409 en vez de pisar a la
  primera.
- Ambas son de owner, editores y claves con `write`, y responden `{ "demo": { ... } }` con la
  demo actualizada.

### Reglas que protegen el estado

- `PATCH /api/admin/tenants/:id/status` no acepta `demo` ni cambia una demo (422): se entra
  creándola y se sale convirtiéndola o descartándola (etapa 3).
- Una demo no acepta dominios (422 "Una demo no puede tener dominio propio; conviértela
  primero.").
- A una demo no se le asigna una persona con rol `client` (422): el prospecto no entra al panel.
- `GET /api/admin/tenants` no lista demos salvo con `?includeDemos=true`; la cobranza
  (`/api/admin/subscriptions`) tampoco. Leer o editar una demo por su id funciona igual que con
  cualquier tenant.
- Las demos son de la agencia: un usuario `client` recibe 403 y una clave limitada a algunos
  clientes también.

### Certificados (`/internal/domains/allowed`)

La capa de borde pregunta ahí si un dominio es nuestro antes de emitir un certificado
on-demand. Una demo responde que sí, igual que cualquier subdominio de la plataforma: sin
certificado el prospecto no podría abrir el enlace. El contenido sigue protegido por la guarda.

Ojo: un certificado emitido por dominio queda en los registros públicos de Certificate
Transparency, y `demo-pasteleria-luna.<plataforma>` delataría el nombre del negocio. En
producción conviene servir `*.<PLATFORM_DOMAIN>` con **un certificado comodín** (desafío DNS),
de modo que las demos nunca pidan uno propio.

### Etapas siguientes

Avisar al prospecto (etapa 2), borrado automático con registro anónimo (etapa 2),
convertir y descartar (etapa 3), herramientas MCP (etapa 3) y métricas (etapa 4). Las columnas
que necesitan (`expiresAt`, `outcome`, `outcomeAt`, `purgedAt`, contadores) ya existen, y la
fila `demos` suelta el tenant y el prospecto (`SetNull`) para poder quedar como rastro anónimo.
