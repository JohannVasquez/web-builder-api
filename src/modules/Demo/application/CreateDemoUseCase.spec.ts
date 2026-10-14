import { CreateTenantUseCase } from '@/modules/Tenant/application/CreateTenantUseCase';
import { PlatformDomainConfig } from '@/modules/Tenant/application/ManageTenantUseCase';
import type { SiteContent } from '@/modules/Tenant/domain/SiteContent';
import type { SiteContentSource } from '@/modules/Tenant/domain/SiteContentSource';
import type { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { Demo, type DemoCreator } from '../domain/Demo';
import { DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoRepository, DemoView, NewDemo } from '../domain/DemoRepository';
import { CreateDemoSchema } from '../domain/DemoSchema';
import { Prospect } from '../domain/Prospect';
import { hashDemoToken } from '../domain/demoToken';
import {
  DemoAddressTakenError,
  DemoSlugTakenError,
  ProspectNotFoundError,
} from '../domain/errors';
import { CreateDemoUseCase } from './CreateDemoUseCase';

describe('CreateDemoUseCase', () => {
  const NOW = new Date('2026-09-26T12:00:00Z');
  const DEMO_ID = '018f6f1a-0000-7000-8000-0000000000d1';
  const TENANT_ID = '018f6f1a-0000-7000-8000-0000000000e1';
  const PROSPECT_ID = '018f6f1a-0000-7000-8000-0000000000f1';
  const SOURCE_TENANT_ID = '018f6f1a-0000-7000-8000-0000000000c1';
  const creator: DemoCreator = {
    type: 'admin',
    id: '018f6f1a-0000-7000-8000-0000000000a1',
    name: 'Pau',
  };

  const content = (isPublished: boolean): SiteContent => ({
    settings: { siteName: 'Kit' },
    navigation: [{ label: 'Inicio', href: '/' }],
    brand: {},
    pages: [
      { slug: 'home', title: 'Inicio', description: null, isPublished, sections: [] },
      {
        slug: 'nosotros',
        title: 'Nosotros',
        description: null,
        isPublished,
        sections: [],
      },
    ],
  });

  const prospect = new Prospect(
    PROSPECT_ID,
    'Pastelería Luna',
    'Luna',
    '+56 9 1234 5678',
    null,
    'pastelería',
    'Google Maps',
    null,
    NOW,
    NOW,
  );

  const view: DemoView = {
    demo: new Demo(
      DEMO_ID,
      TENANT_ID,
      PROSPECT_ID,
      'pasteleria',
      'pastelería',
      creator,
      NOW,
      new Date('2026-10-10T12:00:00Z'),
      null,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
    ),
    site: {
      tenantId: TENANT_ID,
      slug: 'demo-pasteleria-luna',
      name: 'Pastelería Luna',
      address: 'demo-pasteleria-luna.webbuilder.co',
    },
    prospect: {
      id: PROSPECT_ID,
      businessName: 'Pastelería Luna',
      contactName: null,
      phone: null,
      hasEmail: false,
    },
  };

  const build = (
    taken: readonly string[] = [],
    config = new DemoLifecycleConfig(),
  ): {
    useCase: CreateDemoUseCase;
    repository: jest.Mocked<DemoRepository>;
    activity: jest.Mocked<RecordActivityUseCase>;
    source: jest.Mocked<SiteContentSource>;
  } => {
    const repository = {
      create: jest.fn().mockResolvedValue(DEMO_ID),
      isAddressTaken: jest
        .fn()
        .mockImplementation((slug: string) => Promise.resolve(taken.includes(slug))),
      findById: jest.fn().mockResolvedValue(view),
      findProspect: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(id === PROSPECT_ID ? prospect : null),
        ),
    } as unknown as jest.Mocked<DemoRepository>;
    const source: jest.Mocked<SiteContentSource> = {
      fromTemplate: jest.fn().mockResolvedValue(content(true)),
      listTemplates: jest.fn().mockResolvedValue([
        {
          id: 'pasteleria',
          label: 'Pastelería',
          industry: 'Pastelería y repostería',
          description: '',
          pageCount: 2,
          visualStyle: 'classic',
        },
      ]),
    };
    const tenants = {
      readContent: jest.fn().mockResolvedValue(content(true)),
    } as unknown as TenantRepository;
    const platform = new PlatformDomainConfig('webbuilder.co', 'sitios.webbuilder.co');
    const activity = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RecordActivityUseCase>;
    const useCase = new CreateDemoUseCase(
      repository,
      new CreateTenantUseCase(tenants, source, platform),
      source,
      platform,
      activity,
      config,
    );
    return { useCase, repository, activity, source };
  };

  const input = (
    overrides: Record<string, unknown> = {},
  ): ReturnType<typeof CreateDemoSchema.parse> =>
    CreateDemoSchema.parse({
      slug: 'pasteleria-luna',
      name: 'Pastelería Luna',
      templateId: 'pasteleria',
      prospect: { businessName: 'Pastelería Luna', industry: 'pastelería' },
      ...overrides,
    });

  const created = (repository: jest.Mocked<DemoRepository>): NewDemo =>
    repository.create.mock.calls[0]?.[0];

  it('crea el sitio desde un kit con slug demo-, una sola dirección de plataforma y todo publicado', async () => {
    const { useCase, repository } = build();

    await useCase.execute(input(), creator, NOW);

    const demo = created(repository);
    expect(demo.site.slug).toBe('demo-pasteleria-luna');
    expect(demo.site.address).toBe('demo-pasteleria-luna.webbuilder.co');
    expect(demo.site.content.pages.every((page) => page.isPublished)).toBe(true);
    expect(demo.templateId).toBe('pasteleria');
    expect(demo.industry).toBe('pastelería');
    expect(demo.expiresAt?.toISOString()).toBe('2026-10-10T12:00:00.000Z');
    expect(demo.creator).toEqual(creator);
  });

  it('el plazo sale de DEMO_DURATION_DAYS', async () => {
    const { useCase, repository } = build([], new DemoLifecycleConfig(7));

    await useCase.execute(input(), creator, NOW);

    expect(created(repository).expiresAt?.toISOString()).toBe('2026-10-03T12:00:00.000Z');
  });

  it('al duplicar un sitio, la demo nace con sus páginas publicadas', async () => {
    const { useCase, repository } = build();

    await useCase.execute(
      input({ templateId: undefined, duplicateFromTenantId: SOURCE_TENANT_ID }),
      creator,
      NOW,
    );

    const pages = created(repository).site.content.pages;
    expect(pages).toHaveLength(2);
    expect(pages.every((page) => page.isPublished)).toBe(true);
  });

  it('sin kit ni duplicado nace vacía', async () => {
    const { useCase, repository } = build();

    await useCase.execute(input({ templateId: undefined }), creator, NOW);

    expect(created(repository).site.content.pages).toEqual([]);
    expect(created(repository).templateId).toBeNull();
  });

  it('toma el rubro del kit cuando la ficha no lo trae', async () => {
    const { useCase, repository } = build();

    await useCase.execute(input({ prospect: { businessName: 'Luna' } }), creator, NOW);

    expect(created(repository).industry).toBe('Pastelería y repostería');
  });

  it('una segunda demo queda asociada al mismo prospecto, con otra dirección', async () => {
    const { useCase, repository } = build();

    await useCase.execute(
      input({
        slug: 'pasteleria-luna-minimal',
        prospect: undefined,
        prospectId: PROSPECT_ID,
      }),
      creator,
      NOW,
    );

    const demo = created(repository);
    expect(demo.prospect).toEqual({ id: PROSPECT_ID });
    expect(demo.site.address).toBe('demo-pasteleria-luna-minimal.webbuilder.co');
  });

  it('responde que el prospecto no existe en vez de crear uno huérfano', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(
        input({
          prospect: undefined,
          prospectId: '018f6f1a-0000-7000-8000-000000000099',
        }),
        creator,
        NOW,
      ),
    ).rejects.toBeInstanceOf(ProspectNotFoundError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('con el slug ocupado sugiere el siguiente libre', async () => {
    const { useCase, repository } = build([
      'demo-pasteleria-luna',
      'demo-pasteleria-luna-2',
    ]);

    const error = await useCase.execute(input(), creator, NOW).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DemoSlugTakenError);
    expect((error as DemoSlugTakenError).suggestedSlug).toBe('pasteleria-luna-3');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('si otra creación gana la carrera, también responde con sugerencia', async () => {
    const { useCase, repository } = build();
    repository.create.mockRejectedValueOnce(
      new DemoAddressTakenError('demo-pasteleria-luna'),
    );

    await expect(useCase.execute(input(), creator, NOW)).rejects.toBeInstanceOf(
      DemoSlugTakenError,
    );
  });

  it('entrega los dos enlaces en claro y guarda solo sus hashes', async () => {
    const { useCase, repository } = build();

    const result = await useCase.execute(input(), creator, NOW);

    const { prospect: prospectLink, team } = result.links;
    expect(prospectLink.url).toBe(
      `https://demo-pasteleria-luna.webbuilder.co/demo/${prospectLink.token}`,
    );
    expect(team.token).not.toBe(prospectLink.token);
    expect(created(repository).tokenHashes).toEqual({
      prospect: hashDemoToken(prospectLink.token),
      team: hashDemoToken(team.token),
    });
  });

  it('deja constancia en el registro de actividad sin los enlaces', async () => {
    const { useCase, activity } = build();

    const result = await useCase.execute(input(), creator, NOW);

    expect(activity.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'demo.create',
        actorId: creator.id,
        actorName: 'Pau',
        tenantId: TENANT_ID,
        entityId: DEMO_ID,
      }),
    );
    const logged = JSON.stringify(activity.execute.mock.calls);
    expect(logged).not.toContain(result.links.prospect.token);
    expect(logged).not.toContain(result.links.team.token);
  });
});
