import { PageRepository } from '../../Page/domain/PageRepository';
import { GlobalSettingsRepository } from '../../GlobalSettings/domain/GlobalSettingsRepository';
import { fillPlaceholders, findLegalTemplate } from '../domain/legalTemplates';
import type { Page } from '../../Page/domain/Page';
import { NotFoundError } from '../../../shared/domain/NotFoundError';

export class CreateLegalPageUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly globalSettingsRepository: GlobalSettingsRepository,
  ) {}

  public async execute(tenantId: number, kind: string): Promise<Page> {
    const template = findLegalTemplate(kind);
    if (template === undefined) {
      throw new NotFoundError(
        `No existe una plantilla legal "${kind}". Las disponibles son "privacidad" y "terminos".`,
      );
    }

    const settings = await this.globalSettingsRepository.find(tenantId);
    const values = {
      siteName: settings.get('siteName'),
      address: settings.get('address'),
      contactEmail: settings.get('contactEmail'),
      contactPhone: settings.get('contactPhone'),
    };

    const page = await this.pageRepository.create(tenantId, {
      slug: template.slug,
      title: template.title,
      description: template.description,
      // Nace despublicada: un texto legal lo revisa una persona antes de publicarlo.
      isPublished: false,
    });

    if (page.id === undefined) {
      throw new Error('La página legal se creó sin id.');
    }

    return this.pageRepository.addSection(tenantId, page.id, {
      type: 'TextBlock',
      position: 1,
      props: {
        title: template.title,
        content: fillPlaceholders(template.body, values),
        contentWidth: 'narrow',
      },
      isHidden: false,
      anchor: null,
    });
  }
}
