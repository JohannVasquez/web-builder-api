import { ListPublishedPagesUseCase } from './ListPublishedPagesUseCase';
import { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

describe('ListPublishedPagesUseCase', () => {
  const buildRepository = (pages: Page[]): jest.Mocked<PageRepository> =>
    ({
      findAllByTenant: jest.fn().mockResolvedValue(pages),
    }) as unknown as jest.Mocked<PageRepository>;

  it('deja fuera las páginas despublicadas: no pueden llegar a buscadores', async () => {
    const repository = buildRepository([
      new Page('home', 'Inicio', null, [], '018f6f1a-0000-7000-8000-000000000001', true),
      new Page(
        'borrador',
        'Borrador',
        null,
        [],
        '018f6f1a-0000-7000-8000-000000000002',
        false,
      ),
    ]);

    const pages = await new ListPublishedPagesUseCase(repository).execute(
      '018f6f1a-0000-7000-8000-000000000007',
    );

    expect(pages.map((page) => page.slug)).toEqual(['home']);
  });

  it('consulta solo las páginas del tenant pedido', async () => {
    const repository = buildRepository([]);

    await new ListPublishedPagesUseCase(repository).execute(
      '018f6f1a-0000-7000-8000-000000000007',
    );

    expect(repository.findAllByTenant).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000007',
    );
  });

  it('entrega la fecha de modificación en ISO, para el lastModified del sitemap', async () => {
    const updatedAt = new Date('2026-03-01T10:00:00.000Z');
    const repository = buildRepository([
      new Page(
        'home',
        'Inicio',
        null,
        [],
        '018f6f1a-0000-7000-8000-000000000001',
        true,
        updatedAt,
      ),
    ]);

    const pages = await new ListPublishedPagesUseCase(repository).execute(
      '018f6f1a-0000-7000-8000-000000000007',
    );

    expect(pages[0]?.updatedAt).toBe('2026-03-01T10:00:00.000Z');
  });

  it('no lleva secciones: el sitemap solo necesita la dirección y el título', async () => {
    const repository = buildRepository([
      new Page(
        'home',
        'Inicio',
        'Desc',
        [],
        '018f6f1a-0000-7000-8000-000000000001',
        true,
      ),
    ]);

    const pages = await new ListPublishedPagesUseCase(repository).execute(
      '018f6f1a-0000-7000-8000-000000000007',
    );

    expect(pages[0]).toEqual({
      slug: 'home',
      title: 'Inicio',
      description: 'Desc',
      updatedAt: null,
    });
  });
});
