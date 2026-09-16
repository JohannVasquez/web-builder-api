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
