# web-builder-api

API headless para el motor de landing pages dinámicas. Expone las páginas (bloques
visuales ordenados en JSONB), las configuraciones globales de marca y el envío del
formulario de contacto vía SMTP.

## Stack

- Express 5 + TypeScript (strict)
- PostgreSQL + Prisma ORM (migraciones versionadas y seed declarativo)
- [diod](https://github.com/artberri/diod) para inyección de dependencias
- Zod 4 (validación estricta en todas las fronteras)
- Jest + ts-jest (TDD, specs junto a cada caso de uso)
- ESLint (type-checked) + `eslint-plugin-boundaries` + Prettier
- Husky + lint-staged + commitlint (Conventional Commits)
- pnpm

## Arquitectura

Consulta la [Guía de Arquitectura](docs/arquitectura.md) para detalles sobre las capas, dependencias y la inyección con `diod`.

## Endpoints

| Método | Ruta               | Descripción                                                                                       |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/pages/:slug` | Página con sus secciones JSONB ordenadas (envía el header `X-Preview-Token` para ver el borrador) |
| GET    | `/api/settings`    | Configuraciones globales de marca                                                                 |
| GET    | `/api/navigation`  | Enlaces del menú del sitio, ordenados                                                             |
| POST   | `/api/contact`     | Valida con `ContactSchema` (400 si falla) y envía correo                                          |
| GET    | `/health`          | Health check                                                                                      |

Las rutas públicas de un sitio en estado `demo` (demo de prospecto) exigen el header
`X-Demo-Token`; sin él responden 404. Ver [Demos](docs/demos.md).

### Rutas que exigen sesión de administración

Todo lo que escribe va detrás de `Authorization: Bearer <token>` (el token lo
emite `POST /api/admin/auth/login`). Sin cabecera, o con un token inválido o
vencido, la respuesta es `401 { error: 'Unauthorized', message }`.

| Método | Ruta                                     | Descripción                                                      |
| ------ | ---------------------------------------- | ---------------------------------------------------------------- |
| POST   | `/api/files`                             | Sube un archivo al bucket privado                                |
| DELETE | `/api/files/:key`                        | Borra un archivo del bucket                                      |
| GET    | `/api/admin/me`                          | Confirma la sesión vigente                                       |
| GET    | `/api/admin/tenants`                     | Lista los clientes (sin demos; `?includeDemos=true` las incluye) |
| POST   | `/api/admin/demos`                       | Crea una demo de prospecto y entrega sus dos enlaces             |
| GET    | `/api/admin/demos`                       | Lista demos (`status`, `prospectId`, `createdBy`)                |
| GET    | `/api/admin/demos?status=por-vencer`     | Demos vigentes que vencen en los próximos 3 días                 |
| GET    | `/api/admin/demos/:demoId`               | Demo, ficha del prospecto y sus otras demos                      |
| PATCH  | `/api/admin/demos/:demoId/prospect`      | Edita la ficha del prospecto                                     |
| POST   | `/api/admin/demos/:demoId/prospect-link` | Regenera el enlace del prospecto                                 |
| POST   | `/api/admin/demos/:demoId/team-link`     | Regenera el enlace del equipo                                    |
| GET    | `/api/admin/demos/:demoId/visits`        | Visitas del prospecto, paginadas                                 |
| POST   | `/api/admin/demos/:demoId/extend`        | Extiende la demo 14 días (`DEMO_DURATION_DAYS`)                  |
| PATCH  | `/api/admin/demos/:demoId/expiry`        | `{ neverExpires }`: la deja sin vencimiento o se lo devuelve     |
| POST   | `/api/admin/demos/:demoId/discard`       | `{ reason? }`: la descarta; el prospecto deja de entrar          |
| POST   | `/api/admin/demos/:demoId/restore`       | Recupera una descartada (dentro de la gracia) por 14 días        |
| POST   | `/api/admin/demos/:demoId/convert`       | `{ slug?, owner? }`: la convierte en cliente (clave `full`)      |
| DELETE | `/api/admin/demos/:demoId`               | `{ confirm: true }`: la borra ya y deja el registro anónimo      |
| POST   | `/api/admin/signed-documents`            | Registra firma de contrato (exige full)                          |
| GET    | `/api/admin/signed-documents/tenant/:id` | Lista documentos firmados por un cliente                         |
| GET    | `/api/admin/signed-documents/outdated`   | Clientes en versión anterior de un contrato                      |

| GET | `/api/admin/subscriptions` | Vista global de cobros y MRR |
| GET | `/api/admin/subscriptions/export` | Exportar cobros en CSV |
| CRUD | `/api/admin/tenants/:tenantId/pages` | Páginas y secciones del cliente |
| GET/PUT | `/api/admin/tenants/:tenantId/settings` | Datos del negocio y medición |
| GET/PUT | `/api/admin/tenants/:tenantId/subscription` | Consulta y cambia plan de cliente |
| POST | `/api/admin/tenants/:tenantId/subscription/payments` | Registra pago recibido (exige full)|
| GET | `/api/admin/tenants/:tenantId/quality-review`| Revisa la calidad antes de entregar |
| POST/DEL | `/api/admin/tenants/:tenantId/preview-links` | Genera o anula un enlace de revisión |

Leer las imágenes **no** exige sesión: las URLs firmadas se resuelven en el
servidor al armar cada página, así que los sitios publicados siguen viéndose
para cualquier visitante.

## Crear clientes: kits por rubro y duplicado

`POST /api/admin/tenants` crea un cliente. Puede nacer vacío, desde un kit por
rubro (`templateId`) o copiando el sitio de otro cliente
(`duplicateFromTenantId`). Las dos últimas opciones son excluyentes.
Al crearse, recibe automáticamente su dirección dentro del dominio de la plataforma (ej. `slug.plataforma.com`), si está configurado, para que funcione de inmediato sin intervención manual.

Los kits viven en `src/modules/Template/domain/kits/`, uno por archivo, y se
registran con una línea en `registry.ts`. Traen páginas, bloques, textos de
ejemplo en español de Chile, paleta, tipografía y estilo visual, y **ninguna
imagen**: las sube el cliente después, así que cada bloque tiene que verse bien
sin ellas.

El módulo `Tenant` no conoce los kits: pide "el contenido del kit X" a través
del puerto `SiteContentSource`. Lo mismo que se usa para duplicar un sitio.

Un sitio creado desde un kit nace **publicado** —el punto de la spec es que
quede listo en minutos—, pero una copia de otro cliente nace **despublicada**:
no tiene dominios propios todavía y publicarla debería ser una decisión.

`GET /api/admin/site-templates` lista los kits para el panel y para el MCP.

Para el sitio privado de un prospecto que todavía no compró se usa
`POST /api/admin/demos`, que parte de los mismos orígenes pero deja el sitio en
estado `demo`, con todo publicado y visible solo con su enlace. Ver
[Demos](docs/demos.md).

## Tienda (etapa 1)

Catálogo con pedido por WhatsApp: se vende desde el primer día sin procesar
pagos. Opcional por cliente, sin flag — un tenant sin productos devuelve
listados vacíos.

**El dinero va en enteros de pesos**, nunca en coma flotante: es un error que
aparece tarde y en la factura. El formateo a `$29.990` vive en el dominio, no
en el frontend, porque la misma regla la usan el catálogo, el detalle y el
mensaje de WhatsApp.

`buildWhatsAppOrderUrl` arma el enlace con el pedido ya escrito: normaliza el
número a solo dígitos (un `+56 9 1234 5678` pegado tal cual no abre la
conversación), incluye las opciones elegidas, la cantidad cuando es más de una,
y el precio vigente. Sin WhatsApp configurado devuelve `null` y el sitio decide
qué mostrar, en vez de generar un enlace roto.

Un producto inactivo no existe para el visitante, aunque adivine su dirección.
Una oferta que no es más barata que el precio normal se rechaza: o es un error
de carga, o engaña a quien compra.

- `GET /api/products?search=&category=&page=&perPage=`, `GET /api/products/destacados`,
  `GET /api/products/:slug` y `GET /api/product-categories` (públicos).
- CRUD en `/api/admin/tenants/:tenantId/products`, que sí incluye los inactivos.

## Blog

Opcional por cliente: un tenant sin publicaciones devuelve listados vacíos, sin
flag que activar. La ausencia ya lo dice.

Una publicación es visible para el público si está `published`, o si está
`scheduled` y su fecha ya llegó. **Eso se resuelve en la cláusula WHERE, no con
un cron**: una publicación programada aparece sola al llegar su hora, y la
consulta cuesta lo mismo con 10 que con 10.000 publicaciones. Un borrador
responde 404 aunque se adivine su slug.

El tiempo de lectura **no se guarda**: se recalcula en cada lectura a partir del
contenido. Guardarlo significa que editar el texto y olvidar el número lo deja
mal para siempre.

- `GET /api/blog?page=&perPage=&tag=` y `GET /api/blog/:slug` (públicos, con
  las imágenes ya firmadas y hasta 3 publicaciones relacionadas por etiqueta).
- CRUD en `/api/admin/tenants/:tenantId/posts`, que sí incluye los borradores.

## Borrador, publicación e historial

Las filas de `page_sections` son el **borrador**. El público lee
`pages.published_content`, una foto del contenido tomada al publicar. Editar un
bloque no cambia el sitio hasta que alguien llama a
`POST /api/admin/tenants/:t/pages/:p/publish`.

Esto es lo que hace segura la Épica 10: un agente puede reescribir una página
entera y nadie lo ve hasta que una persona revisa y publica.

Cada escritura del borrador guarda una versión con quién la hizo y qué cambió.
Se registra en el controller y no dentro de cada caso de uso porque es el único
punto que conoce al actor y ya tiene la página resultante; escribir la versión
nunca hace fallar la edición que la originó.

- `GET .../pages/:p/versions` lista el historial.
- `POST .../pages/:p/versions/:v/restore` devuelve el **borrador** a esa
  versión. No publica, y **crea una versión nueva** en vez de borrar lo
  posterior: restaurar por error tiene que poder deshacerse también.

Se conservan las últimas 50 versiones por página, más la publicada. Un
historial infinito crece sin límite y nadie mira más allá de las últimas
decenas, pero perder la versión publicada sí rompería el "volver atrás".

## Biblioteca de imágenes

Cada cliente tiene la suya: `storage_assets` lleva `tenant_id`, y toda consulta
va con él, así que una `key` adivinada no alcanza la biblioteca de otro.

- `GET /api/admin/tenants/:tenantId/media?search=` lista con URLs firmadas
  frescas (el bucket es privado).
- `POST .../media` sube conservando el nombre original, para poder buscarlo. Las imágenes (excepto SVG) se optimizan y convierten a WebP automáticamente, redimensionándose al ancho máximo configurado (`IMAGE_MAX_WIDTH`, por omisión 2000px).
- `PATCH .../media/:key` guarda el texto alternativo. Se edita aparte de la
  subida porque casi nunca se escribe en el momento, y sin él la imagen es
  invisible para un lector de pantalla.
- `DELETE .../media/:key` **avisa si la imagen está en uso** y se niega a
  borrarla; hay que reintentar con `?force=true`. Sin eso, borrar deja huecos
  en páginas publicadas sin que nadie se entere.

La búsqueda de uso es textual sobre el JSON de los bloques, la marca y los
ajustes. Es deliberado: la `key` es un UUID, así que un falso positivo es
prácticamente imposible, y recorrer el schema de cada tipo de bloque sería más
frágil y más lento.

## Suscripción a novedades

`POST /api/newsletter` (público, scoped por el dominio del visitante) guarda un
correo. Es idempotente: suscribirse dos veces no crea dos filas, y volver a
suscribirse reactiva una baja previa. El correo se normaliza en minúsculas, así
que `Ana@Ejemplo.CL` y `ana@ejemplo.cl` son la misma persona.

Comparte con el formulario de contacto el campo trampa y el límite por IP.

`GET /api/admin/tenants/:tenantId/subscribers` y `.../subscribers/export.csv`
para leerlos y exportarlos.

## Páginas legales

`POST /api/admin/tenants/:tenantId/legal-pages` con `{ kind }` crea la política
de privacidad o los términos y condiciones a partir de una plantilla, ya
rellenada con los datos del negocio. Nacen despublicadas: un texto legal lo
revisa una persona antes de publicarlo.

Los marcadores que no se pueden rellenar se dejan visibles (`{{address}}`) en
vez de borrarse, para que se note qué falta completar.

## Formulario de contacto

El mensaje se **guarda antes** de intentar el correo. Si el SMTP está caído, el
negocio no pierde el contacto: la respuesta al visitante es exitosa igual y el
mensaje queda en `contact_messages` con el motivo del fallo, para reintentar.
Devolver un error habría hecho que el visitante reenviara y se duplicara el
contacto, sin arreglar nada.

- Honeypot: el schema tiene un campo `website` que debe venir vacío. El
  formulario lo pinta fuera de pantalla; una persona nunca lo llena.
- Límite por IP y tenant: 5 envíos por minuto, con `Retry-After`.
- Destinatarios: el `contactEmail` del tenant acepta varios correos separados
  por coma.
- `GET/PATCH /api/admin/tenants/:tenantId/messages` y
  `GET .../messages/export.csv` para leerlos, marcarlos y exportarlos.

## Guías

| Guía                                                                   | De qué trata                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Guía para Agentes (Punto de entrada)](AGENTS.md)                      | Qué leer y qué no leer al modificar este código            |
| [Arquitectura](docs/arquitectura.md)                                   | Capas, módulos, dependencias e inyección                   |
| [Convenciones](docs/convenciones.md)                                   | Nomenclatura, comentarios y reglas de código               |
| [Herramientas MCP](docs/herramientas-agentes.md)                       | Lista y uso de herramientas para agentes IA                |
| [Cómo agregar funciones](docs/como-agregar-nuevas-funciones.md)        | Paso a paso para extender el proyecto                      |
| [Dar de alta un cliente](docs/dar-de-alta-un-cliente.md)               | El paso a paso completo, de cero a sitio publicado         |
| [Datos del negocio](docs/datos-del-negocio.md)                         | Información global, contacto, horarios y analítica         |
| [Armar una página](docs/armar-una-pagina.md)                           | Bloques, borrador y publicado, versiones y el menú         |
| [Dominios y estado del sitio](docs/dominios-y-estado-del-sitio.md)     | Conectar el dominio propio de un cliente y pausar un sitio |
| [Gestionar el equipo del panel](docs/gestionar-el-equipo-del-panel.md) | Roles, invitaciones y recuperación de contraseña           |
| [Vender en línea](docs/vender-en-linea.md)                             | Tienda, carrito, cobro, cupones, pedidos y reportes        |
| [Demos](docs/demos.md)                                                 | Sitios de demostración y demos privadas de prospectos      |

## Claves de acceso y agentes de IA

Consulta la [Guía de Herramientas para Agentes](docs/herramientas-agentes.md) para detalles sobre el servidor MCP, permisos, reglas de uso y la lista de herramientas disponibles.

## Identidad de marca (módulo Brand)

Cada tenant tiene una fila opcional en `tenant_brands` con su paleta,
tipografía, logos, modo claro/oscuro y estilo visual. Todo es opcional: sin
fila, o con la fila a medio llenar, el sitio se ve con la paleta neutra y la
tipografía por defecto. Una fila inválida también cae al valor por defecto en
vez de tumbar el sitio.

- `GET /api/settings` (público) devuelve los datos del negocio **y** `brand`,
  con los logos ya resueltos a URLs firmadas.
- `GET/PATCH /api/admin/tenants/:tenantId/brand` lo edita. El PATCH hace
  merge por sección: mandar `palette` la reemplaza entera, no mandarla la deja
  intacta.
- `GET /api/admin/font-pairings` devuelve el catálogo curado de combinaciones
  tipográficas, para el panel y para el MCP.

Los colores se guardan en hex y nada derivado se persiste: los tonos claros y
oscuros, y el color de texto legible sobre cada color, los calcula el frontend
al renderizar. Guardarlos obligaría a recalcular toda la tabla cada vez que
cambie la fórmula.

El id de estilo visual se valida como string en minúsculas con guiones, no
como `enum`: el catálogo de estilos vive en el frontend, que ante un id
desconocido cae al clásico. Encerrarlo aquí obligaría a migrar la API cada vez
que se agrega un estilo.

## Caché del sitio publicado

Los sitios públicos se sirven cacheados en el frontend (Next), con una
etiqueta por **dominio** de tenant. Después de cada escritura bajo
`/api/admin/tenants/:tenantId/**`, la API le avisa al frontend qué dominios
invalidar, para que el cambio se vea publicado de inmediato sin reiniciar
nada.

- El aviso lo dispara `createCacheInvalidationMiddleware`, montado junto a los
  routers admin. Va en un middleware y no dentro de cada caso de uso para que
  toda ruta admin nueva quede cubierta sin que nadie tenga que acordarse.
- `InvalidateTenantCacheUseCase` traduce el `tenantId` a **todos** sus
  dominios: un tenant puede llegar por su subdominio de plataforma y por su
  dominio propio, y cada uno es una clave de caché distinta.
- La llamada sale en segundo plano y nunca lanza: si el frontend está caído,
  el cambio igual quedó guardado; lo que se pierde es la frescura inmediata.
- Con `WEBAPP_REVALIDATE_URL` vacía la invalidación queda apagada y la API
  funciona igual.

## Páginas vs secciones: multi-página o one-page

La estructura del sitio se decide 100% en la base de datos, con dos piezas:

- **`pages` + `page_sections`**: cada sección pertenece explícitamente a una página
  (`page_id`). Una página es una URL propia; sus secciones son los bloques que la
  componen, en orden. Las secciones pueden llevar un `anchor` opcional que el
  frontend renderiza como `id`, enlazable como `/slug#ancla`.
- **`navigation_links`**: el menú del sitio. Cada entrada tiene `label`, `href` y
  `position`. El `href` puede apuntar a una página (`/nosotros`) o al ancla de una
  sección (`/#caracteristicas`).

Con eso, ambos modos son solo datos:

**Sitio multi-página** (como el seed actual): crea varias páginas y haz que el menú
apunte a sus slugs.

```
pages:            home · nosotros · servicios · contacto
navigation_links: Inicio → /  ·  Nosotros → /nosotros  ·  Servicios → /servicios  ·  Contacto → /contacto
```

**Sitio one-page**: pon todas las secciones en `home`, dales `anchor`, y haz que el
menú apunte a las anclas. No se toca ninguna línea de código.

```
pages:            home (secciones: Hero · Features[anchor: servicios] · TextBlock[anchor: nosotros] · ContactForm[anchor: contacto])
navigation_links: Inicio → /  ·  Nosotros → /#nosotros  ·  Servicios → /#servicios  ·  Contacto → /#contacto
```

Ambos estilos pueden mezclarse: un menú puede combinar páginas propias y anclas
(ej. `Características → /#caracteristicas` junto a `Contacto → /contacto`).

## Puesta en marcha

```bash
pnpm install               # genera el cliente de Prisma vía postinstall
cp .env.example .env       # ajustar credenciales SMTP si se desea envío real
pnpm db:up                 # levanta PostgreSQL (puerto 5433)
pnpm db:migrate            # aplica las migraciones de Prisma
pnpm db:seed               # carga las páginas y settings de ejemplo
pnpm dev                   # API en http://localhost:4000
```

## Base de datos (Prisma)

El esquema vive en `prisma/schema.prisma` y las migraciones versionadas en
`prisma/migrations/`. Flujo de trabajo:

- `pnpm db:migrate` — crea/aplica migraciones en desarrollo (`prisma migrate dev`)
- `pnpm db:deploy` — aplica migraciones pendientes en producción
- `pnpm db:seed` — ejecuta `prisma/seed.ts` (idempotente, usa upserts)
- `pnpm db:studio` — abre Prisma Studio para inspeccionar datos
- `pnpm db:generate` — regenera el cliente tipado (también corre en postinstall)

## Scripts

- `pnpm test` — ejecuta los specs de Jest
- `pnpm lint` / `pnpm lint:fix` — ESLint con reglas type-checked y boundaries
- `pnpm format` — Prettier
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm build` && `pnpm start` — compilación y ejecución de producción
- `pnpm db:*` — ver sección Base de datos (Prisma)
