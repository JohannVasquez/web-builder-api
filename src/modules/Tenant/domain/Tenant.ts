export class Tenant {
  constructor(
    public readonly id: number,
    public readonly slug: string,
    public readonly name: string,
    /**
     * Dominio canónico del tenant, para construir URLs absolutas. Puede ser
     * distinto del dominio por el que entró el visitante: un tenant acepta
     * varios (subdominio de la plataforma + dominio propio) pero solo uno es
     * el canónico. Nulo mientras el tenant no tenga ningún dominio asignado.
     */
    public readonly primaryDomain: string | null,
  ) {}
}

/**
 * Tenant de respaldo cuando la petición no trae dominio o el dominio no
 * está registrado. Permite que el sitio "principal" siga funcionando sin
 * configuración extra en desarrollo.
 */
export const DEFAULT_TENANT_SLUG = 'default';
