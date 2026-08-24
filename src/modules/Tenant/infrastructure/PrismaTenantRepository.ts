import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { Tenant } from '../domain/Tenant';
import type { TenantRepository } from '../domain/TenantRepository';

/** Forma mínima que necesita el mapeo, común a ambas consultas. */
interface TenantRecord {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly domains: readonly { readonly domain: string }[];
}

export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Busca por cualquiera de los dominios del tenant (subdominio de la
   * plataforma o dominio propio), no solo por el canónico. Los dominios sin
   * verificar se ignoran: existen en la BD pero todavía no sirven tráfico.
   */
  public async findByDomain(domain: string): Promise<Tenant | null> {
    const record = await this.prisma.tenantDomain.findFirst({
      where: { domain, verifiedAt: { not: null } },
      include: {
        tenant: {
          include: { domains: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });
    return record === null ? null : this.toDomain(record.tenant);
  }

  public async findBySlug(slug: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { slug },
      include: { domains: { where: { isPrimary: true }, take: 1 } },
    });
    return record === null ? null : this.toDomain(record);
  }

  private toDomain(record: TenantRecord): Tenant {
    return new Tenant(
      record.id,
      record.slug,
      record.name,
      record.domains[0]?.domain ?? null,
    );
  }
}
