# Dar de alta un cliente

Tres caminos, de más rápido a más control. Los tres terminan igual: un sitio que
responde en su propio dominio.

## 1. Desde un kit por rubro (lo normal)

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@webbuilder.co","password":"..."}' | jq -r .token)

# Qué kits hay
curl -s http://localhost:4000/api/admin/site-templates -H "Authorization: Bearer $TOKEN" | jq

# Crear el cliente ya armado
curl -s -X POST http://localhost:4000/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "slug": "pasteleria-luna",
    "name": "Pastelería Luna",
    "domains": ["pasteleria-luna.webbuilder.co"],
    "templateId": "pasteleria"
  }'
```

Queda publicado, con 4 páginas, paleta, tipografía y estilo visual. Lo que
falta es cambiar textos, subir imágenes y ajustar colores.

Un sitio creado desde un kit nace **publicado**, porque el punto es que esté
listo en minutos. Lo que un agente edite después nace en borrador.

## 2. Duplicando otro cliente

```bash
curl -s -X POST http://localhost:4000/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"slug":"electro-sur","name":"ElectroSur","duplicateFromTenantId":9}'
```

Copia páginas, bloques, menú, identidad, estilo y datos del negocio. **No**
copia dominios ni mensajes recibidos, y nace **despublicado**: todavía no es de
nadie y publicarlo debería ser una decisión.

## 3. Desde cero

Sin `templateId` ni `duplicateFromTenantId`, el cliente nace vacío. Después se
crean páginas y bloques, a mano o pidiéndoselo a un agente por MCP.

---

## Lo que viene después

### Marca

```bash
curl -s -X PATCH http://localhost:4000/api/admin/tenants/$ID/brand \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"palette":{"primary":"#e11d48","accent":"#0ea5e9"},"visualStyle":"neo-brutalism"}'
```

Con definir solo `primary` el sitio ya se ve coherente: el resto se deriva, y
el color de texto sobre cada color se calcula para que siempre se lea.

### Imágenes

Se suben a la biblioteca del cliente y lo que se guarda en un bloque es la
`key`, **nunca la URL**: las URLs del bucket son firmadas y expiran.

```bash
curl -s -X POST http://localhost:4000/api/admin/tenants/$ID/media \
  -H "Authorization: Bearer $TOKEN" -F "file=@logo.png"
# -> { "asset": { "key": "uuid.png", ... } }

curl -s -X PATCH "http://localhost:4000/api/admin/tenants/$ID/media/uuid.png" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"alt":"Logo de Pastelería Luna"}'
```

El texto alternativo no es opcional en la práctica: sin él, la imagen es
invisible para quien usa un lector de pantalla.

### Publicar

Editar un bloque **no** cambia el sitio. Lo que ve el público es la última foto
publicada:

```bash
curl -s -X POST http://localhost:4000/api/admin/tenants/$ID/pages/$PAGE/publish \
  -H "Authorization: Bearer $TOKEN"
```

Si algo salió mal, el historial permite volver atrás:

```bash
curl -s http://localhost:4000/api/admin/tenants/$ID/pages/$PAGE/versions \
  -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:4000/api/admin/tenants/$ID/pages/$PAGE/versions/$V/restore \
  -H "Authorization: Bearer $TOKEN"
```

Restaurar deja el **borrador** en esa versión; el sitio sigue mostrando lo
último publicado hasta que vuelvas a publicar.

### Dominio propio

1. Agrega el dominio al cliente.
2. El cliente apunta un CNAME a la plataforma.
3. Hasta que el dominio está verificado no resuelve tráfico: existe en la base
   pero nadie llega por él. Es lo que impide reclamar un dominio ajeno.

El primer dominio de la lista es el canónico, y es el que se usa para el
`sitemap`, la URL canónica y el `og:url`, sin importar por cuál entró la visita.

---

## Con un agente de IA

Todo lo anterior existe también como herramientas MCP, con los mismos permisos
y el mismo registro de actividad. Ver el README, sección "Claves de acceso y
agentes de IA".

Lo que conviene pedirle a un agente, en este orden:

1. `get_catalog` — qué bloques, variantes y estilos existen hoy.
2. `list_templates` y `create_tenant` — el cliente armado.
3. `update_brand` — colores y tipografía.
4. `add_block` / `update_block` — el contenido real.
5. `get_preview_url` — para que una persona lo revise.
6. `publish_page` — solo con permiso `full`.
