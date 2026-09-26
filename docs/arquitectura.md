# Arquitectura del Proyecto

Este documento explica cómo está estructurado el código de `web-builder-api` y por qué. **Léelo antes de modificar o crear módulos nuevos.**

## Por qué dividimos en módulos de negocio (Screaming Architecture)

El proyecto utiliza una "Screaming Architecture" orientada a dominios de negocio. En lugar de agrupar por tipo técnicos (todos los controladores juntos, todos los modelos juntos), agrupamos por el **problema que resuelven**. Esto permite que un agente o desarrollador que modifique la funcionalidad de "Páginas" encuentre todo lo que necesita dentro de `src/modules/Page/`, sin buscar por todo el repositorio.

## Las Capas y sus Reglas de Dependencia

Dentro de cada módulo, aplicamos Clean Architecture en 4 capas estrictas. Las reglas de dependencia entre ellas están protegidas y validadas automáticamente mediante `eslint-plugin-boundaries`.

1. **`domain` (El Corazón del Negocio)**
   - **Qué hace:** Define las entidades, las reglas de negocio puras, los errores de dominio y las interfaces (contratos) de los repositorios o servicios externos.
   - **Regla de dependencia:** No conoce a NINGUNA otra capa del módulo. Solo puede importar de sí mismo o del kernel compartido (`src/shared/`).
   - **Ejemplo real:** `src/modules/Page/domain/Page.ts` (la entidad de negocio) y `PageRepository.ts` (el contrato para guardar páginas).

2. **`application` (Casos de Uso)**
   - **Qué hace:** Coordina las acciones de negocio. Toma datos de la presentación, orquesta las reglas de `domain` y guarda resultados a través de interfaces, sin saber qué base de datos se usa.
   - **Regla de dependencia:** Solo conoce a `domain` y a sí misma.
   - **Ejemplo real:** `src/modules/Page/application/UpdatePageUseCase.ts`.

3. **`infrastructure` (La Implementación Real)**
   - **Qué hace:** Implementa los contratos definidos en `domain`. Aquí vive el código que habla con Prisma, Postgres, S3, SMTP u otras APIs externas.
   - **Regla de dependencia:** Puede depender de `domain` y `application`. NUNCA se importa desde `presentation`.
   - **Ejemplo real:** `src/modules/Page/infrastructure/PrismaPageRepository.ts` (implementa el contrato `PageRepository`).

4. **`presentation` (Frontera Externa)**
   - **Qué hace:** Maneja el HTTP (Express), las validaciones de entrada/salida (Zod), middlewares y la autenticación. Traduce las peticiones web en llamadas a los casos de uso (`application`).
   - **Regla de dependencia:** Conoce a `domain` y `application`. NUNCA interactúa con `infrastructure`.
   - **Ejemplo real:** `src/modules/Page/presentation/PageController.ts`.

## Contratos Abstractos vs Interfaces

En `domain`, los contratos (como repositorios o servicios) se definen como **clases abstractas** en lugar de `interface` de TypeScript.
**¿Por qué?** Porque TypeScript borra las `interface` durante la transpilación a JavaScript. Como utilizamos `diod` para la inyección de dependencias, la librería necesita un token (un objeto o clase real que exista en runtime) para resolver la dependencia. Las clases abstractas dejan una huella en el JavaScript resultante que permite usarlas como token en el contenedor.

## Inyección de Dependencias y el Contenedor Central

`src/container.ts` es el **único lugar** de toda la aplicación donde las capas se acoplan. Utiliza wiring explícito de `diod` para asociar las abstracciones de `domain` con las implementaciones concretas de `infrastructure`.
Esto se hace intencionadamente explícito y centralizado, sin autowiring mediante decoradores, porque el autowiring requiere emitir metadata que falla con transpiladores de archivo único como `esbuild` o `tsx`.

## Por qué tenemos dos repositorios (API y Frontend)

El proyecto se divide en `web-builder-api` y un frontend (generalmente en Next.js):
- **La API (este repositorio):** Es un motor headless. Gestiona las reglas de negocio, guarda la estructura de los bloques como JSONB, asegura las validaciones y proporciona las herramientas MCP para agentes. No emite HTML de las páginas finales.
- **El Frontend:** Consume esta API y contiene los componentes de React, el catálogo de estilos visuales y la lógica para convertir el JSON en una web visible. Además actúa como caché público.
Ambos se comunican mediante peticiones HTTP. Agregar un nuevo tipo de bloque implica agregar soporte en la interfaz del frontend y tal vez registrarlo en sus herramientas, pero la API lo almacena agnósticamente como datos.

## ¿Dónde encuentro X? (Guía Rápida para Agentes)

- **Una regla de negocio pura (ej: cálculo de descuentos, validar un bloque):** `src/modules/<NombreModulo>/domain/`.
- **La lógica de orquestación (ej: proceso de publicar una página o crearla):** `src/modules/<NombreModulo>/application/`.
- **Un endpoint HTTP nuevo:** Su definición en `src/modules/<NombreModulo>/presentation/` y su ensamble en `src/app.ts`.
- **La inyección de un nuevo caso de uso o repo:** `src/container.ts`.
- **Un kit de inicio por rubro:** `src/modules/Template/domain/kits/`.
- **Una nueva herramienta para el agente MCP:** `src/mcp/tools.ts`.
