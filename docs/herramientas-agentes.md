# Guía de Herramientas para Agentes (MCP)

La plataforma expone un servidor MCP (Model Context Protocol) por stdio en `src/mcp/`, que un agente de IA usa para gestionar sitios web de forma declarativa. Este documento describe las reglas de interacción y el orden ideal para trabajar.

## Reglas Maestras de Diseño

Para evitar incidentes, el sistema impone dos restricciones por diseño a todos los clientes (humanos y agentes):

1. **Todo nace en borrador.**
   Cuando llamas a `create_page`, la página se crea con `isPublished: false` por defecto, a menos que solicites explícitamente lo contrario.
   La herramienta `update_page` no publica el borrador. Esto es para que puedas rediseñar secciones enteras sin temor. Publicar (`publish_page`) es un paso final explícito que exige el permiso `full`.

2. **Lo destructivo exige confirmación en la misma llamada.**
   Herramientas como `delete_page` o `delete_block` no solo requieren permiso `full`, sino que te obligan a enviar `confirm: true` en sus argumentos. Así, no borrarás algo de forma colateral sin haberlo decidido expresamente. Lo mismo vale para `discard_demo` y `convert_demo`, que deciden el destino de una demo.

## Flujo Recomendado: Cómo armar un sitio de cero a listo

1. **Crear el Cliente**
   Usa `create_tenant`. Puedes empezar con un sitio vacío, usar un kit base (`list_templates` para buscar un `templateId`) o duplicar desde otro (`duplicateFromTenantId`).
   _Tip: Si usas una plantilla, el sitio nace publicado. Si lo duplicas, nace despublicado._

2. **Revisar el Estado Actual**
   Usa `get_site(tenantId)`. Te devolverá TODO: las páginas, bloques existentes, menú y paleta de colores. No adivines el estado.

3. **Ver el Catálogo de Bloques Disponibles**
   Usa `get_catalog()` para consultar qué bloques existen actualmente, qué variantes y propiedades (`props`) esperan, estilos visuales y fuentes disponibles. El frontend y la API son los que conocen los bloques reales.

4. **Gestionar la Identidad (Opcional)**
   Usa `update_brand` o `update_settings` si necesitas cambiar la paleta o configurar el correo de contacto y redes sociales del cliente.

5. **Añadir o Editar Páginas y Bloques**
   Usa `create_page` si necesitas páginas nuevas, o `add_block` / `update_block` para modificar los bloques (secciones) dentro de una página.
   _Tip: Si necesitas imágenes reales que no estén pre-cargadas en el kit, usa `upload_media` para subir imágenes desde tu entorno y luego inserta el `key` retornado en los `props` del bloque._

6. **Revisar y Publicar**
   Después de realizar los cambios (que viven en borrador), el sitio está listo para revisión. Una vez verificado todo con el usuario, o bajo instrucción de hacerlo, llama a `publish_page`.

## Armar una demo para un prospecto

Para la venta en frío: el sitio de un negocio que **todavía no compró**, listo antes de llamarlo. Una demo es privada (solo la ve quien trae su enlace, ni el público ni Google) y vence sola a los 14 días. Si el negocio ya es cliente, es `create_tenant`; si es para mostrárselo a un prospecto, es `create_demo`. Detalle completo en [Demos](demos.md).

1. **Crear la demo.** `list_templates` para elegir el kit del rubro y `create_demo` con el `slug`, el `name` y la ficha del prospecto (`prospect`: negocio, contacto, teléfono, correo, rubro, origen, notas). Para una segunda propuesta al mismo negocio, manda `prospectId` en vez de `prospect`. Si el slug está ocupado, la respuesta trae `suggestedSlug`: reintenta con ese.
   La respuesta trae la demo (con su `tenantId`) y **los dos enlaces**, `links.prospect.url` y `links.team.url`. **Se muestran una sola vez**: guárdalos para el paso 4.
2. **Llenarla con el contenido del negocio.** Con las herramientas de siempre, usando el `tenantId` de la demo: `get_site`, `update_brand`, `update_settings`, `add_block`, `update_block`, `upload_media`... Una demo es un sitio como cualquier otro para editarlo.
3. **Publicar lo que cambiaste.** Las páginas del kit nacen publicadas, pero lo que edites queda en borrador: `publish_page` en cada página que tocaste, o el prospecto no lo verá.
4. **Entregar el enlace.** Pásale a la persona que te lo pidió `links.prospect.url` (el que se le manda al prospecto) y, si lo pide, `links.team.url` (para el equipo; no cuenta visitas). Si se perdió, `regenerate_demo_link` genera otro y anula el anterior.

Todo el recorrido funciona con una clave `write` sin alcance limitado. Después, para seguirla:

- `list_demos` (con `status: "por-vencer"` para la lista de llamadas) y `get_demo`, que trae la ficha, las otras propuestas y las últimas páginas que abrió el prospecto.
- `update_prospect` para anotar lo que se habló.
- `extend_demo` (14 días más) o `set_demo_expiry` (sin vencimiento).
- Si dijo que no: `discard_demo` (permiso `full`, `confirm: true`). Si llama de vuelta dentro de 30 días: `restore_demo`.
- Si compró: `convert_demo` (permiso `full`, `confirm: true`) con el `owner` para crearle su cuenta. El sitio pasa a ser público en su dirección definitiva.

