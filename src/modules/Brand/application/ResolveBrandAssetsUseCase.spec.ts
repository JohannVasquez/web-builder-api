import { ResolveBrandAssetsUseCase } from './ResolveBrandAssetsUseCase';
import type { StorageProvider } from '@/modules/FileStorage/domain/StorageProvider';
import { BrandSchema, type Brand } from '../domain/BrandSchema';

describe('ResolveBrandAssetsUseCase', () => {
  const buildStorageProvider = (): jest.Mocked<StorageProvider> => ({
    upload: jest.fn(),
    delete: jest.fn(),
    getPresignedUrl: jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`http://cdn.test/${key}?signed=1`),
      ),
    healthCheck: jest.fn(),
  });

  const buildBrand = (overrides: Partial<Brand> = {}): Brand =>
    BrandSchema.parse({ ...overrides });

  it('signs every key with storageProvider.getPresignedUrl', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveBrandAssetsUseCase(storageProvider);
    const brand = buildBrand({
      assets: { logoLight: 'logo-light.svg', favicon: 'favicon.png' },
    });

    const result = await useCase.execute(brand);

    expect(result.assets).toEqual({
      logoLight: 'http://cdn.test/logo-light.svg?signed=1',
      favicon: 'http://cdn.test/favicon.png?signed=1',
    });
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith('logo-light.svg');
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith('favicon.png');
  });

  it('leaves an already absolute URL untouched', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveBrandAssetsUseCase(storageProvider);
    const brand = buildBrand({ assets: { ogImage: 'https://cdn.example.com/og.png' } });

    const result = await useCase.execute(brand);

    expect(result.assets).toEqual({ ogImage: 'https://cdn.example.com/og.png' });
    expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('leaves an empty string and absent fields untouched, without calling getPresignedUrl', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveBrandAssetsUseCase(storageProvider);
    const brand = buildBrand({ assets: { logoDark: '' } });

    const result = await useCase.execute(brand);

    expect(result.assets).toEqual({ logoDark: '' });
    expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('does not touch palette, typography, colorMode or visualStyle', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveBrandAssetsUseCase(storageProvider);
    const brand = buildBrand({
      palette: { primary: '#1d4ed8' },
      typography: { pairing: 'oswald-lato', scale: 'compact' },
      colorMode: 'dark',
      visualStyle: 'neo-brutalism',
      assets: {},
    });

    const result = await useCase.execute(brand);

    expect(result.palette).toEqual(brand.palette);
    expect(result.typography).toEqual(brand.typography);
    expect(result.colorMode).toBe(brand.colorMode);
    expect(result.visualStyle).toBe(brand.visualStyle);
  });
});
