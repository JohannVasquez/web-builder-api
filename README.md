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

Screaming Architecture por módulos de negocio, con Clean Architecture intramódulo:

```
src/
├── modules/
│   ├── Page/            # Motor de renderizado dinámico
│   │   ├── domain/          # Entidades, errores e interfaces de repositorio
│   │   ├── application/     # GetPageBySlugUseCase (+ .spec.ts)
│   │   ├── infrastructure/  # PrismaPageRepository
│   │   └── presentation/    # Controller + router
│   ├── GlobalSettings/  # Variables globales de marca
│   ├── Navigation/      # Menú del sitio (páginas y/o anclas de secciones)
│   └── Contact/         # Formulario de contacto + SMTP
├── shared/              # Kernel compartido (config, DB, error handler)
├── app.ts               # Ensamblado de Express
├── container.ts         # Raíz de composición (inyección de dependencias)
└── server.ts            # Punto de entrada
```

Las dependencias entre capas están protegidas por `eslint-plugin-boundaries`:
`domain` no conoce a nadie, `application` solo conoce a `domain`, e
`infrastructure`/`presentation` nunca se importan entre sí.

## Inyección de dependencias (diod)

`domain` define los contratos como **clases abstractas** (`PageRepository`,
`GlobalSettingsRepository`, `EmailService`) — TypeScript borra las `interface` en
runtime, así que diod necesita un token real para resolver dependencias. Las clases
de `application`/`presentation`/`infrastructure` reciben esos contratos por
constructor, sin conocer la implementación concreta.

`src/container.ts` es la única raíz de composición: usa el `ContainerBuilder` de diod
para asociar cada abstracción con su implementación de Prisma/SMTP y arma el grafo de
dependencias con **wiring explícito** (`withDependencies([...])`) en vez de autowiring
por decoradores. Se eligió así porque el autowiring de diod depende de
`emitDecoratorMetadata`, que requiere chequeo de tipos de todo el `Program` para
resolver clases importadas de otros archivos — algo que un transpilador de un solo
archivo como esbuild (usado por `tsx` en `pnpm dev`) no puede garantizar. El wiring
explícito es una función de primera clase de diod, sin esa fragilidad, y se comporta
igual en `pnpm dev`, `pnpm test` y `pnpm build`.

## Endpoints

| Método | Ruta               | Descripción                                                 |
| ------ | ------------------ | ----------------------------------------------------------- |
| GET    | `/api/pages/:slug` | Página con sus secciones JSONB ordenadas (404 si no existe) |
| GET    | `/api/settings`    | Configuraciones globales de marca                           |
| GET    | `/api/navigation`  | Enlaces del menú del sitio, ordenados                       |
| POST   | `/api/contact`     | Valida con `ContactSchema` (400 si falla) y envía correo    |
| GET    | `/health`          | Health check                                                |

### Rutas que exigen sesión de administración

Todo lo que escribe va detrás de `Authorization: Bearer <token>` (el token lo
emite `POST /api/admin/auth/login`). Sin cabecera, o con un token inválido o
vencido, la respuesta es `401 { error: 'Unauthorized', message }`.

| Método | Ruta                                 | Descripción                       |
| ------ | ------------------------------------ | --------------------------------- |
| POST   | `/api/files`                         | Sube un archivo al bucket privado |
| DELETE | `/api/files/:key`                    | Borra un archivo del bucket       |
| GET    | `/api/admin/me`                      | Confirma la sesión vigente        |
| GET    | `/api/admin/tenants`                 | Lista los clientes                |
| CRUD   | `/api/admin/tenants/:tenantId/pages` | Páginas y secciones del cliente   |

Leer las imágenes **no** exige sesión: las URLs firmadas se resuelven en el
servidor al armar cada página, así que los sitios publicados siguen viéndose
para cualquier visitante.

## Crear clientes: kits por rubro y duplicado

`POST /api/admin/tenants` crea un cliente. Puede nacer vacío, desde un kit por
rubro (`templateId`) o copiando el sitio de otro cliente
(`duplicateFromTenantId`). Las dos últimas opciones son excluyentes.

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

