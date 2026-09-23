import { ListMediaUseCase } from './ListMediaUseCase';
import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { StorageProvider } from '../domain/StorageProvider';

describe('ListMediaUseCase', () => {
  const asset = {
    key: 'a.png',
    mimeType: 'image/png',
    size: 10,
    originalName: 'a.png',
    alt: 'Una foto',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('firma una URL fresca para cada imagen: el bucket es privado', async () => {
    const repository = {
      findByTenant: jest.fn().mockResolvedValue([asset]),
    } as unknown as jest.Mocked<StorageAssetRepository>;
    const provider = {
      getPresignedUrl: jest.fn().mockResolvedValue('https://bucket/firmada'),
    } as unknown as jest.Mocked<StorageProvider>;

    const assets = await new ListMediaUseCase(repository, provider).execute(
      '018f6f1a-0000-7000-8000-000000000009',
      '',
    );

    expect(assets[0]?.url).toBe('https://bucket/firmada');
    expect(provider.getPresignedUrl).toHaveBeenCalledWith('a.png');
  });

  it('busca solo dentro del cliente pedido', async () => {
    const repository = {
      findByTenant: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<StorageAssetRepository>;
    const provider = {
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageProvider>;

    await new ListMediaUseCase(repository, provider).execute(
      '018f6f1a-0000-7000-8000-000000000009',
      'logo',
    );

    expect(repository.findByTenant).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000009',
      'logo',
    );
  });
});
