# web-builder-api

API headless para el motor de landing pages dinámicas. Expone las páginas (bloques
visuales ordenados en JSONB), las configuraciones globales de marca y el envío del
formulario de contacto vía SMTP.

## Stack

- Express 5 + TypeScript (strict)
- PostgreSQL (driver `pg`)
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
│   │   ├── infrastructure/  # PostgresPageRepository
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

## Endpoints

| Método | Ruta               | Descripción                                                 |
| ------ | ------------------ | ----------------------------------------------------------- |
| GET    | `/api/pages/:slug` | Página con sus secciones JSONB ordenadas (404 si no existe) |
| GET    | `/api/settings`    | Configuraciones globales de marca                           |
| POST   | `/api/contact`     | Valida con `ContactSchema` (400 si falla) y envía correo    |
| GET    | `/health`          | Health check                                                |

## Puesta en marcha

```bash
pnpm install
cp .env.example .env       # ajustar credenciales SMTP si se desea envío real
pnpm db:up                 # levanta PostgreSQL (puerto 5433) con esquema + seed
pnpm dev                   # API en http://localhost:4000
```

## Scripts

- `pnpm test` — ejecuta los specs de Jest
- `pnpm lint` / `pnpm lint:fix` — ESLint con reglas type-checked y boundaries
- `pnpm format` — Prettier
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm build` && `pnpm start` — compilación y ejecución de producción
