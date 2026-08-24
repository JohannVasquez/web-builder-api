import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { NavigationLink } from '../domain/NavigationLink';
import type { NavigationRepository } from '../domain/NavigationRepository';

export class PrismaNavigationRepository implements NavigationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findAll(tenantId: number): Promise<NavigationLink[]> {
    const rows = await this.prisma.navigationLink.findMany({
      where: { tenantId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => new NavigationLink(row.label, row.href, row.position));
  }
}
