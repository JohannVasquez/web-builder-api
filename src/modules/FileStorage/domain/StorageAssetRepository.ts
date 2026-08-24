export interface StorageAssetPrimitives {
  readonly key: string;
  readonly mimeType: string;
  readonly size: number;
}

/**
 * Registro en base de datos de cada archivo subido al bucket. Es lo que
 * permite decir "este archivo existe y está gestionado por nosotros" sin
 * consultar el bucket, y es la base de un futuro listado/CRUD de archivos en
 * el panel de administración.
 *
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class StorageAssetRepository {
  /** Upsert por `key`: subir la misma key dos veces actualiza el registro. */
  public abstract register(asset: StorageAssetPrimitives): Promise<void>;
  /** Idempotente, igual que `StorageProvider.delete` (AC3.2). */
  public abstract remove(key: string): Promise<void>;
}
