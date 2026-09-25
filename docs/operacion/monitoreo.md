# Monitoreo

**Para quién es:** Encargado de mantener la plataforma en línea.
**Cuándo leerlo:** Al configurar el sistema de alertas (ej. Uptime Kuma, Datadog) y cuando llega un aviso de caída.

La plataforma debe vigilarse desde el exterior para enterarse de los problemas antes de que los clientes reclamen.

## 1. Qué se vigila y con qué frecuencia

Configura tu herramienta de monitoreo para que revise estas métricas cada **1 a 5 minutos**:

- **Sitios y Frontend:** Revisa que el dominio principal del panel cargue sin errores (HTTP 200).
- **Salud de la API (`/health`):** La API expone el endpoint `/health`. Debe responder rápido con HTTP 200 y el JSON `{"status":"ok"}`.
- **Espacio en disco del servidor:** (Si usas un VPS propio). Revisa a diario que quede al menos 20% de espacio. La base de datos y los logs pueden llenarlo y quebrar la plataforma.

## 2. A dónde llega el aviso

> PENDIENTE: Definir y configurar el canal por donde se recibirán las alertas (ej. canal de Discord/Slack dedicado, correo electrónico o SMS para incidentes nocturnos).

## 3. Matriz de respuesta rápida

| Qué aviso llega | Qué está pasando | Qué hacer |
| :--- | :--- | :--- |
| **Timeout en `/health` o en sitios** | El servidor físico cayó, o el proxy inverso (Caddy/Nginx) dejó de responder. | 1. Verifica si puedes entrar por SSH.<br>2. Revisa que el contenedor del proxy corra (`docker ps`).<br>3. Reinicia la máquina si está bloqueada. |
| **Error 502/503 en sitios o panel** | El proxy (Caddy/Nginx) recibe el tráfico pero la API o webapp detrás de él están muertas o bloqueadas. | 1. Entra al servidor y mira logs: `docker logs api --tail 50`.<br>2. Revisa conexión a PostgreSQL.<br>3. Reinicia la API o webapp. |
| **Disparo CPU o RAM al 100%** | Un proceso quedó en un bucle infinito o hay un ataque de tráfico masivo. | 1. Usa `htop` o `docker stats` para ver quién consume.<br>2. Revisa los logs de Caddy para ver si un IP específico inunda de peticiones. |
| **Alerta "Disco al 90%"** | Contenedores viejos, logs de Docker o la base de datos están devorando el volumen. | 1. Corre `df -h` para confirmar.<br>2. Limpia basura de Docker: `docker system prune -a --volumes`. |
| **Sitio de cliente dice "No seguro" (SSL falló)** | El proxy no emitió el certificado On-Demand para el dominio de un cliente. | 1. Revisa los logs de Caddy.<br>2. Asegúrate de que el DNS del cliente apunte correctamente al `PLATFORM_SITE_TARGET`. |

## 4. Registro de Errores (Logs)

La API captura los errores no controlados (errores de código, fallos de conexión) y los imprime en la salida estándar (`stdout`/`stderr`) con el prefijo `[UnhandledError]`. El registro incluye la ruta afectada, el método HTTP, el cliente (`tenantId`) y la traza del error, omitiendo deliberadamente datos sensibles (PII o secretos).

**Cómo conectarlo a un servicio externo (ej. Datadog, Sentry, AWS CloudWatch):**
No es necesario instalar un agente pesado dentro de la API. Basta con recolectar la salida estándar del contenedor Docker.
Por ejemplo, puedes usar el driver de log de Docker para enviarlo directo a AWS CloudWatch:
```bash
# Ejemplo en docker-compose.yml:
logging:
  driver: awslogs
  options:
    awslogs-region: us-east-1
    awslogs-group: web-builder-api
```
O usar un recolector como Promtail/Filebeat que lea los archivos JSON de Docker y envíe solo las líneas que contienen `[UnhandledError]` a tu sistema de alertas, donde podrás filtrar por cliente o ruta.
