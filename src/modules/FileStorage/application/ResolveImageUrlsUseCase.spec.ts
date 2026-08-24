import { ResolveImageUrlsUseCase } from './ResolveImageUrlsUseCase';
import type { StorageProvider } from '../domain/StorageProvider';

describe('ResolveImageUrlsUseCase', () => {
  const buildStorageProvider = (): jest.Mocked<StorageProvider> => ({
    upload: jest.fn(),
    delete: jest.fn(),
    getPresignedUrl: jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`http://cdn.test/${key}?signed=1`),
      ),
  });

  it('replaces a top-level imageUrl key with a presigned url', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      title: 'Hola',
      imageUrl: 'seed-hero-home.svg',
    });

    expect(result).toEqual({
      title: 'Hola',
      imageUrl: 'http://cdn.test/seed-hero-home.svg?signed=1',
    });
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith('seed-hero-home.svg');
  });

  it('resolves imageUrl nested inside arrays (Features.items[].imageUrl)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      items: [
        { title: 'A', imageUrl: 'a.png' },
        { title: 'B', icon: 'zap' },
      ],
    });

    expect(result).toEqual({
      items: [
        { title: 'A', imageUrl: 'http://cdn.test/a.png?signed=1' },
        { title: 'B', icon: 'zap' },
      ],
    });
  });

  it('resolves every key inside an images array (Hero carousel)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      title: 'Hero',
      images: ['a.svg', 'b.svg', 'https://example.com/external.svg'],
    });

    expect(result).toEqual({
      title: 'Hero',
      images: [
        'http://cdn.test/a.svg?signed=1',
        'http://cdn.test/b.svg?signed=1',
        'https://example.com/external.svg',
      ],
    });
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith('a.svg');
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith('b.svg');
  });

  it('resolves backgroundImageUrl on any section type, not just Hero', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      title: 'Sectores',
      backgroundImageUrl: 'seed-texture.svg',
      backgroundOverlayColor: 'rgba(0,0,0,0.5)',
    });

    expect(result).toEqual({
      title: 'Sectores',
      backgroundImageUrl: 'http://cdn.test/seed-texture.svg?signed=1',
      backgroundOverlayColor: 'rgba(0,0,0,0.5)',
    });
  });

  it('leaves absolute http(s) URLs untouched', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      imageUrl: 'https://example.com/external.png',
    });

    expect(result).toEqual({ imageUrl: 'https://example.com/external.png' });
    expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('leaves props without imageUrl untouched', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({ title: 'Sin imagen', subtitle: 'ok' });

    expect(result).toEqual({ title: 'Sin imagen', subtitle: 'ok' });
    expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
  });
});
