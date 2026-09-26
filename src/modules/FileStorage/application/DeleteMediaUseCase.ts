import {
  StorageAssetRepository,
  type AssetUsage,
} from '../domain/StorageAssetRepository';
import { StorageProvider } from '../domain/StorageProvider';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { BadRequestError } from '@/shared/domain/BadRequestError';

export class DeleteMediaUseCase {
  constructor(
    private readonly repository: StorageAssetRepository,
    private readonly storageProvider: StorageProvider,
  ) {}

  // `force` es la confirmación de quien ya vio dónde estaba usada la imagen. Sin ella,
  // borrar algo en uso deja huecos en páginas publicadas sin que nadie se entere.
  public async execute(
    tenantId: string,
    key: string,
    force: boolean,
  ): Promise<{ usage: readonly AssetUsage[] }> {
    const asset = await this.repository.findKey(tenantId, key);
    if (asset === null) {
      throw new NotFoundError('Esa imagen no está en la biblioteca de este cliente.');
    }

    const usage = await this.repository.findUsage(tenantId, key);
    if (usage.length > 0 && !force) {
      throw new BadRequestError(
        `Esta imagen se está usando en: ${usage.map((item) => item.label).join(', ')}. Vuelve a intentarlo confirmando que quieres borrarla igual.`,
      );
    }

    await this.storageProvider.delete(key);
    await this.repository.remove(key);
    return { usage };
  }
}