| Guía | De qué trata |
| --- | --- |
| [Dar de alta un cliente](docs/dar-de-alta-un-cliente.md) | El paso a paso completo, de cero a sitio publicado |
| [Armar una página](docs/armar-una-pagina.md) | Bloques, borrador y publicado, versiones y el menú |
| [Dominios y estado del sitio](docs/dominios-y-estado-del-sitio.md) | Conectar el dominio propio de un cliente y pausar un sitio |
| [Gestionar el equipo del panel](docs/gestionar-el-equipo-del-panel.md) | Roles, invitaciones y recuperación de contraseña |
| [Vender en línea](docs/vender-en-linea.md) | Tienda, carrito, cobro, cupones, pedidos y reportes |

## Claves de acceso y agentes de IA

El panel y los agentes entran por **las mismas rutas** `/api/admin/**`. Es lo
único que garantiza que un agente no pueda hacer algo que el panel no valida,
ni al revés. Un solo middleware (`createActorMiddleware`) resuelve el actor:

- `Authorization: Bearer <jwt>` → una persona del panel.
- `Authorization: Bearer wb_...` o `X-Api-Key: wb_...` → una clave de agente.

El prefijo `wb_` es lo que distingue una de otra sin consultar la base.

### Permisos y alcance

| Permiso | Puede                                      |
| ------- | ------------------------------------------ |
| `read`  | Solo leer                                  |
| `write` | Leer y editar contenido (POST, PATCH, PUT) |
| `full`  | Además publicar y eliminar (DELETE)        |

`requireMethodPermission` deriva el permiso necesario del método HTTP, y
`requireTenantScope` bloquea con 403 cualquier `:tenantId` fuera del alcance de
la clave. Una clave revocada o vencida responde 401 con el motivo concreto.

De la clave solo se guarda el `sha256`; el token completo se muestra una vez, al
crearla. Una clave nunca puede gestionar claves: sería una escalada silenciosa.

### Registro de actividad

`createActivityRecordingMiddleware` registra cada escritura con el actor (persona
o nombre de la clave), el cliente, la acción y el cuerpo enviado. Va en un
middleware, como la invalidación de caché, para que toda ruta admin nueva quede
cubierta sin que nadie tenga que acordarse. Escribir en el registro nunca hace
fallar la operación de negocio.

Consulta: `GET /api/admin/activity?tenantId=&actorType=&from=&to=&limit=&offset=`

### Servidor MCP

`src/mcp/` expone la plataforma como servidor MCP por stdio. Habla con esta
misma API por HTTP, así que sirve igual contra local o contra producción: lo
único que cambia es `WEB_BUILDER_API_URL`.

Para conectarlo a Claude Code:

```bash
# 1. Crea una clave desde el panel (o con curl, con tu sesión de admin):
curl -X POST http://localhost:4000/api/admin/api-keys \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Claude Code","permission":"write"}'

# 2. Registra el servidor MCP (la clave se muestra UNA sola vez):
claude mcp add web-builder \
  --env WEB_BUILDER_API_URL=http://localhost:4000 \
  --env WEB_BUILDER_API_KEY=wb_... \
  -- pnpm --dir /ruta/a/web-builder-api mcp
```

Herramientas disponibles: `list_tenants`, `get_site`, `get_catalog`,
`create_page`, `update_page`, `publish_page`, `delete_page`, `add_block`,
`update_block`, `delete_block`, `reorder_blocks`, `get_brand`, `update_brand`,
`get_preview_url`, `list_activity`.

Dos reglas que el servidor impone por diseño:

- **Todo nace en borrador.** `create_page` manda `isPublished: false` salvo que
  se pida lo contrario; publicar es una herramienta aparte que exige `full`.
- **Lo destructivo exige confirmación en la misma llamada.** `delete_page` y
  `delete_block` piden `confirm: true`, para que un agente no borre "de paso".

Un error de validación vuelve al agente como la lista de campos mal y por qué,
no como un 400 opaco: es lo que le permite corregir y reintentar solo.

`get_catalog` se sirve desde el frontend (`WEBAPP_CATALOG_URL`), donde viven los
componentes. Así agregar un bloque o un estilo lo publica solo para los agentes,
sin tocar el MCP.

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
