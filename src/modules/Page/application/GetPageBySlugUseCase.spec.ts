import { GetPageBySlugUseCase } from './GetPageBySlugUseCase';
import { Page, PageSection } from '../domain/Page';
import { PageNotFoundError } from '../domain/PageNotFoundError';
import type { PageRepository } from '../domain/PageRepository';

describe('GetPageBySlugUseCase', () => {
  const buildPage = (): Page =>
    new Page('nosotros', 'Nosotros', 'Quiénes somos', [
      new PageSection('Hero', 2, { title: 'Hola' }),
      new PageSection('Features', 1, { items: [] }),
    ]);

  const buildRepository = (page: Page | null): jest.Mocked<PageRepository> => ({
    findBySlug: jest.fn().mockResolvedValue(page),
  });

  it('returns the page when the slug exists', async () => {
    const page = buildPage();
    const repository = buildRepository(page);
    const useCase = new GetPageBySlugUseCase(repository);

    const result = await useCase.execute('nosotros');

    expect(repository.findBySlug).toHaveBeenCalledWith('nosotros');
    expect(result).toBe(page);
  });

  it('throws PageNotFoundError when the slug does not exist', async () => {
    const repository = buildRepository(null);
    const useCase = new GetPageBySlugUseCase(repository);

    await expect(useCase.execute('no-existe')).rejects.toThrow(PageNotFoundError);
  });

  it('serializes sections ordered by position', () => {
    const page = buildPage();

    const primitives = page.toPrimitives();

    expect(primitives.sections.map((section) => section.type)).toEqual([
      'Features',
      'Hero',
    ]);
  });
});
