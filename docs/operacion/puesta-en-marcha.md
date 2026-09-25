# Puesta en Marcha

**Para quién es:** La persona encargada de instalar y desplegar la plataforma desde cero en producción.
**Cuándo leerlo:** Al migrar de servidor o al montar la infraestructura por primera vez.

Este documento explica cómo llevar la plataforma web-builder a internet.

> PENDIENTE: Elegir el proveedor de infraestructura (ej. DigitalOcean, AWS, Hetzner) y documentarlo aquí.
> PENDIENTE: Definir el nombre de dominio principal de la plataforma (ej. `webbuilder.co`).

## 1. Infraestructura base

1. Levanta un servidor Linux (Ubuntu 22.04+ o Debian).
2. Instala Docker y Docker Compose.
3. Consigue un proveedor de almacenamiento de objetos compatible con S3 (ej. Cloudflare R2 o AWS S3).
   > PENDIENTE: Contratar servicio de almacenamiento (S3-compatible) y crear un bucket privado. El bucket en producción (igual que en desarrollo con MinIO) NO debe ser de lectura pública. La API firma las URLs.

## 2. Base de datos y variables

El repositorio no guarda contraseñas de producción. Jamás uses el `.env.example` en producción sin cambiar las claves.

1. Inicia la base de datos PostgreSQL. Puedes usar una base administrada o levantarla en el propio servidor con Docker.
2. Clona el repositorio de la API y de la webapp.
3. Crea un archivo `.env` para la API a partir de `.env.example`.
4. Configura el secreto JWT (`AUTH_JWT_SECRET` generado con `openssl rand -hex 32`) y la llave de cifrado de credenciales de cobro (`CREDENTIALS_ENCRYPTION_KEY` generada con `openssl rand -base64 32`). **Si pierdes la llave de cifrado, las credenciales de los clientes se pierden para siempre.**
5. Configura `DATABASE_URL` con tu cadena de conexión real a PostgreSQL.
6. Ajusta los parámetros de almacenamiento S3 (`STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`) con los datos del proveedor.

## 3. Despliegue de la plataforma

1. Corre las migraciones y despliega la API:
   ```bash
   pnpm install
   pnpm db:deploy
   pnpm build
   pnpm start
   ```
2. Despliega el frontend (webapp) configurándolo para apuntar a la API. Para que las tiendas actualicen su contenido rápido, configura `WEBAPP_REVALIDATE_URL` en la API (apuntando al frontend interno sin pasar por el proxy público) y pon el mismo `REVALIDATE_SECRET` en ambos proyectos.
3. Cifra el tráfico de internet usando un proxy inverso (como Caddy o Nginx) para generar y servir los certificados SSL/TLS automáticos.

## 4. Dominios de clientes

Los clientes reciben un subdominio gratuito al registrarse, y pueden conectar sus propios dominios a la plataforma después.

1. Define la variable `PLATFORM_DOMAIN` (ej. `webbuilder.co`). La plataforma asignará automáticamente un subdominio (`<slug>.webbuilder.co`) ya verificado a cada cliente nuevo. Si se deja en blanco, la creación sigue funcionando pero los sitios nacerán sin dirección.
2. Define la variable `PLATFORM_SITE_TARGET` (ej. `sitios.webbuilder.co`). Esto le indica al cliente adónde tiene que apuntar sus DNS (CNAME o A) cuando conecte un dominio propio.
3. Configura tu proxy de borde (ej. Caddy con On-Demand TLS) para emitir certificados SSL al vuelo cuando alguien entra por el dominio del cliente.

## 5. Publicar sin dejar los sitios caídos

Para sacar una versión nueva sin cortes de servicio:
1. Levanta el servicio nuevo en un puerto distinto o como contenedor nuevo.
2. Confirma que el proceso responde verificando el endpoint `/health`.
3. Cambia la ruta en el proxy inverso (Caddy/Nginx) para apuntar al servicio nuevo y recarga la configuración.
4. Baja el proceso antiguo.
