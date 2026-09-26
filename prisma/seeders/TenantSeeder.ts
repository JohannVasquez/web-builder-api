import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type { Seeder } from './Seeder';

export interface TenantSeedParams {
  readonly slug: string;
  readonly name: string;
  /**
   * Dominios (sin puerto) con los que la API resuelve el tenant. El primero
   * es el canónico; los demás son alias válidos, igual que lo sería el
   * dominio propio que un cliente compre más adelante. Se siembran como ya
   * verificados: son dominios nuestros, no hay nada que comprobar.
   */
  readonly domains: readonly string[];
}

export interface SeededTenant {
  readonly id: string;
  readonly slug: string;
}

export class TenantSeeder implements Seeder<TenantSeedParams, SeededTenant> {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(params: TenantSeedParams): Promise<SeededTenant> {
    const tenant = await this.prisma.tenant.upsert({
      where: { slug: params.slug },
      update: { name: params.name },
      create: { slug: params.slug, name: params.name },
    });

    // Los dominios que el template ya no declara se retiran, para que
    // re-sembrar deje exactamente la lista descrita.
    await this.prisma.tenantDomain.deleteMany({
      where: { tenantId: tenant.id, domain: { notIn: [...params.domains] } },
    });

    const verifiedAt = new Date();
    for (const [index, domain] of params.domains.entries()) {
      const attributes = { tenantId: tenant.id, isPrimary: index === 0, verifiedAt };
      await this.prisma.tenantDomain.upsert({
        where: { domain },
        update: attributes,
        create: { domain, ...attributes },
      });
    }

    return { id: tenant.id, slug: tenant.slug };
  }
}
