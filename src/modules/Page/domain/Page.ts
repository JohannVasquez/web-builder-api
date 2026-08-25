export interface PageSectionPrimitives {
  readonly type: string;
  readonly position: number;
  readonly props: Readonly<Record<string, unknown>>;
  readonly anchor: string | null;
}

export interface AdminPageSectionPrimitives extends PageSectionPrimitives {
  readonly id: number;
}

export interface PagePrimitives {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly sections: readonly PageSectionPrimitives[];
}

export interface AdminPagePrimitives {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublished: boolean;
  readonly sections: readonly AdminPageSectionPrimitives[];
}

export class PageSection {
  constructor(
    public readonly type: string,
    public readonly position: number,
    public readonly props: Readonly<Record<string, unknown>>,
    public readonly anchor: string | null = null,
    /** Ausente en el camino público (AC1.3 no lo necesita); presente en admin. */
    public readonly id?: number,
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
    return { id: this.id, ...this.toPrimitives() };
  }
}

export class Page {
  constructor(
    public readonly slug: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly sections: readonly PageSection[],
    /** Ausente en el camino público; presente (junto a `isPublished`) en admin. */
    public readonly id?: number,
    public readonly isPublished: boolean = true,
  ) {}

  private orderedSections(): readonly PageSection[] {
    return [...this.sections].sort((a, b) => a.position - b.position);
  }

  public toPrimitives(): PagePrimitives {
    return {
      slug: this.slug,
      title: this.title,
      description: this.description,
      sections: this.orderedSections().map((section) => section.toPrimitives()),
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
      sections: this.orderedSections().map((section) => section.toAdminPrimitives()),
    };
  }
}
