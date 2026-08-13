export interface NavigationLinkPrimitives {
  readonly label: string;
  readonly href: string;
}

/**
 * Un enlace del menú de navegación del sitio. Su `href` puede apuntar a una
 * página propia (`/nosotros`) o al ancla de una sección (`/#caracteristicas`),
 * lo que permite estructurar el sitio como multi-página o como one-page.
 */
export class NavigationLink {
  constructor(
    public readonly label: string,
    public readonly href: string,
    public readonly position: number,
  ) {}

  public toPrimitives(): NavigationLinkPrimitives {
    return { label: this.label, href: this.href };
  }
}
