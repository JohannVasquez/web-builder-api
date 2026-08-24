import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import type {
  StorageAssetPrimitives,
  StorageAssetRepository,
} from '../domain/StorageAssetRepository';

export class PrismaStorageAssetRepository implements StorageAssetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async register(asset: StorageAssetPrimitives): Promise<void> {
    await this.prisma.storageAsset.upsert({
      where: { key: asset.key },
      update: { mimeType: asset.mimeType, size: asset.size },
      create: asset,
    });
  }

  public async remove(key: string): Promise<void> {
    await this.prisma.storageAsset.deleteMany({ where: { key } });
  }
}
