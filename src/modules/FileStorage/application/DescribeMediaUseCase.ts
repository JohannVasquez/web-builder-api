import {
  StorageAssetRepository,
  type MediaAsset,
} from '../domain/StorageAssetRepository';
import { NotFoundError } from '@/shared/domain/NotFoundError';

// El texto alternativo se edita aparte de la subida: casi nunca se escribe en el momento,
// y una imagen sin él es invisible para un lector de pantalla (SPEC 6.3).
export class DescribeMediaUseCase {
  constructor(private readonly repository: StorageAssetRepository) {}

  public async execute(tenantId: string, key: string, alt: string): Promise<MediaAsset> {
    const updated = await this.repository.updateAlt(tenantId, key, alt);
    if (updated === null) {
      throw new NotFoundError('Esa imagen no está en la biblioteca de este cliente.');
    }
    return updated;
  }
}
