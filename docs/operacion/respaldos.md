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

Automatiza estos comandos en una tarea programada (cron) que corra a diario en el servidor.

**Base de Datos (pg_dump):**

```bash
FECHA=$(date +%F)
# Saca el respaldo en formato personalizado comprimido
docker exec web-builder-db pg_dump -U webbuilder -F c -d web_builder -f /tmp/db_backup_$FECHA.dump

# Extrae el archivo al host
docker cp web-builder-db:/tmp/db_backup_$FECHA.dump ./respaldos/
docker exec web-builder-db rm /tmp/db_backup_$FECHA.dump

# Envíalo a tu almacenamiento remoto seguro (usando rclone, aws cli o mc)
# Ejemplo con mc: mc cp ./respaldos/db_backup_$FECHA.dump remote_storage/backups_db/
```

**Bucket S3:**

Sincroniza el bucket usando utilidades S3 (como `mc mirror` o `aws s3 sync`). Se recomienda no borrar en destino lo que se haya borrado en origen, como salvaguarda ante un borrado accidental.

```bash
# Usando cliente MinIO (mc)
mc mirror s3_prod/web-builder-assets s3_backup/assets_backup
```

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
