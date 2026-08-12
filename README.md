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
| POST   | `/api/contact`     | Valida con `ContactSchema` (400 si falla) y envía correo    |
| GET    | `/health`          | Health check                                                |

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
