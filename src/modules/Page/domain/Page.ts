export interface PageSectionPrimitives {
  readonly type: string;
  readonly position: number;
  readonly props: Readonly<Record<string, unknown>>;
  readonly anchor: string | null;
}

export interface AdminPageSectionPrimitives extends PageSectionPrimitives {
  readonly id: string;
  readonly isHidden: boolean;
}

// Lo que el cliente decide sobre cómo aparece la página en buscadores y al compartirla.
export interface PageSeo {
  // Nulos = se usan `title` y `description` de la página.
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  /**
   * `key` del bucket en el camino de admin; URL ya firmada en el público. Es la misma
   * dualidad que tienen las imágenes de `props`: la firma ocurre al leer, en
   * `GetPageBySlugUseCase`, para que nunca quede guardada una URL de vida corta.
   */
  readonly ogImage: string | null;
  // Publicada pero fuera del índice: el enlace funciona, el buscador no la lista.
  readonly noindex: boolean;
}

export const EMPTY_PAGE_SEO: PageSeo = {
  seoTitle: null,
  seoDescription: null,
  ogImage: null,
  noindex: false,
};

export interface PagePrimitives {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  // Nulo = la página usa el estilo visual del sitio.
  readonly visualStyle: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly ogImageUrl: string | null;
  readonly noindex: boolean;
  readonly sections: readonly PageSectionPrimitives[];
}

export interface AdminPagePrimitives {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublished: boolean;
  readonly visualStyle: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly ogImageKey: string | null;
  readonly noindex: boolean;
  readonly sections: readonly AdminPageSectionPrimitives[];
}

export class PageSection {
  constructor(
    public readonly type: string,
    public readonly position: number,
    public readonly props: Readonly<Record<string, unknown>>,
    public readonly anchor: string | null = null,
    /** Ausente en el camino público (AC1.3 no lo necesita); presente en admin. */
    public readonly id?: string,
    // Oculta: el panel la sigue viendo, el sitio publicado no.
    public readonly isHidden: boolean = false,
  ) {}

  public toPrimitives(): PageSectionPrimitives {
    return {
      type: this.type,
      position: this.position,
      props: this.props,
      anchor: this.anchor,
    };
  }

  public toAdminPrimitives(): AdminPageSectionPrimitives {
    if (this.id === undefined) {
      throw new Error('PageSection sin id: no se puede serializar para admin');
    }
    return { id: this.id, isHidden: this.isHidden, ...this.toPrimitives() };
  }
}

export class Page {
  constructor(
    public readonly slug: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly sections: readonly PageSection[],
    /** Ausente en el camino público; presente (junto a `isPublished`) en admin. */
    public readonly id?: string,
    public readonly isPublished: boolean = true,
    // Solo lo usa el sitemap para el `lastModified`; el resto del dominio lo ignora.
    public readonly updatedAt: Date | null = null,
    // Estilo propio de la página; nulo = hereda el del sitio.
    public readonly visualStyle: string | null = null,
    public readonly seo: PageSeo = EMPTY_PAGE_SEO,
  ) {}

  private orderedSections(): readonly PageSection[] {
    return [...this.sections].sort((a, b) => a.position - b.position);
  }

  // Lo que sale al sitio: una sección oculta no se publica, pero tampoco se pierde.
  private visibleSections(): readonly PageSection[] {
    return this.orderedSections().filter((section) => !section.isHidden);
  }

  // Los campos de buscador llegan por separado de la foto publicada (ver
  // `PrismaPageRepository.findBySlug`), y la imagen se firma después de leerlos.
  public withSeo(seo: PageSeo): Page {
    return new Page(
      this.slug,
      this.title,
      this.description,
      this.sections,
      this.id,
      this.isPublished,
      this.updatedAt,
      this.visualStyle,
      seo,
    );
  }

  public toPrimitives(): PagePrimitives {
    return {
      slug: this.slug,
      title: this.title,
      description: this.description,
      visualStyle: this.visualStyle,
      seoTitle: this.seo.seoTitle,
      seoDescription: this.seo.seoDescription,
      ogImageUrl: this.seo.ogImage,
      noindex: this.seo.noindex,
      sections: this.visibleSections().map((section) => section.toPrimitives()),
    };
  }

  public toAdminPrimitives(): AdminPagePrimitives {
    if (this.id === undefined) {
      throw new Error('Page sin id: no se puede serializar para admin');
    }
    return {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      isPublished: this.isPublished,
      visualStyle: this.visualStyle,
      seoTitle: this.seo.seoTitle,
      seoDescription: this.seo.seoDescription,
      ogImageKey: this.seo.ogImage,
      noindex: this.seo.noindex,
      sections: this.orderedSections().map((section) => section.toAdminPrimitives()),
    };
  }
}
