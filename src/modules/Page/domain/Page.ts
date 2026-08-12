export interface PageSectionPrimitives {
  readonly type: string;
  readonly position: number;
  readonly props: Readonly<Record<string, unknown>>;
}

export interface PagePrimitives {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly sections: readonly PageSectionPrimitives[];
}

export class PageSection {
  constructor(
    public readonly type: string,
    public readonly position: number,
    public readonly props: Readonly<Record<string, unknown>>,
  ) {}

  public toPrimitives(): PageSectionPrimitives {
    return { type: this.type, position: this.position, props: this.props };
  }
}

export class Page {
  constructor(
    public readonly slug: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly sections: readonly PageSection[],
  ) {}

  public toPrimitives(): PagePrimitives {
    const orderedSections = [...this.sections]
      .sort((a, b) => a.position - b.position)
      .map((section) => section.toPrimitives());
    return {
      slug: this.slug,
      title: this.title,
      description: this.description,
      sections: orderedSections,
    };
  }
}
