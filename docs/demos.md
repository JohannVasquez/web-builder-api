# Sitios de Demostración

Para facilitar la venta de la plataforma, se han creado tres sitios de demostración con contenido ficticio pero realista de negocios chilenos. Estos sitios permiten mostrar a los prospectos cómo se vería su página funcionando.

## Cómo se siembran

Las demostraciones se siembran de forma automática junto con el resto del contenido por defecto al ejecutar:

```bash
pnpm tsx prisma/seed.ts
```

La siembra es **idempotente**. Se pueden volver a sembrar los sitios tantas veces como sea necesario para restaurar su contenido original, sin riesgo de duplicar páginas o configuraciones.

## Cómo se usan para vender

1. **Mostrar capacidades:** Los prospectos pueden visitar cualquiera de los tres sitios para experimentar el diseño (uno por cada estilo visual: `classic`, `minimal` y `neo-brutalism`), la navegación y la velocidad de carga de un sitio final.
2. **Crear clientes rápido:** Al cerrar una venta, puedes crear el sitio para el nuevo cliente clonando una demostración en lugar de partir desde cero (usando `duplicateFromTenantId`). La copia del sitio nacerá **sin publicar**, lista para que puedas adaptar sus textos y configuraciones antes del lanzamiento.

## Qué queda pendiente

Actualmente, faltan dos elementos clave para que los sitios de demostración cumplan con la experiencia de venta perfecta, y que dependen de la puesta en marcha de la infraestructura (#98):

1. **Despliegue y URLs definitivas:** Los sitios deben publicarse en internet con dominios accesibles públicamente para poder enviarlos por WhatsApp y que los prospectos los abran en sus teléfonos.
2. **Imágenes reales:** Los sitios nacen actualmente sin imágenes fotográficas porque se necesita un bucket de almacenamiento real configurado. Por ahora, los bloques se visualizan bien sin imágenes, gracias al diseño robusto de los kits. Una vez que exista el despliegue del bucket, se deberán cargar imágenes de prueba para completar la experiencia visual.
