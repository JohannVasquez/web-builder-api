// `demo` es el sitio privado de un prospecto: solo lo ve quien trae su enlace (módulo Demo).
export const TENANT_STATUSES = ['active', 'paused', 'building', 'demo'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

// Lo que ve el visitante cuando el sitio no está sirviendo. `building` y `paused` son
// situaciones distintas para la agencia, así que dicen cosas distintas.
export const TENANT_STATUS_MESSAGES: Readonly<Record<TenantStatus, string>> = {
  active: '',
  paused: 'Estamos haciendo unos ajustes. Volvemos muy pronto.',
  building: 'Estamos construyendo este sitio. Vuelve en unos días.',
  // Nunca se muestra: sin enlace válido una demo responde 404, como si no existiera.
  demo: '',
};

export interface TenantPrimitives {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly primaryDomain: string | null;
  readonly status: TenantStatus;
}

export class Tenant {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly name: string,
    /**
     * Dominio canónico del tenant, para construir URLs absolutas. Puede ser
     * distinto del dominio por el que entró el visitante: un tenant acepta
     * varios (subdominio de la plataforma + dominio propio) pero solo uno es
     * el canónico. Nulo mientras el tenant no tenga ningún dominio asignado.
     */
    public readonly primaryDomain: string | null,
    public readonly status: TenantStatus = 'active',
  ) {}

  // Pausar no borra nada: el contenido sigue ahí y reactivar lo devuelve tal cual.
  public isServable(): boolean {
    return this.status === 'active';
  }

  public isDemo(): boolean {
    return this.status === 'demo';
  }

  public toPrimitives(): TenantPrimitives {
    return {
      id: this.id,
      slug: this.slug,
      name: this.name,
      primaryDomain: this.primaryDomain,
      status: this.status,
    };
  }
}

/**
 * Tenant de respaldo cuando la petición no trae dominio o el dominio no
 * está registrado. Permite que el sitio "principal" siga funcionando sin
 * configuración extra en desarrollo.
 */
export const DEFAULT_TENANT_SLUG = 'default';