Ninguna herramienta borra una demo: eso lo hace la tarea diaria o la persona dueña de la cuenta desde el panel.

## Configuración y Permisos de Claves

Los agentes y el panel humano acceden por las **mismas rutas** `/api/admin/**`. Un agente se autentica mediante una API Key (ej. `wb_...`).

Existen tres niveles de permiso en las API Keys:

- **`read`**: Solo operaciones `GET` y `list`.
- **`write`**: Permite leer y editar contenido (ej. añadir un bloque, subir imagen). `POST`, `PATCH`, `PUT`.
- **`full`**: Permite además acciones destructivas o de alto impacto como publicar (`publish_page`) o eliminar (`DELETE`).

Las demos de prospecto siguen el mismo modelo: leerlas (`list_demos`, `get_demo`) pide `read`; crearlas y operarlas (`create_demo`, `update_prospect`, `regenerate_demo_link`, `extend_demo`, `set_demo_expiry`, `restore_demo`) pide `write`; descartarlas y convertirlas (`discard_demo`, `convert_demo`) pide `full`. Una clave con **alcance limitado** a algunos clientes no alcanza a ninguna demo, ni para crearla ni para verla: una demo es trabajo de la agencia sobre un negocio que todavía no es cliente.

Si un error de validación ocurre en las herramientas, se te devolverá como una lista explícita de campos incorrectos (y sus motivos), para que puedas corregir los argumentos y reintentar inmediatamente.

## Lista Completa de Herramientas

Para garantizar que la documentación nunca se desfase del código real, todas las herramientas registradas en la API deben estar mencionadas en este documento.

- `list_tenants`: Listar clientes. No incluye las demos de prospecto (tenants en estado `demo`): esas salen en `list_demos`. Ver [Demos](demos.md).
- `get_site`: Ver un sitio completo (páginas, bloques, settings).
- `get_catalog`: Ver el catálogo de la plataforma.
- `list_templates`: Ver los kits de inicio por rubro.
- `create_tenant`: Crear un cliente nuevo (público). Para un prospecto que no compró, `create_demo`.
- `create_demo`: Crear la demo privada de un prospecto; devuelve sus dos enlaces una sola vez.
- `list_demos`: Listar demos (estado, vencimiento, visitas); `por-vencer` para llamar.
- `get_demo`: Ver una demo con su prospecto, sus otras propuestas y sus últimas visitas.
- `update_prospect`: Editar la ficha del prospecto (notas, contacto).
- `regenerate_demo_link`: Regenerar el enlace del prospecto o del equipo (se muestra una vez).
- `extend_demo`: Extender una demo 14 días.
- `set_demo_expiry`: Marcar o desmarcar una demo "sin vencimiento".
- `discard_demo`: Descartar una demo (`full` y `confirm: true`).
- `restore_demo`: Recuperar una demo descartada dentro de los 30 días.
- `convert_demo`: Convertir una demo en cliente (`full` y `confirm: true`).
- `create_page`: Crear una página.
- `update_page`: Editar meta-datos de una página.
- `publish_page`: Publicar borrador al sitio público.
- `unpublish_page`: Ocultar página.
- `list_page_versions`: Ver historial de página.
- `restore_page_version`: Restaurar borrador antiguo.
- `delete_page`: Borrar página.
- `add_block`: Agregar un bloque.
- `update_block`: Editar un bloque.
- `duplicate_block`: Duplicar bloque.
- `delete_block`: Borrar bloque.
- `reorder_blocks`: Reordenar bloques de una página.
- `add_legal_page`: Crear páginas de políticas.
- `get_settings`: Ver config global.
- `update_settings`: Editar config global.
- `get_brand`: Ver identidad de marca.
- `update_brand`: Modificar identidad.
- `list_media`: Ver biblioteca de imágenes.
- `upload_media`: Subir imágenes.
- `describe_image`: Agregar alt a imagen.
- `list_posts`: Ver publicaciones del blog.
- `create_post`: Crear publicación en el blog.
- `update_post`: Actualizar publicación del blog.
- `delete_post`: Borrar publicación del blog.
- `list_products`: Ver productos de tienda.
- `create_product`: Crear producto de tienda.
- `update_product`: Editar producto de tienda.
- `delete_product`: Borrar producto de tienda.
- `get_navigation`: Ver menú del sitio.
- `set_navigation`: Configurar menú.
- `set_site_status`: Pausar o reactivar sitio completo.
- `list_domains`: Ver dominios propios configurados.
- `add_domain`: Agregar dominio.
- `verify_domain`: Verificar propiedad de dominio.
- `set_primary_domain`: Asignar dominio canónico.
- `get_store_settings`: Ver configuración de la tienda.
- `update_store_settings`: Configurar pasarelas de pago y opciones.
- `list_orders`: Ver pedidos.
- `update_order_status`: Cambiar estado de un pedido.
- `sales_report`: Reporte de ventas.
- `list_coupons`: Ver códigos de descuento.
- `create_coupon`: Crear descuento.
- `delete_coupon`: Borrar descuento.
- `get_preview_url`: Obtener enlace temporal seguro.
- `list_activity`: Consultar log de auditoría.
- `review_site_quality`: Evaluar accesibilidad y contrastes del sitio automáticamente.
- `get_subscription_status`: Estado y plan contratado.
- `register_subscription_payment`: Registrar cobros fuera de plataforma.
