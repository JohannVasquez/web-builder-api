import { CreateTenantUseCase } from './CreateTenantUseCase';
import { Tenant } from '../domain/Tenant';
import type { SiteContent } from '../domain/SiteContent';
import type { SiteContentSource } from '../domain/SiteContentSource';
import type { TenantRepository } from '../domain/TenantRepository';
import { BadRequestError } from '../../../shared/domain/BadRequestError';
import { NotFoundError } from '../../../shared/domain/NotFoundError';

describe('CreateTenantUseCase', () => {
  const content = (isPublished: boolean): SiteContent => ({
    settings: { siteName: 'Kit' },
    navigation: [{ label: 'Inicio', href: '/' }],
    brand: { visualStyle: 'minimal' },
    pages: [
      { slug: 'home', title: 'Inicio', description: null, isPublished, sections: [] },
    ],
  });

  const buildRepository = (): jest.Mocked<TenantRepository> =>
    ({
      createWithContent: jest
        .fn()
        .mockResolvedValue(new Tenant(3, 'nuevo', 'Nuevo', 'nuevo.cl')),
      readContent: jest.fn().mockResolvedValue(content(true)),
    }) as unknown as jest.Mocked<TenantRepository>;

  const buildSource = (): jest.Mocked<SiteContentSource> => ({
    fromTemplate: jest.fn().mockResolvedValue(content(true)),
    listTemplates: jest.fn().mockResolvedValue([]),
  });

  const input = {
    slug: 'nuevo',
    name: 'Nuevo',
    domains: ['nuevo.cl'],
    templateId: undefined,
    duplicateFromTenantId: undefined,
  };

  it('crea un cliente vacío cuando no se pide plantilla ni duplicado', async () => {
    const repository = buildRepository();

    await new CreateTenantUseCase(repository, buildSource()).execute(input);

    expect(repository.createWithContent).toHaveBeenCalledWith(
      'nuevo',
      'Nuevo',
      ['nuevo.cl'],
      {
        settings: {},
        navigation: [],
        brand: {},
        pages: [],
      },
    );
  });

  it('siembra el sitio desde el kit por rubro pedido', async () => {
    const repository = buildRepository();
    const source = buildSource();

    await new CreateTenantUseCase(repository, source).execute({
      ...input,
      templateId: 'pasteleria',
    });

    expect(source.fromTemplate).toHaveBeenCalledWith('pasteleria');
    expect(repository.createWithContent).toHaveBeenCalledWith(
      'nuevo',
      'Nuevo',
      ['nuevo.cl'],
      expect.objectContaining({ settings: { siteName: 'Kit' } }),
    );
  });

  it('falla con un mensaje claro si la plantilla no existe', async () => {
    const source = buildSource();
    source.fromTemplate.mockResolvedValue(null);

    await expect(
      new CreateTenantUseCase(buildRepository(), source).execute({
        ...input,
        templateId: 'no-existe',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('copia el sitio de otro cliente cuando se pide duplicar', async () => {
    const repository = buildRepository();

    await new CreateTenantUseCase(repository, buildSource()).execute({
      ...input,
      duplicateFromTenantId: 9,
    });

    expect(repository.readContent).toHaveBeenCalledWith(9);
  });

  it('la copia nace despublicada: publicarla tiene que ser una decisión', async () => {
    const repository = buildRepository();

    await new CreateTenantUseCase(repository, buildSource()).execute({
      ...input,
      duplicateFromTenantId: 9,
    });

    const [, , , written] = repository.createWithContent.mock.calls[0] ?? [];
    expect(written.pages.every((page) => !page.isPublished)).toBe(true);
  });

  it('falla si el cliente a duplicar no existe', async () => {
    const repository = buildRepository();
    repository.readContent.mockResolvedValue(null);

    await expect(
      new CreateTenantUseCase(repository, buildSource()).execute({
        ...input,
        duplicateFromTenantId: 404,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza pedir plantilla y duplicado a la vez', async () => {
    await expect(
      new CreateTenantUseCase(buildRepository(), buildSource()).execute({
        ...input,
        templateId: 'pasteleria',
        duplicateFromTenantId: 9,
      }),
    ).rejects.toThrow(BadRequestError);
  });
});

describe('CreateTenantUseCase (lo publicado)', () => {
  it('un sitio creado desde un kit nace con sus páginas publicadas', async () => {
    const repository = {
      createWithContent: jest
        .fn()
        .mockResolvedValue(new Tenant(3, 'nuevo', 'Nuevo', 'nuevo.cl')),
      readContent: jest.fn(),
    } as unknown as jest.Mocked<TenantRepository>;
    const source = {
      fromTemplate: jest.fn().mockResolvedValue({
        settings: {},
        navigation: [],
        brand: {},
        pages: [
          { slug: 'home', title: 'Inicio', description: null, isPublished: true, sections: [] },
        ],
      }),
      listTemplates: jest.fn(),
    } as unknown as jest.Mocked<SiteContentSource>;

    await new CreateTenantUseCase(repository, source).execute({
      slug: 'nuevo',
      name: 'Nuevo',
      domains: [],
      templateId: 'restaurante',
      duplicateFromTenantId: undefined,
    });

    const [, , , written] = repository.createWithContent.mock.calls[0] ?? [];
    expect((written as SiteContent).pages.every((page) => page.isPublished)).toBe(true);
  });
});
