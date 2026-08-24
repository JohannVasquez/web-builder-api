import type { PrismaClient } from '../../src/shared/infrastructure/prisma/generated/client';
import type { Seeder } from './Seeder';

export interface NavigationLinkSeed {
  readonly label: string;
  readonly href: string;
  readonly position: number;
}

export interface NavigationSeedParams {
  readonly tenantId: number;
  readonly links: readonly NavigationLinkSeed[];
}

export class NavigationSeeder implements Seeder<NavigationSeedParams> {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(params: NavigationSeedParams): Promise<void> {
    await this.prisma.navigationLink.deleteMany({
      where: { tenantId: params.tenantId },
    });
    await this.prisma.navigationLink.createMany({
      data: params.links.map((link) => ({
        tenantId: params.tenantId,
        label: link.label,
        href: link.href,
        position: link.position,
      })),
    });
  }
}
