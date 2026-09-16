import { DeleteMediaUseCase } from './DeleteMediaUseCase';
import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { StorageProvider } from '../domain/StorageProvider';
import { NotFoundError } from '../../../shared/domain/NotFoundError';
import { BadRequestError } from '../../../shared/domain/BadRequestError';

describe('DeleteMediaUseCase', () => {
  const asset = {
    key: 'a.png',
    mimeType: 'image/png',
    size: 10,
    originalName: 'a.png',
    alt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const buildRepository = (
    usage: { kind: 'page'; label: string }[] = [],
  ): jest.Mocked<StorageAssetRepository> =>
    ({
      findKey: jest.fn().mockResolvedValue(asset),
      findUsage: jest.fn().mockResolvedValue(usage),
      remove: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<StorageAssetRepository>;

  const buildProvider = (): jest.Mocked<StorageProvider> =>
    ({
      delete: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<StorageProvider>;

  it('borra una imagen que no está en uso', async () => {
    const repository = buildRepository();
    const provider = buildProvider();

    await new DeleteMediaUseCase(repository, provider).execute(9, 'a.png', false);

    expect(provider.delete).toHaveBeenCalledWith('a.png');
    expect(repository.remove).toHaveBeenCalledWith('a.png');
  });

  it('se niega a borrar una imagen en uso y dice dónde está', async () => {
    const repository = buildRepository([
      { kind: 'page', label: 'Página "Inicio" (/home)' },
    ]);
    const provider = buildProvider();

    await expect(
      new DeleteMediaUseCase(repository, provider).execute(9, 'a.png', false),
    ).rejects.toThrow(/Página "Inicio"/);
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it('la borra igual si quien la vio en uso lo confirma', async () => {
    const repository = buildRepository([
      { kind: 'page', label: 'Página "Inicio" (/home)' },
    ]);
    const provider = buildProvider();

    const result = await new DeleteMediaUseCase(repository, provider).execute(
      9,
      'a.png',
      true,
    );

    expect(provider.delete).toHaveBeenCalled();
    expect(result.usage).toHaveLength(1);
  });

  it('no alcanza la biblioteca de otro cliente', async () => {
    const repository = buildRepository();
    repository.findKey.mockResolvedValue(null);

    await expect(
      new DeleteMediaUseCase(repository, buildProvider()).execute(9, 'ajena.png', true),
    ).rejects.toThrow(NotFoundError);
  });

  it('el error de imagen en uso es de petición, no de servidor', async () => {
    const repository = buildRepository([{ kind: 'page', label: 'Inicio' }]);

    await expect(
      new DeleteMediaUseCase(repository, buildProvider()).execute(9, 'a.png', false),
    ).rejects.toThrow(BadRequestError);
  });
});
