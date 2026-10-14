import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FileData, StorageProvider, UploadResult } from '../domain/StorageProvider';

// Debe superar con margen SITE_CACHE_TTL_SECONDS (1h, ver cacheTags.ts del
// webapp): una página cacheada puede servir esta URL durante toda esa hora
// (o más, si Next todavía no revalidó), y si la firma caduca antes la imagen
// se rompe hasta que alguien recargue. 7 días es el límite práctico de una
// URL S3 firmada con credenciales estáticas (no STS).
const DEFAULT_PRESIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Clase (no interface) para poder registrarse como token resoluble por diod
 * y ser inyectada explícitamente en el constructor del provider (ver
 * `withDependencies` en la raíz de composición).
 */
export class S3StorageConfig {
  constructor(
    public readonly endpoint: string,
    public readonly region: string,
    public readonly bucket: string,
    public readonly accessKey: string,
    public readonly secretKey: string,
    public readonly forcePathStyle: boolean,
  ) {}
}

/**
 * MinIO y Cloudflare R2 hablan ambos el protocolo S3, así que una sola
 * implementación parametrizada por entorno cubre los dos providers
 * (AC4.1/AC4.2). La única diferencia real es `forcePathStyle`, requerido
 * por MinIO (URLs `host/bucket/key` en vez de `bucket.host/key`).
 *
 * El bucket es privado en ambos entornos: no hay `publicUrl`. Toda lectura
 * pasa por `getPresignedUrl`, firmada contra el mismo endpoint S3 usado para
 * subir — en R2 ese es el endpoint `*.r2.cloudflarestorage.com`, alcanzable
 * públicamente, no el dominio custom/`pub-*.r2.dev` (ese es para objetos con
 * acceso público, que aquí no se usa).
 */
export class S3CompatibleStorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  public async upload(file: FileData, key: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
        ContentLength: file.size,
      }),
    );
    return { key };
  }

  public async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  public async getPresignedUrl(
    key: string,
    expiresInSeconds: number = DEFAULT_PRESIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.config.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  public async healthCheck(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
  }
}
