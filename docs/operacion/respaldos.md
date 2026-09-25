# Respaldos

**Para quién es:** Encargado de infraestructura.
**Cuándo leerlo:** Para configurar las rutinas de respaldo o cuando haya ocurrido un desastre y toque restaurar datos.

Los respaldos protegen a la plataforma contra caídas de servidor, errores humanos y pérdida accidental de información comercial y personal.

## 1. Política de Respaldo

- **Qué se respalda:**
  1. La base de datos de PostgreSQL (datos de las tiendas, usuarios, pedidos, configuración).
  2. El bucket S3 (`web-builder-assets`, con las imágenes y recursos estáticos subidos).
- **Frecuencia:** Una vez al día. En el peor escenario de desastre, la pérdida máxima de datos sería el trabajo del último día.
- **Dónde se guarda:** Estrictamente **fuera del servidor que corre la plataforma**, idealmente en otro centro de datos para tolerar caídas de zona.
- **Retención:** Se conservan 30 días continuos.

## 2. Procedimiento de extracción

Automatiza la ejecución del script de respaldo en una tarea programada (cron) que corra a diario en el servidor. Este script lee las mismas variables de entorno que la API (incluyendo base de datos y almacenamiento) y extrae tanto el `dump` de PostgreSQL como los archivos del bucket S3.

```bash
# Entra al directorio del proyecto API
cd /ruta/a/web-builder-api

# Corre el script de respaldo
pnpm backup
```

El script dejará en la carpeta actual un archivo `backup-YYYY-MM-DD.dump` y una carpeta `backup-YYYY-MM-DD-assets/` con todos los recursos subidos.

Asegúrate de mover estos archivos a tu almacenamiento remoto seguro todos los días, y configurar la limpieza de los más antiguos.

## 3. Restauración paso a paso

Si hubo corrupción de datos o el servidor se perdió:

1. Detén la API para evitar escrituras conflictivas (`docker compose stop api`).
2. Levanta o vacía tu base de datos PostgreSQL.
3. Descarga al servidor el archivo `.dump` de la fecha deseada.
4. Restaura con `pg_restore`:
   ```bash
   docker cp ./db_backup_2026-09-25.dump web-builder-db:/tmp/
   docker exec web-builder-db pg_restore -U webbuilder -d web_builder --clean --if-exists /tmp/db_backup_2026-09-25.dump
   docker exec web-builder-db rm /tmp/db_backup_2026-09-25.dump
   ```
5. Restaura el bucket S3 invirtiendo la sincronización:
   ```bash
   mc mirror s3_backup/assets_backup s3_prod/web-builder-assets
   ```
6. Vuelve a encender la API y verifica los logs.

## 4. Verificación de salud de los respaldos

Un respaldo que no funciona es inútil. Una vez al mes:
1. Extrae el `.dump` del día anterior.
2. Restáuralo en una base de datos local usando `pg_restore`.
3. Conecta el frontend/API locales a esa base y confirma visualmente que el panel carga y los últimos pedidos de clientes están ahí.
