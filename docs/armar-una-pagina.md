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

`list_pages`, `create_page`, `update_page`, `delete_page`, `add_block`, `update_block`
(incluye `isHidden`), `duplicate_block`, `delete_block`, `reorder_blocks`, `publish_page`,
`list_versions`, `restore_version`, `get_navigation` y `set_navigation`.

Las herramientas que borran exigen `confirm: true` en la misma llamada: un agente no puede
borrar "de pasada" creyendo que era reversible.
