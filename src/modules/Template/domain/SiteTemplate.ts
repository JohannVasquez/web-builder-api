import type { BrandUpdate } from '../../Brand/domain/BrandSchema';

export interface TemplateSection {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly anchor?: string;
}

export interface TemplatePage {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly sections: readonly TemplateSection[];
}

export interface TemplateNavigationLink {
  readonly label: string;
  readonly href: string;
}

// Kit de inicio por rubro: el sitio completo que recibe un cliente nuevo antes de
// cambiarle textos, imágenes y colores. No queda amarrado a ningún cliente.
export interface SiteTemplate {
  readonly id: string;
  readonly label: string;
  readonly industry: string;
  readonly description: string;
  readonly brand: BrandUpdate;
  readonly settings: Readonly<Record<string, string>>;
  readonly navigation: readonly TemplateNavigationLink[];
  readonly pages: readonly TemplatePage[];
}

export interface SiteTemplateSummary {
  readonly id: string;
  readonly label: string;
  readonly industry: string;
  readonly description: string;
  readonly pageCount: number;
  readonly visualStyle: string;
}

export const toSummary = (template: SiteTemplate): SiteTemplateSummary => ({
  id: template.id,
  label: template.label,
  industry: template.industry,
  description: template.description,
  pageCount: template.pages.length,
  visualStyle: template.brand.visualStyle ?? 'classic',
});
