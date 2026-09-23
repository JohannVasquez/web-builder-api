import type { SiteContent } from '../domain/SiteContent';
import type { SiteContentSource } from '../domain/SiteContentSource';
import { SITE_TEMPLATES, findSiteTemplate } from '@/modules/Template/domain/registry';
import {
  toSummary,
  type SiteTemplateSummary,
} from '@/modules/Template/domain/SiteTemplate';

// Adaptador entre los kits por rubro y el contenido genérico que sabe escribir Tenant.
export class TemplateSiteContentSource implements SiteContentSource {
  public fromTemplate(templateId: string): Promise<SiteContent | null> {
    const template = findSiteTemplate(templateId);
    if (template === undefined) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      settings: template.settings,
      navigation: template.navigation.map((link) => ({ ...link })),
      brand: { ...template.brand },
      // Un sitio recién creado desde un kit nace publicado: es el punto de la spec, que
      // quede listo en minutos. Lo que un agente crea después sí nace en borrador.
      pages: template.pages.map((page) => ({
        slug: page.slug,
        title: page.title,
        description: page.description,
        isPublished: true,
        sections: page.sections.map((section) => ({
          type: section.type,
          props: section.props,
          anchor: section.anchor ?? null,
        })),
      })),
    });
  }

  public listTemplates(): Promise<readonly SiteTemplateSummary[]> {
    return Promise.resolve(SITE_TEMPLATES.map(toSummary));
  }
}
