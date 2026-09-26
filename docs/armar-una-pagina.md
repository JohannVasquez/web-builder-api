# Armar una página

Cómo se construyen las páginas de un cliente desde la API, el panel o el MCP. Las tres usan
las mismas rutas, así que valen las mismas reglas.

## Borrador y publicado son dos cosas distintas

- Las filas de `page_sections` son el **borrador**: lo que ves y editas en el panel.
- `pages.published_content` es **lo que lee el sitio**: una foto del borrador tomada al
  publicar.

Editar un bloque no cambia el sitio. El sitio cambia cuando alguien publica:

```bash
curl -X POST "$API/api/admin/tenants/$TENANT/pages/$PAGE/publish" -H "Authorization: Bearer $TOKEN"
```

## Bloques

```bash
# Agregar
curl -X POST "$API/api/admin/tenants/$TENANT/pages/$PAGE/sections" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"Hero","position":1,"props":{"title":"Hola"}}'

# Editar (mandar `props` reemplaza el contenido completo del bloque)
curl -X PATCH ".../sections/$SECTION" -d '{"props":{"title":"Hola de nuevo"}}'

# Duplicar: la copia queda justo debajo y el resto corre una posición
curl -X POST ".../sections/$SECTION/duplicate"

# Ocultar
curl -X PATCH ".../sections/$SECTION" -d '{"isHidden":true}'

# Reordenar: se manda el orden completo, no el movimiento
curl -X PUT ".../sections/reorder" -d '{"sectionIds":[12,10,11]}'
```

**Ocultar no es borrar.** Un bloque oculto sigue en el borrador y en el panel, pero no sale
al sitio publicado, y la foto de la página conserva ese estado: restaurar una versión lo
devuelve como estaba.

**Duplicar no copia el ancla.** Dos bloques con la misma haría que un enlace del menú
apuntara a cualquiera de los dos.

Las posiciones son únicas por página. Si dos peticiones pelean por la misma, la segunda
recibe un 409 con el número en conflicto en vez de dejar la página inconsistente.

## Versiones

Cada cambio del borrador guarda una versión antes de aplicarse, venga de una persona o de un
agente:

```bash
curl ".../pages/$PAGE/versions" -H "Authorization: Bearer $TOKEN"
curl -X POST ".../pages/$PAGE/versions/$VERSION/restore" -H "Authorization: Bearer $TOKEN"
```

Restaurar reemplaza el borrador, no el sitio: hay que publicar para que se vea.

## El menú de navegación

El menú se reemplaza entero en cada guardado; el orden del arreglo es el orden del menú.

```bash
curl -X PUT "$API/api/admin/tenants/$TENANT/navigation" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"links":[
        {"label":"Inicio","href":"/"},
        {"label":"Precios","href":"/servicios#precios"},
        {"label":"Instagram","href":"https://instagram.com/cliente"}
      ]}'
```

Un `href` apunta a una página propia, al ancla de una sección o a una URL completa.
Cualquier otra cosa se rechaza.

No se parchea enlace por enlace a propósito: `(tenant, posición)` es único, así que
actualizar en el sitio chocaría a la mitad de cualquier reordenamiento.

## Desde el MCP

`get_site`, `create_page`, `update_page`, `delete_page`, `add_block`, `update_block`
(incluye `isHidden`), `duplicate_block`, `delete_block`, `reorder_blocks`, `publish_page`,
`unpublish_page`, `list_page_versions`, `restore_page_version`, `get_navigation` y
`set_navigation`.

Las herramientas que borran exigen `confirm: true` en la misma llamada: un agente no puede
borrar "de pasada" creyendo que era reversible.

## Imágenes y Carruseles desde el MCP

El agente de IA puede generar imágenes, guardarlas en su disco local y subirlas a la plataforma usando la herramienta `upload_media`. 

### Ejemplo: Crear un carrusel generado por IA

Puedes pedirle al agente exactamente esto:
> "Genera tres fotos de paisajes patagónicos, súbelas a la biblioteca y ármame un carrusel con ellas en la página de inicio."

El recorrido interno que hace el agente es el siguiente:
1. Genera las 3 imágenes localmente y las guarda en su disco (ej. `/tmp/paisaje1.jpg`, etc).
2. Llama a la herramienta `upload_media` pasando las rutas locales y, opcionalmente, los textos alternativos (`alt`):
   ```json
   {
     "tenantId": "1",
     "files": [
       { "filePath": "/tmp/paisaje1.jpg", "alt": "Montañas nevadas en la Patagonia" },
       { "filePath": "/tmp/paisaje2.jpg", "alt": "Lago cristalino al atardecer" },
       { "filePath": "/tmp/paisaje3.jpg", "alt": "Bosque de lengas en otoño" }
     ]
   }
   ```
3. El servidor MCP lee los archivos y los envía a la API usando multipart.
4. La herramienta le devuelve al agente los identificadores (`key`) de las tres imágenes subidas.
5. El agente usa `add_block` o `update_block` para agregar un bloque de tipo `Carousel` (o similar), utilizando en las propiedades (props) las `keys` devueltas en lugar de URLs.

Este flujo evita saturar la conversación con strings en base64 y respeta el flujo de almacenamiento optimizado (con sharp) de la plataforma.
