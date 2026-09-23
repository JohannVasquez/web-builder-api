import { TenantRepository } from '../domain/TenantRepository';
import { SiteContentSource } from '../domain/SiteContentSource';
import { EMPTY_SITE_CONTENT, type SiteContent } from '../domain/SiteContent';
import type { CreateTenantInput } from '../domain/TenantSchema';
import type { Tenant } from '../domain/Tenant';
import { BadRequestError } from '@/shared/domain/BadRequestError';
import { NotFoundError } from '@/shared/domain/NotFoundError';

export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly siteContentSource: SiteContentSource,
  ) {}

  public async execute(input: CreateTenantInput): Promise<Tenant> {
    const content = await this.resolveContent(input);
    return this.tenantRepository.createWithContent(
      input.slug,
      input.name,
      input.domains,
      content,
    );
  }

  private async resolveContent(input: CreateTenantInput): Promise<SiteContent> {
    if (input.templateId !== undefined && input.duplicateFromTenantId !== undefined) {
      throw new BadRequestError(
        'Elige una plantilla o un cliente a duplicar, no las dos cosas.',
      );
    }

    if (input.templateId !== undefined) {
      const fromTemplate = await this.siteContentSource.fromTemplate(input.templateId);
      if (fromTemplate === null) {
        throw new NotFoundError(`No existe la plantilla "${input.templateId}".`);
      }
      return fromTemplate;
    }

    if (input.duplicateFromTenantId !== undefined) {
      const copied = await this.tenantRepository.readContent(input.duplicateFromTenantId);
      if (copied === null) {
        throw new NotFoundError(
          `No existe el cliente ${String(input.duplicateFromTenantId)} que quieres duplicar.`,
        );
      }
      // La copia nace despublicada: los dominios y los mensajes no se copian, así que el
      // sitio todavía no es de nadie y publicarlo tiene que ser una decisión explícita.
      return {
        ...copied,
        pages: copied.pages.map((page) => ({ ...page, isPublished: false })),
      };
    }

    return EMPTY_SITE_CONTENT;
  }
}
