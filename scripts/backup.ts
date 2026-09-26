/**
 * Respalda la base de datos y el bucket de S3.
 *
 *   pnpm backup
 *
 * Se recomienda correr este script de forma programada (cron) y guardar los
 * archivos generados en una ubicación segura fuera del servidor.
 */
import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import { EnvConfig } from '@/shared/config/EnvConfig';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

const run = async (): Promise<void> => {
  const env = EnvConfig.load(process.env);
  const date = new Date().toISOString().split('T')[0];
  const dbFile = `backup-${date}.dump`;
  const bucketFolder = `backup-${date}-assets`;

  console.log(`Iniciando respaldo de la base de datos en ${dbFile}...`);
  try {
    const dbUrl = env.get('DATABASE_URL');
    execFileSync('pg_dump', ['-F', 'c', '-f', dbFile, dbUrl], { stdio: 'pipe' });
    console.log('Respaldo de base de datos completado.');
  } catch (error: unknown) {
    console.error('Fallo al respaldar la base de datos.');
    const err = error as Error & { stderr?: Buffer };
    const stderr = err.stderr ? err.stderr.toString() : '';
    // Evitar imprimir la URL de la base de datos que contiene las credenciales
    console.error(stderr.replace(env.get('DATABASE_URL'), '***'));
    process.exitCode = 1;
    return;
  }

  console.log(`Iniciando sincronización del bucket a ${bucketFolder}...`);
  try {
    await fs.mkdir(bucketFolder, { recursive: true });
    
    const s3 = new S3Client({
      endpoint: env.get('STORAGE_ENDPOINT'),
      region: env.get('STORAGE_REGION'),
      credentials: {
        accessKeyId: env.get('STORAGE_ACCESS_KEY'),
        secretAccessKey: env.get('STORAGE_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
    
    const bucket = env.get('STORAGE_BUCKET');
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    let count = 0;

    while (isTruncated) {
      const response: import('@aws-sdk/client-s3').ListObjectsV2CommandOutput = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
        })
      );
      const { Contents, IsTruncated, NextContinuationToken } = response;

      if (Contents) {
        for (const item of Contents) {
          if (!item.Key) continue;
          const targetPath = path.join(bucketFolder, item.Key);
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          
          const obj = await s3.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: item.Key,
            })
          );
          
          if (obj.Body) {
            const buf = await obj.Body.transformToByteArray();
            await fs.writeFile(targetPath, buf);
            count++;
          }
        }
      }
      isTruncated = IsTruncated ?? false;
      continuationToken = NextContinuationToken;
    }
    
    console.log(`Sincronización del bucket completada (${count} archivos).`);
  } catch (error: unknown) {
    console.error('Fallo al sincronizar el bucket:');
    // Si el error tiene mensajes con credenciales o el endpoint, limpiarlo si es necesario.
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

void run().catch((error: unknown) => {
  console.error('Error inesperado durante el respaldo:', error);
  process.exitCode = 1;
});
