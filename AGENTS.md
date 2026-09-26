# Guía para Agentes de IA

Este proyecto (`web-builder-api`) es una API headless para un motor de landing pages dinámicas. Como agente de IA, tu trabajo es escribir, modificar y mantener este código. Gran parte del código lo escriben otros agentes, por lo que esta documentación es la fuente de verdad.

**NO abras ni leas todos los documentos a la vez.** Empieza por aquí y consulta el resto solo cuando la tarea lo requiera.

## Qué leer ANTES de tocar código
1. [Guía de Arquitectura](docs/arquitectura.md): Entiende cómo se dividen las capas (`domain`, `application`, `infrastructure`, `presentation`) y qué puede depender de qué.
2. [Guía de Convenciones](docs/convenciones.md): Cómo nombrar archivos, escribir comentarios (preferimos `//`), estructurar tests y formatear commits.

## Qué leer SOLO cuando haga falta
- [Herramientas para Agentes (MCP)](docs/herramientas-agentes.md): Qué herramientas están disponibles, qué permisos requieren y en qué orden usarlas para armar un sitio.
- [Cómo agregar nuevas funciones](docs/como-agregar-nuevas-funciones.md): El paso a paso para crear una herramienta nueva, un módulo nuevo o un kit por rubro.
- [README.md](README.md): Para ver la lista de endpoints de negocio, cómo levantar el proyecto localmente y los detalles específicos de cada dominio (Tienda, Blog, Historial, etc.).
