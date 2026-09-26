import {
  StorageAssetRepository,
  type MediaAsset,
} from '../domain/StorageAssetRepository';
import { StorageProvider } from '../domain/StorageProvider';

export interface MediaAssetWithUrl extends MediaAsset {
  readonly url: string;
}

export class ListMediaUseCase {
  constructor(
    private readonly repository: StorageAssetRepository,
    private readonly storageProvider: StorageProvider,
  ) {}

  public async execute(tenantId: string, search: string): Promise<MediaAssetWithUrl[]> {
    const assets = await this.repository.findByTenant(tenantId, search);
    // El bucket es privado: cada lectura firma su propia URL, igual que al armar una página.
    return Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        url: await this.storageProvider.getPresignedUrl(asset.key),
      })),
    );
  }
}
