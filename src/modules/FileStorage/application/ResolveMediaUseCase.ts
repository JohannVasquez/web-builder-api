import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { StorageProvider } from '../domain/StorageProvider';

/**
 * Cuánto dura la firma que se entrega. Más corta que la hora por omisión porque esta ruta
 * redirige: la firma se usa en el mismo momento, no se guarda en ningún lado.
 */
const SIGNATURE_SECONDS = 900;

export class ResolveMediaUseCase {
  constructor(
    private readonly assets: StorageAssetRepository,
    private readonly storage: StorageProvider,
  ) {}

  /**
   * `null` si la clave no existe o no es de ese cliente. La comprobación no es opcional: sin
   * ella, esta ruta firmaría cualquier objeto del bucket a quien acertara una clave, y las
   * claves de todos los clientes viven en el mismo.
   */
  public async execute(tenantId: string, key: string): Promise<string | null> {
    const asset = await this.assets.findKey(tenantId, key);
    if (asset === null) {
      return null;
    }
    return this.storage.getPresignedUrl(key, SIGNATURE_SECONDS);
  }
}
