# Operación de la Plataforma

**Para quién es:** Quien tenga a cargo mantener la plataforma funcionando en producción.
**Cuándo leerlo:** Al asumir el rol, y como referencia rápida ante una alerta o procedimiento de mantenimiento.

Estos documentos son "runbooks" (manuales de operación directos y paso a paso) diseñados para que el mantenimiento y la operación diaria de la plataforma no dependan de una sola persona. Cada guía resuelve un tema específico con comandos concretos y explica el "porqué" de cada decisión para facilitar el diagnóstico de problemas no previstos.

## Índice de procedimientos

1. [Puesta en Marcha](./puesta-en-marcha.md) — Cómo montar la plataforma completa desde cero en un servidor nuevo: base de datos, almacenamiento, API y frontend.
2. [Configuración de Correo](./correo.md) — Configuración DNS (SPF, DKIM, DMARC), variables de entorno y diagnóstico para el envío de correos transaccionales y de contacto.
3. [Respaldos](./respaldos.md) — Política, ejecución (comandos exactos para la base de datos y el bucket de almacenamiento) y recuperación de copias de seguridad.
4. [Monitoreo](./monitoreo.md) — Qué variables vigilar, cómo interpretar las alertas y qué hacer cuando algo falla (incluye verificación de `/health`).
5. [Borrado de Datos Vencidos](./borrado-de-datos-vencidos.md) — Cumplimiento legal de privacidad: cómo opera el borrado de información caducada y cómo asegurar que corra a diario.
