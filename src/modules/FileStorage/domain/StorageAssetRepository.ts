export interface StorageAssetPrimitives {
  readonly key: string;
  readonly mimeType: string;
  readonly size: number;
  readonly tenantId?: string | null;
  readonly originalName?: string | null;
  readonly alt?: string | null;
}

export interface MediaAsset {
  readonly key: string;
  readonly mimeType: string;
  readonly size: number;
  readonly originalName: string | null;
  readonly alt: string | null;
  readonly createdAt: string;
}

// Dónde está usada una imagen, para poder avisar antes de borrarla.
export interface AssetUsage {
  readonly kind: 'page' | 'brand' | 'settings';
  readonly label: string;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class StorageAssetRepository {
  // Upsert por `key`: subir la misma key dos veces actualiza el registro.
  public abstract register(asset: StorageAssetPrimitives): Promise<void>;
  // Idempotente, igual que `StorageProvider.delete`.
  public abstract remove(key: string): Promise<void>;
  public abstract findByTenant(tenantId: string, search: string): Promise<MediaAsset[]>;
  public abstract findKey(tenantId: string, key: string): Promise<MediaAsset | null>;
  public abstract updateAlt(
    tenantId: string,
    key: string,
    alt: string,
  ): Promise<MediaAsset | null>;
  public abstract findUsage(tenantId: string, key: string): Promise<AssetUsage[]>;
}
