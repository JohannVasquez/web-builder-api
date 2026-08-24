export interface FileData {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly size: number;
}

export interface UploadResult {
  readonly key: string;
}

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 * La capa `application` solo depende de esta interfaz, nunca del SDK
 * concreto de storage (AC4.2).
 *
 * El bucket es privado (MinIO y R2 hablan ambos S3, así que la misma firma
 * sirve para los dos): no hay URLs públicas. Todo acceso de lectura pasa por
 * `getPresignedUrl`, que firma una URL de vida corta en el momento en que se
 * necesita — nunca se guarda una URL en la base de datos, solo la `key`.
 */
export abstract class StorageProvider {
  public abstract upload(file: FileData, key: string): Promise<UploadResult>;
  public abstract delete(key: string): Promise<void>;
  public abstract getPresignedUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<string>;
}
