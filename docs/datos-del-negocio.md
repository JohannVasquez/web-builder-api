# Datos del negocio y medición

La configuración global de cada cliente agrupa toda la información transversal que se muestra en el sitio web y los fragmentos de código de analítica que lo miden.

A diferencia del contenido de las páginas, que varía en cada una, estos datos son únicos por cliente y el sitio decide cómo mostrarlos (por ejemplo, en el pie de página o en la cabecera).

## Validaciones estrictas

Cada campo cuenta con validaciones precisas para evitar errores que suelen notarse meses después.

### 1. Contacto y redes sociales

- **Correos (`contactEmail`)**: Permite varias direcciones separadas por coma. Cada una se normaliza (se eliminan espacios y se pasa a minúsculas) y se verifica que sea un correo válido.
- **WhatsApp (`whatsappNumber`)**: Acepta formatos como `+56 9 1234 5678` o `56912345678` y se normaliza para guardar siempre 11 dígitos que empiecen por el código de país chileno (`56`). El enlace de `wa.me` requiere este formato estricto.
- **Redes Sociales**: Todos los campos de redes (`instagramUrl`, `facebookUrl`, etc.) deben ser URLs válidas (empezando con `http://` o `https://`).

### 2. Horarios de atención (`openingHours`)

Se guardan como un JSON serializado para flexibilidad, pero su estructura se valida minuciosamente:

- Los 7 días de la semana deben estar presentes.
- Si un día está marcado como abierto (`isOpen: true`), debe incluir al menos un rango horario.
- Todo rango (ej. `09:00` - `18:00`) debe tener formato de hora válida y la hora de cierre debe ser siempre estrictamente posterior a la de apertura.

### 3. Códigos de medición y verificación

Un código mal ingresado rompe la analítica silenciosamente. Por ello:

- **Google Analytics (`googleAnalyticsId`)**: Debe iniciar estrictamente con `G-`.
- **Meta Pixel (`metaPixelId`)**: Debe contener únicamente números.
- **Google Tag Manager (`googleTagManagerId`)**: Debe iniciar estrictamente con `GTM-`.
- **Google y Bing Site Verification**: Se bloquea el ingreso de código HTML (`<meta...`) y se aceptan únicamente los identificadores alfanuméricos provistos por los respectivos servicios.

## Campos opcionales

Todos los campos pueden omitirse o enviarse como una cadena vacía (`""`). Un valor vacío indica explícitamente "no mostrar esto" en el sitio público y es un estado perfectamente válido.
