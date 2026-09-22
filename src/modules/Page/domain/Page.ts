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

export interface PagePrimitives {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  // Nulo = la página usa el estilo visual del sitio.
  readonly visualStyle: string | null;
  readonly sections: readonly PageSectionPrimitives[];
}

export interface AdminPagePrimitives {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublished: boolean;
  readonly visualStyle: string | null;
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
  ) {}

  private orderedSections(): readonly PageSection[] {
    return [...this.sections].sort((a, b) => a.position - b.position);
  }

  // Lo que sale al sitio: una sección oculta no se publica, pero tampoco se pierde.
  private visibleSections(): readonly PageSection[] {
    return this.orderedSections().filter((section) => !section.isHidden);
  }

  public toPrimitives(): PagePrimitives {
    return {
      slug: this.slug,
      title: this.title,
      description: this.description,
      visualStyle: this.visualStyle,
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
      sections: this.orderedSections().map((section) => section.toAdminPrimitives()),
    };
  }
}
