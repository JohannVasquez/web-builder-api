# Gestionar el equipo del panel

Quiénes entran al panel, con qué permisos y qué hacer cuando alguien olvida su contraseña.

## Roles

| Rol                           | Puede                                                                        | No puede                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `owner` (dueña de la agencia) | Todo: contenido de todos los clientes, personas del panel y claves de acceso | —                                                              |
| `editor`                      | Contenido de todos los clientes: páginas, bloques, blog, productos, publicar | Ver ni tocar `/api/admin/users` ni `/api/admin/api-keys` (403) |

El rol viaja en el token de sesión. Una **clave de acceso** (`wb_...`) nunca tiene rol: aunque
tenga permiso `full`, no puede crear personas ni emitir otra clave.

Siempre debe quedar al menos una persona `owner` activa. La API rechaza el cambio que dejaría
el panel sin dueñas, y nadie puede quitarse a sí misma el rol ni desactivar su propia cuenta.

## Invitar a alguien

```bash
curl -X POST "$API/api/admin/users" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"pau@ejemplo.cl","name":"Pau","role":"editor"}'

# Una persona de un cliente necesita su alcance:
curl -X POST "$API/api/admin/users" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"ana@pasteleria.cl","name":"Ana","role":"client","tenantIds":[40]}'
```

La cuenta se crea con una contraseña aleatoria que nadie conoce y le llega un correo con un
enlace para definir la suya. El enlace dura una hora y sirve una sola vez.

## Cambiar el rol o desactivar

```bash
curl -X PATCH "$API/api/admin/users/2/role"   -d '{"role":"owner"}'   ...
curl -X PATCH "$API/api/admin/users/2/role"   -d '{"role":"client","tenantIds":[40]}' ...
curl -X PATCH "$API/api/admin/users/2/status" -d '{"disabled":true}'  ...
```

Cambiar el rol reescribe el alcance: quien deja de ser `client` no se queda con una lista
vieja de clientes esperando a que alguien la borre.

Desactivar corta el acceso al instante: los tokens que esa persona ya tenía dejan de servir en
la siguiente petición, no al expirar.

## Recuperar la contraseña

```bash
curl -X POST "$API/api/admin/auth/forgot-password" -d '{"email":"pau@ejemplo.cl"}'
curl -X POST "$API/api/admin/auth/reset-password"  -d '{"token":"...","password":"al menos 10 caracteres"}'
```

`forgot-password` responde 200 siempre, exista o no el correo: una respuesta distinta
convertiría el endpoint en un buscador de qué correos tienen cuenta. Pedir un enlace nuevo
invalida los anteriores.

En desarrollo los correos no salen a internet: se ven en Mailpit (`http://localhost:8025`, o el
puerto que hayas definido en `MAILPIT_UI_PORT`).

`ADMIN_PANEL_URL` define la base del enlace que se manda por correo; en producción apunta al
panel real, por ejemplo `https://admin.tudominio.cl/admin`.

## Intentos fallidos

Cinco contraseñas malas seguidas —contadas por correo y por IP a la vez— bloquean el intento
por 15 minutos y la API responde 429 con `Retry-After`. Entrar bien limpia el contador.
