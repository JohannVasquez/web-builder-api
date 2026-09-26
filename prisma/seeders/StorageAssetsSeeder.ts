import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type { Seeder } from './Seeder';

/**
 * Assets del template (heros e ilustraciones). Se suben al bucket del módulo
 * FileStorage con keys fijas y quedan registrados en `storage_assets`, igual
 * que haría el futuro panel admin con el uploader. El bucket es privado: lo
 * que se guarda en `props` es la `key`, nunca una URL — el frontend recibe
 * una URL firmada fresca en cada lectura de página (ver
 * `ResolveImageUrlsUseCase` en la API). Mismos defaults que EnvConfig, para
 * funcionar contra el MinIO local.
 */
const SEED_ASSET_FILES = {
  heroHome: 'hero-home.svg',
  heroNosotros: 'hero-nosotros.svg',
  heroServicios: 'hero-servicios.svg',
  heroContacto: 'hero-contacto.svg',
  equipo: 'equipo.svg',
  electricaHeroHome: 'hero-electrica-home.svg',
  electricaHeroNosotros: 'hero-electrica-nosotros.svg',
  electricaHeroServicios: 'hero-electrica-servicios.svg',
  electricaHeroContacto: 'hero-electrica-contacto.svg',
  electricaEquipo: 'electrica-equipo.svg',
} as const;

const SVG_MIME_TYPE = 'image/svg+xml';

export type SeedAssetKeys = Record<keyof typeof SEED_ASSET_FILES, string>;

export class StorageAssetsSeeder implements Seeder<PrismaClient, SeedAssetKeys | null> {
  public async execute(prisma: PrismaClient): Promise<SeedAssetKeys | null> {
    const bucket = process.env.STORAGE_BUCKET ?? 'web-builder-assets';
    const client = new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.STORAGE_REGION ?? 'auto',
      forcePathStyle: (process.env.STORAGE_DRIVER ?? 'minio') === 'minio',
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'minioadmin',
      },
    });

    try {
      await this.ensureBucket(client, bucket);

      const keys: Partial<SeedAssetKeys> = {};
      for (const [name, fileName] of Object.entries(SEED_ASSET_FILES)) {
        const key = `seed-${fileName}`;
        const body = await readFile(path.join(__dirname, '..', 'assets', fileName));
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: SVG_MIME_TYPE,
          }),
        );
        await prisma.storageAsset.upsert({
          where: { key },
          update: { mimeType: SVG_MIME_TYPE, size: body.byteLength },
          create: { key, mimeType: SVG_MIME_TYPE, size: body.byteLength },
        });
        keys[name as keyof typeof SEED_ASSET_FILES] = key;
      }
      return keys as SeedAssetKeys;
    } catch (error) {
      console.warn(
        '[seed] Storage no disponible; se siembra el template sin imágenes.',
        error instanceof Error ? error.message : error,
      );
      return null;
    } finally {
      client.destroy();
    }
  }

  private async ensureBucket(client: S3Client, bucket: string): Promise<void> {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
        throw error;
      }
    }
  }
}
