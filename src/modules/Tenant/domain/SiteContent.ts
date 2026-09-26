// Contenido completo de un sitio, independiente de dónde venga: de un kit por rubro, de
// otro cliente al duplicarlo, o de un agente. El módulo Tenant no necesita saber cuál.
export interface SiteContentSection {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly anchor?: string | null;
}

export interface SiteContentPage {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublished: boolean;
  readonly sections: readonly SiteContentSection[];
}

export interface SiteContent {
  readonly settings: Readonly<Record<string, string>>;
  readonly navigation: readonly { readonly label: string; readonly href: string }[];
  readonly brand: Record<string, unknown>;
  readonly pages: readonly SiteContentPage[];
}

export const EMPTY_SITE_CONTENT: SiteContent = {
  settings: {},
  navigation: [],
  brand: {},
  pages: [],
};
