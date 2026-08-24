import { DeleteFileUseCase } from './DeleteFileUseCase';
import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { StorageProvider } from '../domain/StorageProvider';

describe('DeleteFileUseCase', () => {
  const buildStorageProvider = (): jest.Mocked<StorageProvider> => ({
    upload: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest.fn(),
  });

  const buildAssetRepository = (): jest.Mocked<StorageAssetRepository> => ({
    register: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  it('delegates the deletion to the storage provider and removes the asset record', async () => {
    const storageProvider = buildStorageProvider();
    const assetRepository = buildAssetRepository();
    const useCase = new DeleteFileUseCase(storageProvider, assetRepository);

    await useCase.execute('5f0c2f5e-0000-4000-8000-000000000000.png');

    expect(storageProvider.delete).toHaveBeenCalledTimes(1);
    expect(storageProvider.delete).toHaveBeenCalledWith(
      '5f0c2f5e-0000-4000-8000-000000000000.png',
    );
    expect(assetRepository.remove).toHaveBeenCalledWith(
      '5f0c2f5e-0000-4000-8000-000000000000.png',
    );
  });

  it('propagates errors from the storage provider', async () => {
    const storageProvider = buildStorageProvider();
    storageProvider.delete.mockRejectedValue(new Error('bucket down'));
    const useCase = new DeleteFileUseCase(storageProvider, buildAssetRepository());

    await expect(
      useCase.execute('5f0c2f5e-0000-4000-8000-000000000000.png'),
    ).rejects.toThrow('bucket down');
  });
});
