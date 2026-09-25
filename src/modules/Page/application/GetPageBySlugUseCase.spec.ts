import { GetPageBySlugUseCase } from './GetPageBySlugUseCase';
import { Page, PageSection } from '../domain/Page';
import { PageNotFoundError } from '../domain/PageNotFoundError';
import type { PageRepository } from '../domain/PageRepository';
import type { ResolveImageUrlsUseCase } from '@/modules/FileStorage/application/ResolveImageUrlsUseCase';

describe('GetPageBySlugUseCase', () => {
  const buildPage = (): Page =>
    new Page('nosotros', 'Nosotros', 'Quiénes somos', [
      new PageSection('Hero', 2, { title: 'Hola', imageUrl: 'hero.svg' }),
      new PageSection('Features', 1, { items: [] }),
    ]);

  const buildRepository = (page: Page | null): jest.Mocked<PageRepository> => ({
    findPublishedAt: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(page),
    findDraftBySlug: jest.fn().mockResolvedValue(page),
    findAllByTenant: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    publish: jest.fn(),
    replaceDraft: jest.fn(),
    addSection: jest.fn(),
    updateSection: jest.fn(),
    duplicateSection: jest.fn(),
    deleteSection: jest.fn(),
    reorderSections: jest.fn(),
  });

  // Identidad por defecto: deja pasar `props` tal cual, para no acoplar
  // este spec al detalle de cómo se firman las URLs (eso lo cubre
  // ResolveImageUrlsUseCase.spec.ts).
  const buildResolveImageUrlsUseCase = (): jest.Mocked<ResolveImageUrlsUseCase> =>
    ({
      execute: jest
        .fn()
        .mockImplementation((props: Record<string, unknown>) => Promise.resolve(props)),
      signKey: jest
        .fn()
        .mockImplementation((key: string | null) => Promise.resolve(key)),
    }) as unknown as jest.Mocked<ResolveImageUrlsUseCase>;

  it('returns the page when the slug exists', async () => {
    const page = buildPage();
    const repository = buildRepository(page);
    const resolveImageUrls = buildResolveImageUrlsUseCase();
    const useCase = new GetPageBySlugUseCase(repository, resolveImageUrls);

    const result = await useCase.execute(
      '018f6f1a-0000-7000-8000-000000000001',
      'nosotros',
    );

    expect(repository.findBySlug).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
      'nosotros',
    );
    expect(result.slug).toBe(page.slug);
    expect(result.sections).toHaveLength(page.sections.length);
  });

  it('resolves imageUrl in every section props through ResolveImageUrlsUseCase', async () => {
    const page = buildPage();
    const repository = buildRepository(page);
    const resolveImageUrls = buildResolveImageUrlsUseCase();
    resolveImageUrls.execute.mockImplementation((props: Record<string, unknown>) =>
      Promise.resolve(
        'imageUrl' in props
          ? { ...props, imageUrl: 'https://signed.test/hero.svg' }
          : props,
      ),
    );
    const useCase = new GetPageBySlugUseCase(repository, resolveImageUrls);

    const result = await useCase.execute(
      '018f6f1a-0000-7000-8000-000000000001',
      'nosotros',
    );

    expect(resolveImageUrls.execute).toHaveBeenCalledTimes(2);
    const heroSection = result.sections.find((section) => section.type === 'Hero');
    expect(heroSection?.props.imageUrl).toBe('https://signed.test/hero.svg');
  });

  it('throws PageNotFoundError when the slug does not exist', async () => {
    const repository = buildRepository(null);
    const useCase = new GetPageBySlugUseCase(repository, buildResolveImageUrlsUseCase());

    await expect(
      useCase.execute('018f6f1a-0000-7000-8000-000000000001', 'no-existe'),
    ).rejects.toThrow(PageNotFoundError);
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
