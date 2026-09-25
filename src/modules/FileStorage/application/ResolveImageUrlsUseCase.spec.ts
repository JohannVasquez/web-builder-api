/* eslint-disable boundaries/dependencies, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/explicit-function-return-type */
import { ResolveImageUrlsUseCase } from './ResolveImageUrlsUseCase';
import type { StorageProvider } from '../domain/StorageProvider';
import {
  HttpCatalogProvider,
  CatalogConfig,
} from '../../Catalog/infrastructure/HttpCatalogProvider';

describe('ResolveImageUrlsUseCase', () => {
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

  it('replaces a top-level imageUrl key with a presigned url', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      title: 'Hola',
      imageUrl: '11111111-1111-1111-1111-111111111111.svg',
    });

    expect(result).toEqual({
      title: 'Hola',
      imageUrl: 'http://cdn.test/11111111-1111-1111-1111-111111111111.svg?signed=1',
    });
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111.svg',
    );
  });

  it('resolves imageUrl nested inside arrays (Features.items[].imageUrl)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      items: [
        { title: 'A', imageUrl: '22222222-2222-2222-2222-222222222222.png' },
        { title: 'B', icon: 'zap' },
      ],
    });

    expect(result).toEqual({
      items: [
        {
          title: 'A',
          imageUrl: 'http://cdn.test/22222222-2222-2222-2222-222222222222.png?signed=1',
        },
        { title: 'B', icon: 'zap' },
      ],
    });
  });

  it('resolves every key inside an images array (Hero carousel)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      title: 'Hero',
      images: [
        '33333333-3333-3333-3333-333333333333.svg',
        '44444444-4444-4444-4444-444444444444.svg',
        'https://example.com/external.svg',
      ],
    });

    expect(result).toEqual({
      title: 'Hero',
      images: [
        'http://cdn.test/33333333-3333-3333-3333-333333333333.svg?signed=1',
        'http://cdn.test/44444444-4444-4444-4444-444444444444.svg?signed=1',
        'https://example.com/external.svg',
      ],
    });
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith(
      '33333333-3333-3333-3333-333333333333.svg',
    );
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith(
      '44444444-4444-4444-4444-444444444444.svg',
    );
  });

  it('resolves backgroundImageUrl on any section type, not just Hero', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      title: 'Sectores',
      backgroundImageUrl: '55555555-5555-5555-5555-555555555555.svg',
      backgroundOverlayColor: 'rgba(0,0,0,0.5)',
    });

    expect(result).toEqual({
      title: 'Sectores',
      backgroundImageUrl:
        'http://cdn.test/55555555-5555-5555-5555-555555555555.svg?signed=1',
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

  it('resolves image inside Gallery items (images[].url)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      images: [
        { url: '11111111-1111-1111-1111-111111111111.png', alt: 'A', caption: 'Capt A' },
      ],
    });

    expect(result).toEqual({
      images: [
        {
          url: 'http://cdn.test/11111111-1111-1111-1111-111111111111.png?signed=1',
          alt: 'A',
          caption: 'Capt A',
        },
      ],
    });
  });

  it('resolves image inside Team members (members[].photoUrl)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      members: [{ name: 'John', photoUrl: '22222222-2222-2222-2222-222222222222.jpg' }],
    });

    expect(result).toEqual({
      members: [
        {
          name: 'John',
          photoUrl: 'http://cdn.test/22222222-2222-2222-2222-222222222222.jpg?signed=1',
        },
      ],
    });
  });

  it('resolves image inside Brand Logos (logos[].url)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      logos: [{ name: 'Acme', url: '33333333-3333-3333-3333-333333333333.svg' }],
    });

    expect(result).toEqual({
      logos: [
        {
          name: 'Acme',
          url: 'http://cdn.test/33333333-3333-3333-3333-333333333333.svg?signed=1',
        },
      ],
    });
  });

  it('resolves Before & After images (beforeUrl, afterUrl)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      beforeUrl: '44444444-4444-4444-4444-444444444444.jpg',
      afterUrl: '55555555-5555-5555-5555-555555555555.jpg',
    });

    expect(result).toEqual({
      beforeUrl: 'http://cdn.test/44444444-4444-4444-4444-444444444444.jpg?signed=1',
      afterUrl: 'http://cdn.test/55555555-5555-5555-5555-555555555555.jpg?signed=1',
    });
  });

  it('resolves Video poster image (posterUrl)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      videoUrl: 'https://youtube.com/watch?v=123',
      posterUrl: '66666666-6666-6666-6666-666666666666.jpg',
    });

    expect(result).toEqual({
      videoUrl: 'https://youtube.com/watch?v=123',
      posterUrl: 'http://cdn.test/66666666-6666-6666-6666-666666666666.jpg?signed=1',
    });
  });

  it('resolves image inside Reviews (reviews[].avatarUrl)', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new ResolveImageUrlsUseCase(storageProvider);

    const result = await useCase.execute({
      reviews: [
        { author: 'Jane', avatarUrl: '77777777-7777-7777-7777-777777777777.png' },
      ],
    });

    expect(result).toEqual({
      reviews: [
        {
          author: 'Jane',
          avatarUrl: 'http://cdn.test/77777777-7777-7777-7777-777777777777.png?signed=1',
        },
      ],
    });
  });

  it('recorre el catálogo y cubre los campos de imagen', async () => {
      const config = new CatalogConfig('http://localhost:3100/api/catalog');
      // Usamos el fetchFn real para que intente pegarle al frontend si está vivo
      const catalogProvider = new HttpCatalogProvider(config);
      const catalog = (await catalogProvider.get()) as {
        unavailable?: boolean;
        blocks?: { type: string; schema?: any }[];
      };

      if (catalog.unavailable || !catalog.blocks) {
        console.warn('Frontend no disponible; se omite test de catálogo');
        return;
      }

      const storageProvider = buildStorageProvider();
      const useCase = new ResolveImageUrlsUseCase(storageProvider);

      const dummyKey = '99999999-9999-9999-9999-999999999999.jpg';

      for (const block of catalog.blocks) {
        if (!block.schema) continue;

        const props: Record<string, any> = {};
        const imageKeysEncontradas: string[] = [];

        const recurse = (schema: any, obj: any, path: string[]) => {
          if (!schema || schema.type !== 'object' || !schema.properties) return;
          for (const [key, value] of Object.entries<any>(schema.properties)) {
            const lowerKey = key.toLowerCase();
            if (
              lowerKey.includes('url') ||
              lowerKey.includes('image') ||
              lowerKey.includes('photo') ||
              lowerKey.includes('avatar') ||
              lowerKey.includes('poster') ||
              lowerKey.includes('logo') ||
              (value.format && value.format === 'image-key')
            ) {
              obj[key] = dummyKey;
              imageKeysEncontradas.push(key);
            } else if (value.type === 'object') {
              obj[key] = {};
              recurse(value, obj[key], [...path, key]);
            } else if (
              value.type === 'array' &&
              value.items &&
              value.items.type === 'object'
            ) {
              obj[key] = [{}];
              recurse(value.items, obj[key][0], [...path, key, '[]']);
            }
          }
        };

        recurse(block.schema, props, []);

        if (imageKeysEncontradas.length > 0) {
          const result = await useCase.execute(props);
          const resolvedStr = JSON.stringify(result);
          for (const _ of imageKeysEncontradas) {
            expect(resolvedStr).toContain('signed=1');
          }
        }
      }
    });
  });
