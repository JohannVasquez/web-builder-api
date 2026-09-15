import { StorageProvider } from '../../FileStorage/domain/StorageProvider';
import type { Brand, BrandAssets } from '../domain/BrandSchema';

export interface ResolvedBrand extends Omit<Brand, 'assets'> {
  readonly assets: BrandAssets;
}

const ABSOLUTE_URL_PATTERN = /^https?:\/\//;

// Cambia las `keys` guardadas por URLs firmadas frescas, como hace Page con sus imágenes.
export class ResolveBrandAssetsUseCase {
  constructor(private readonly storageProvider: StorageProvider) {}

  public async execute(brand: Brand): Promise<ResolvedBrand> {
    const entries = await Promise.all(
      Object.entries(brand.assets).map(
        async ([name, key]): Promise<[string, string | undefined]> => [
          name,
          await this.resolveKey(key),
        ],
      ),
    );
    return { ...brand, assets: Object.fromEntries(entries) };
  }

  private async resolveKey(key: string | undefined): Promise<string | undefined> {
    if (key === undefined || key === '' || ABSOLUTE_URL_PATTERN.test(key)) {
      return key;
    }
    return this.storageProvider.getPresignedUrl(key);
  }
}
