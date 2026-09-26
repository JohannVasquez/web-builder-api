# Dominios y estado del sitio

Cómo se conecta el dominio propio de un cliente y cómo se pausa un sitio sin perder nada.

## Estado del sitio

| Estado     | Qué ve el visitante                                                           |
| ---------- | ----------------------------------------------------------------------------- |
| `active`   | El sitio, normal.                                                             |
| `paused`   | Página de mantención: "Estamos haciendo unos ajustes. Volvemos muy pronto."   |
| `building` | Página de mantención: "Estamos construyendo este sitio. Vuelve en unos días." |
| `demo`     | 404, salvo con el enlace de la demo (ver [Demos](demos.md)).                  |

Pausado y en construcción **no borran nada**: las rutas públicas responden 503 con
`{ error: 'SitePaused', status, siteName, message }` y reactivar devuelve el sitio tal cual.
El panel y el MCP siguen viendo y editando el contenido mientras tanto.

`demo` no se pone ni se quita desde este endpoint (responde 422): una demo nace al crearla con
`POST /api/admin/demos` y sale al convertirla o descartarla. Tampoco acepta dominios propios.

```bash
curl -X PATCH "$API/api/admin/tenants/$TENANT/status" \
  -H "Authorization: Bearer $TOKEN" -d '{"status":"paused"}'
```

## Dominios

Un cliente puede tener varios dominios; solo uno es el **principal** (el canónico con el que
se construyen las URLs absolutas, el sitemap y las etiquetas de compartir).

**Un dominio sin verificar no resuelve tráfico.** Existe en la base, se ven sus
instrucciones, pero `findByDomain` lo ignora: quien entre por ahí cae al sitio por defecto.
Tampoco puede marcarse como principal.

### Subdominios de la plataforma

Un dominio bajo `PLATFORM_DOMAIN` (por ejemplo `pasteleria.webbuilder.co`) se da por
verificado al crearlo: su DNS es nuestro, no hay nada que demostrar.

### Dominio propio del cliente

```bash
curl -X POST "$API/api/admin/tenants/$TENANT/domains" \
  -H "Authorization: Bearer $TOKEN" -d '{"domain":"mitienda.cl"}'
```

La respuesta trae los dos registros que la persona tiene que crear donde compró el dominio:

| Tipo      | Host                              | Valor                   | Para qué                         |
| --------- | --------------------------------- | ----------------------- | -------------------------------- |
| TXT       | `_webbuilder.mitienda.cl`         | token único del cliente | Demostrar que el dominio es suyo |
| A o CNAME | `mitienda.cl` / `www.mitienda.cl` | `PLATFORM_SITE_TARGET`  | Mandar el tráfico al sitio       |

El token deriva del id del cliente y de `AUTH_JWT_SECRET`: no se puede adivinar ni reusar en
otro cliente, y no ocupa una columna en la base.

Después de crear el TXT:

```bash
curl -X POST "$API/api/admin/tenants/$TENANT/domains/$DOMAIN_ID/verify" -H "Authorization: Bearer $TOKEN"
```

La API **consulta el DNS de verdad**. Si todavía no ve el registro responde 400 explicando
que la propagación puede demorar horas; no hay forma de marcarlo verificado a mano.

Una vez verificado se puede marcar como principal:

```bash
curl -X PATCH "$API/api/admin/tenants/$TENANT/domains/$DOMAIN_ID/primary" -H "Authorization: Bearer $TOKEN"
```

Borrar el dominio principal cuando hay otros exige marcar otro primero: si no, el sitio se
quedaría sin dirección canónica.

## Desde el MCP

`set_site_status`, `list_domains`, `add_domain`, `verify_domain` y `set_primary_domain`.

## Variables de entorno

| Variable               | Para qué                                                   | Por defecto            |
| ---------------------- | ---------------------------------------------------------- | ---------------------- |
| `PLATFORM_DOMAIN`      | Dominio de la plataforma; sus subdominios se autoverifican | `localhost`            |
| `PLATFORM_SITE_TARGET` | A dónde apunta el A/CNAME de un dominio propio             | `sitios.webbuilder.co` |
