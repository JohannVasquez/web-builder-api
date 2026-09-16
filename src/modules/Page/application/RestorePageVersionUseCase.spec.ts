import { RestorePageVersionUseCase } from './RestorePageVersionUseCase';
import { Page, PageSection } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageVersionRepository } from '../domain/PageVersionRepository';
import { NotFoundError } from '../../../shared/domain/NotFoundError';

describe('RestorePageVersionUseCase', () => {
  const actor = { type: 'admin' as const, id: 1, name: 'Admin' };
  const snapshot = {
    title: 'Inicio',
    description: null,
    sections: [{ type: 'Hero', position: 1, props: { title: 'Antes' }, anchor: null }],
  };
  const restored = new Page(
    'home',
    'Inicio',
    null,
    [new PageSection('Hero', 1, { title: 'Antes' }, null, 30)],
    5,
    true,
  );

  const buildVersions = (found = snapshot): jest.Mocked<PageVersionRepository> =>
    ({
      findSnapshot: jest.fn().mockResolvedValue(found),
      record: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<PageVersionRepository>;

  const buildPages = (): jest.Mocked<PageRepository> =>
    ({
      replaceDraft: jest.fn().mockResolvedValue(restored),
    }) as unknown as jest.Mocked<PageRepository>;

  it('reemplaza el borrador con la foto pedida', async () => {
    const pages = buildPages();

    await new RestorePageVersionUseCase(pages, buildVersions()).execute(9, 5, 3, actor);

    expect(pages.replaceDraft).toHaveBeenCalledWith(9, 5, snapshot);
  });

  it('restaurar crea una versión nueva: deshacer un deshacer tiene que ser posible', async () => {
    const versions = buildVersions();

    await new RestorePageVersionUseCase(buildPages(), versions).execute(9, 5, 3, actor);

    expect(versions.record).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ title: 'Inicio' }),
      expect.stringContaining('Restauró'),
      actor,
    );
  });

  it('no publica: restaurar toca el borrador y publicar sigue siendo aparte', async () => {
    const versions = buildVersions();

    await new RestorePageVersionUseCase(buildPages(), versions).execute(9, 5, 3, actor);

    expect(versions.markPublished).toBeUndefined();
  });

  it('una versión de otro cliente no existe para este', async () => {
    const versions = buildVersions();
    versions.findSnapshot.mockResolvedValue(null);

    await expect(
      new RestorePageVersionUseCase(buildPages(), versions).execute(9, 5, 999, actor),
    ).rejects.toThrow(NotFoundError);
  });
});
