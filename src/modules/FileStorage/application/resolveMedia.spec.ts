import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { StorageProvider } from '../domain/StorageProvider';
import { ResolveMediaUseCase } from './ResolveMediaUseCase';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';
const KEY = 'c0ffee00-0000-4000-8000-000000000001.jpg';

const buildAssets = (owned: boolean): StorageAssetRepository =>
  ({
    findKey: (): Promise<{ key: string } | null> =>
      Promise.resolve(owned ? { key: KEY } : null),
  }) as unknown as StorageAssetRepository;

const buildStorage = (): StorageProvider & { readonly signed: string[] } => {
  const signed: string[] = [];
  return {
    signed,
    getPresignedUrl: (key: string): Promise<string> => {
      signed.push(key);
      return Promise.resolve(`https://bucket.example.com/${key}?firma=abc`);
    },
  } as unknown as StorageProvider & { readonly signed: string[] };
};

describe('ResolveMediaUseCase', () => {
  it('firma la clave cuando es de ese cliente', async () => {
    const storage = buildStorage();

    const url = await new ResolveMediaUseCase(buildAssets(true), storage).execute(
      TENANT,
      KEY,
    );

    expect(url).toContain('firma=abc');
    expect(storage.signed).toEqual([KEY]);
  });

  it('una clave de otro cliente no se firma', async () => {
    // Sin esta comprobación, la ruta firmaría cualquier objeto del bucket a quien acertara
    // una clave, y las de todos los clientes viven en el mismo.
    const storage = buildStorage();

    const url = await new ResolveMediaUseCase(buildAssets(false), storage).execute(
      TENANT,
      KEY,
    );

    expect(url).toBeNull();
    expect(storage.signed).toHaveLength(0);
  });
});
