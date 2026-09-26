import type { CreateTenantUseCase } from '@/modules/Tenant/application/CreateTenantUseCase';
import type { PlatformDomainConfig } from '@/modules/Tenant/application/ManageTenantUseCase';
import type { SiteContentSource } from '@/modules/Tenant/domain/SiteContentSource';
import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import { demoExpiryFrom, type DemoCreator, type DemoLinkKind } from '../domain/Demo';
import type { DemoRepository, DemoView } from '../domain/DemoRepository';
import { DEMO_SLUG_MAX_LENGTH, type CreateDemoInput } from '../domain/DemoSchema';
import type { Prospect } from '../domain/Prospect';
import { buildDemoUrl, generateDemoToken } from '../domain/demoToken';
import {
  DemoAddressTakenError,
  DemoNotFoundError,
  DemoSlugTakenError,
  ProspectNotFoundError,
} from '../domain/errors';

export const DEMO_SLUG_PREFIX = 'demo-';
// Más allá de esto es más útil elegir otro nombre que seguir numerando.
const MAX_SUGGESTION_ATTEMPTS = 50;

export interface IssuedDemoLink {
  readonly kind: DemoLinkKind;
  readonly token: string;
  readonly url: string;
}

export interface CreatedDemo {
  readonly view: DemoView;
  readonly prospect: Prospect;
  // En claro solo aquí: la base guarda el hash y ninguna otra respuesta los vuelve a mostrar.
  readonly links: Readonly<Record<DemoLinkKind, IssuedDemoLink>>;
}

export class CreateDemoUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly siteContentSource: SiteContentSource,
    private readonly platform: PlatformDomainConfig,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  public async execute(
    input: CreateDemoInput,
    creator: DemoCreator,
    now: Date = new Date(),
  ): Promise<CreatedDemo> {
    if (this.platform.baseDomain === '') {
      throw new UnprocessableEntityError(
        'Falta PLATFORM_DOMAIN: una demo vive en un subdominio de la plataforma y sin él no tiene dirección.',
      );
    }

    const existingProspect =
      input.prospectId === undefined
        ? null
        : await this.requireProspect(input.prospectId);

    const tenantSlug = `${DEMO_SLUG_PREFIX}${input.slug}`;
    const address = this.addressFor(tenantSlug);
    if (await this.demoRepository.isAddressTaken(tenantSlug, address)) {
      throw new DemoSlugTakenError(input.slug, await this.suggestSlug(input.slug));
    }

    const content = await this.createTenantUseCase.resolveContent(input);
    const prospectIndustry =
      existingProspect?.industry ?? input.prospect?.industry ?? null;
    const prospectLink = generateDemoToken();
    const teamLink = generateDemoToken();

    let demoId: string;
    try {
      demoId = await this.demoRepository.create({
        site: {
          slug: tenantSlug,
          name: input.name,
          address,
          // El prospecto solo ve lo publicado, así que una demo nace con todo publicado,
          // también cuando se copia un sitio (una copia normal nace despublicada).
          content: {
            ...content,
            pages: content.pages.map((page) => ({ ...page, isPublished: true })),
          },
        },
        prospect:
          existingProspect === null
            ? { data: input.prospect ?? { businessName: input.name } }
            : { id: existingProspect.id },
        templateId: input.templateId ?? null,
        industry: prospectIndustry ?? (await this.templateIndustry(input.templateId)),
        creator,
        createdAt: now,
        expiresAt: demoExpiryFrom(now),
        tokenHashes: { prospect: prospectLink.hash, team: teamLink.hash },
      });
    } catch (error) {
      if (error instanceof DemoAddressTakenError) {
        throw new DemoSlugTakenError(input.slug, await this.suggestSlug(input.slug));
      }
      throw error;
    }

    const view = await this.demoRepository.findById(demoId);
    if (view === null || view.demo.prospectId === null) {
      throw new DemoNotFoundError();
    }
    const prospect = await this.requireProspect(view.demo.prospectId);

    await this.recordActivity.execute({
      tenantId: view.demo.tenantId,
      actorType: creator.type,
      actorId: creator.id,
      actorName: creator.name,
      action: 'demo.create',
      entityType: 'demo',
      entityId: demoId,
      summary: `Creó la demo ${tenantSlug} para ${prospect.businessName}`,
      // Sin los enlaces: el registro de actividad lo lee más gente que la que debe tenerlos.
      after: {
        slug: tenantSlug,
        address,
        templateId: input.templateId ?? null,
        duplicateFromTenantId: input.duplicateFromTenantId ?? null,
        prospectId: prospect.id,
        expiresAt: view.demo.expiresAt?.toISOString() ?? null,
      },
    });

    return {
      view,
      prospect,
      links: {
        prospect: {
          kind: 'prospect',
          token: prospectLink.token,
          url: buildDemoUrl(address, prospectLink.token),
        },
        team: {
          kind: 'team',
          token: teamLink.token,
          url: buildDemoUrl(address, teamLink.token),
        },
      },
    };
  }

  private addressFor(tenantSlug: string): string {
    return `${tenantSlug}.${this.platform.baseDomain}`;
  }

  private async requireProspect(prospectId: string): Promise<Prospect> {
    const prospect = await this.demoRepository.findProspect(prospectId);
    if (prospect === null) {
      throw new ProspectNotFoundError();
    }
    return prospect;
  }

  private async suggestSlug(slug: string): Promise<string | null> {
    for (let attempt = 2; attempt <= MAX_SUGGESTION_ATTEMPTS; attempt += 1) {
      // Recortada si hace falta, para que la sugerencia pase la misma validación al reenviarla.
      const suffix = `-${attempt}`;
      const candidate = `${slug.slice(0, DEMO_SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`;
      const tenantSlug = `${DEMO_SLUG_PREFIX}${candidate}`;
      if (
        !(await this.demoRepository.isAddressTaken(
          tenantSlug,
          this.addressFor(tenantSlug),
        ))
      ) {
        return candidate;
      }
    }
    return null;
  }

  // Sin rubro en la ficha, el del kit es la mejor pista para las métricas "por rubro".
  private async templateIndustry(templateId: string | undefined): Promise<string | null> {
    if (templateId === undefined) {
      return null;
    }
    const templates = await this.siteContentSource.listTemplates();
    return templates.find((template) => template.id === templateId)?.industry ?? null;
  }
}
