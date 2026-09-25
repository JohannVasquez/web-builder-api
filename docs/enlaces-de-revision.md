# Enlaces de revisión (Vista previa)

Esta funcionalidad permite que un cliente revise su sitio antes de que este se publique para todo el mundo. El enlace muestra el borrador del sitio sin requerir cuenta de usuario, lo cual es útil para mandar a revisión por correo o WhatsApp.

## Cómo funciona

1. El panel (o un agente mediante MCP) solicita un enlace de revisión.
2. La API genera un token criptográfico de un solo uso (y guarda el hash) con una fecha de expiración.
3. El enlace resultante se envía al cliente.
4. Cuando el cliente abre el enlace, la webapp envía el header `X-Preview-Token` (o usa la validación en sus endpoints mediante ese token).
5. La API, gracias al `previewMiddleware`, valida que el token no haya vencido ni sido anulado, y que pertenezca al sitio consultado. Si es válido, la API sirve las *versiones en borrador* de las páginas y marca la respuesta con la bandera de `noindex: true`.
6. Al mismo tiempo, durante la vista previa, funcionalidades como el envío de contacto quedan protegidas: guardar un mensaje de contacto no despacha correos reales para no generar ruido.

## Lo que debe implementar la Webapp (Frontend)

Para integrar y cerrar esta historia, el frontend debe:

- Capturar el query param del enlace de revisión (ej. `?previewToken=prev_XYZ`).
- Almacenar temporalmente ese token y pasarlo a las llamadas de la API en el header `X-Preview-Token: prev_XYZ`.
- Procesar la señal `noindex` (forzada a `true` por la API cuando detecta el modo de revisión) y emitir la meta etiqueta `<meta name="robots" content="noindex" />`.
- Usar el indicador `_isPreview` en la respuesta de la página (o el header `X-Is-Preview`) para renderizar un banner visual persistente en la interfaz que diga "Vista Previa" (o similar), para que el cliente sepa que no está viendo el sitio publicado.
- Manejar adecuadamente los posibles errores HTTP 403 y 404 (errores definidos en `preview_link_expired`, `preview_link_revoked`, `preview_link_not_found`, y `preview_link_tenant_mismatch`) mostrando una pantalla clara si el enlace ya expiró o fue revocado, diferenciándolo de un "404 - Sitio no encontrado".

## Herramienta MCP
Los agentes tienen acceso a `get_preview_url` para generar este token de manera autónoma cuando el usuario pide "dame un enlace para que el cliente revise".
