# Cómo agregar algo nuevo

Esta guía detalla los pasos para extender el proyecto de manera ordenada. Cuando agregues características, es importante seguir el orden arquitectónico (de adentro hacia afuera) y recordar actualizar la documentación afectada.

## 1. Agregar una nueva Herramienta para Agentes (MCP)

Si necesitas exponer una nueva capacidad para que la IA la pueda invocar:

1. Modifica `src/mcp/tools.ts`:
   - Utiliza la función interna `tool(...)` y `zod` para declarar los argumentos, la descripción precisa y el esquema de validación.
   - Apunta el `handler` al endpoint correspondiente de la API en `/api/admin/`.
2. Escribe pruebas en `src/mcp/tools.spec.ts` para cubrir casos borde.
3. **Documentación a actualizar:** `docs/herramientas-agentes.md` (si la nueva herramienta cambia el flujo de trabajo).

*(Nota: Al añadir herramientas, el test `docs-sync.spec.ts` verificará automáticamente que estén consistentes, por lo que no hace falta mantener una lista manual)*

## 2. Agregar un nuevo Kit por Rubro (Plantilla)

Los kits por rubro permiten crear sitios poblados con estructura inicial.

1. Crea un nuevo archivo en `src/modules/Template/domain/kits/`.
   - Nómbralo en kebab-case (ej. `abogados.ts`).
   - Define el kit con bloques que se vean bien **sin requerir imágenes**, utilizando los textos de muestra correspondientes.
2. Registra el nuevo kit importándolo y añadiéndolo en `src/modules/Template/domain/kits/registry.ts`.
3. **Documentación a actualizar:** Ocasionalmente `demos.md` si quieres reflejar las plantillas de ejemplo públicas, o ninguna si es un requerimiento normal.

## 3. Crear un Módulo de Negocio Nuevo

Cuando tengas que manejar un dominio de negocio enteramente nuevo (ej: Sistema de Reservas, Comentarios, etc.):

1. **Crea la estructura de carpetas** en `src/modules/<NuevoModulo>/`:
   - `/domain` (entidades, repositorios como abstracciones y tests unitarios)
   - `/application` (casos de uso)
   - `/infrastructure` (implementación de DB, mail, servicios externos)
   - `/presentation` (controladores HTTP, enrutador `router.ts`)
2. **Registro de Inyección de Dependencias:**
   - Abre `src/container.ts` y registra tu repositorio concreto en la interfaz (clase abstracta) del dominio con `builder.register(...)`.
   - Registra tus casos de uso y controlador con `withDependencies([ ... ])` para explicitar su wiring.
3. **Montaje de Rutas:**
   - Abre `src/app.ts` y monta tu nuevo router exportado en las subrutas correctas (ej. bajo `/api/admin/tenants/:tenantId/tu-modulo`).
   - Asegúrate de aplicarle middlewares genéricos como `...adminGuards` y `cacheInvalidation` si es un endpoint que modifica el estado público del sitio.
4. **Documentación a actualizar:**
   - Agrega o ajusta la sección funcional en `README.md` (o en una guía dedicada dentro de `docs/`) para documentar los nuevos endpoints, la estructura del modelo, y la estrategia de caché o borrador si la tiene.
