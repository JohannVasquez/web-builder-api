# Borrado de Datos Vencidos

**Para quién es:** Encargado de privacidad/cumplimiento e infraestructura.
**Cuándo leerlo:** Al configurar el servidor por primera vez, o durante una auditoría legal para demostrar que la plataforma no retiene información eternamente.

Para cumplir con la Ley 21.719 de protección de datos, la plataforma no guarda datos personales más allá de lo necesario.

## 1. Qué se borra y con qué plazos

La lógica de retención vive en el módulo `DataRetention`. El proceso usa plazos definidos en las variables de entorno. Si no se definen, usa estos valores por omisión:

- **Mensajes de contacto (`RETENTION_CONTACT_DAYS`):** Se borran físicamente a los **365 días** de su creación.
- **Suscriptores dados de baja (`RETENTION_SUBSCRIBER_DAYS`):** Se borran a los **365 días** de haberse dado de baja. (Los suscriptores activos no caducan).
- **Pedidos (`RETENTION_ORDER_DAYS`):** Conservan su información por al menos **2190 días (6 años)** debido a exigencias tributarias y de garantía. Pasado el plazo, el pedido no se borra (para mantener estadísticas), pero **se anonimiza**: el nombre cambia a "Cliente anonimizado" y sus datos de contacto/dirección se destruyen. El código no permite configurar un plazo inferior a este mínimo legal.

*Nota: Los registros de consentimiento no se borran por paso del tiempo, ya que son la única prueba de que un tratamiento pasado estuvo autorizado.*

## 2. Cómo se ejecuta a mano hoy

El script es idempotente: una segunda pasada no altera nada nuevo. Puedes lanzarlo de forma segura con:

```bash
# Dentro de la carpeta de la API
pnpm tsx scripts/purge-expired-data.ts
```

El script imprime un JSON por pantalla detallando cuántos registros borró o anonimizó en esa pasada.

## 3. Programación diaria en producción

El script está pensado para correr solo. Configúralo en el administrador de tareas de tu servidor de producción (ej. `cron` en Linux) para que corra a diario de madrugada y guarde el comprobante:

```bash
# Ejemplo en crontab (crontab -e) a las 03:00 AM todos los días
0 3 * * * cd /ruta/al/repo/api && pnpm tsx scripts/purge-expired-data.ts >> /var/log/wb-retencion.log 2>&1
```

## 4. Comprobación mensual (Auditoría)

Para asegurar que la plataforma está cumpliendo:
1. Después de un mes en producción, entra al servidor y abre el archivo `/var/log/wb-retencion.log`.
2. Tienes que ver un bloque JSON por cada día del mes (ej. `{"at":"2026-09...","proceso":"retencion-datos","contactMessagesDeleted":0...}`).
3. Si el log no existe, tiene errores de conexión a la base de datos, o faltan días, el borrado no está corriendo y la plataforma está acumulando datos ilegalmente.
