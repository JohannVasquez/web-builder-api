# Revisión de Calidad Antes de Entregar

Entregar un sitio a un cliente es un momento importante, y la plataforma nos ofrece una herramienta automática para asegurar que nada obvio se nos pase.

Esta herramienta revisa los datos reales del cliente y nos devuelve una lista de observaciones con lo que falta o lo que se puede mejorar, en un lenguaje muy claro.

## Qué revisa la herramienta automática

La revisión se puede ejecutar cuantas veces quieras y no modifica absolutamente nada. Nos avisa si el sitio tiene:
- Textos de ejemplo que venían en la plantilla y que olvidamos reemplazar.
- Imágenes a las que les falta el texto alternativo (clave para la accesibilidad).
- Enlaces del menú que no apuntan a ninguna parte o que dirigen a páginas que no están publicadas.
- Páginas publicadas que no tienen configurado un título, descripción o imagen para buscadores y redes sociales (SEO).
- Datos del negocio vacíos (falta el teléfono, la dirección, los horarios o las redes sociales).
- El sitio todavía marcado como "en construcción".
- La política de privacidad sin crear o sin publicar.
- El correo de contacto ausente o mal escrito.

Para cada cosa que encuentre, te dirá exactamente dónde está, si es un error que impide la entrega (bloqueante) o si es solo una sugerencia de mejora, y una pequeña frase sobre cómo arreglarlo.

## Cómo ejecutarla

Puedes usar el comando del agente (`review_site_quality` pasándole el `tenantId`) o consultar directamente la ruta administrativa. La herramienta solo leerá la información y te entregará el reporte.

Si el sitio está impecable y listo para entregar, la lista de observaciones vendrá vacía.

## Qué NO revisa la herramienta (Pasos Manuales)

Existen dos cosas importantísimas que la herramienta **no puede revisar por ti**, porque intentar automatizarlas sería engañoso o traería consecuencias no deseadas:

1. **El envío real del formulario de contacto:** La herramienta revisa que el correo esté configurado y bien escrito, pero **no** manda un mensaje de prueba. Enviar un correo real puede confundir al cliente si el sitio ya está conectado a su bandeja, o puede gastar cuota de envíos de forma innecesaria. Como paso manual de tu entrega, siempre debes llenar el formulario de contacto de prueba y confirmar que llega a destino.
2. **"Carga rápido" y "Se ve bien en celular":** Estas métricas dependen del sitio una vez que es renderizado en el navegador de un visitante (el frontend), y no de los puros datos guardados. Siempre es necesario que abras el sitio final publicado desde un celular de verdad y navegues por él para asegurar que la experiencia sea de primer nivel.
