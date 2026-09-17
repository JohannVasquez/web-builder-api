import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { NavigationLink } from '../domain/NavigationLink';
import type { NavigationRepository } from '../domain/NavigationRepository';
import type { NavigationInput } from '../domain/NavigationSchema';

export class PrismaNavigationRepository implements NavigationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findAll(tenantId: number): Promise<NavigationLink[]> {
    const rows = await this.prisma.navigationLink.findMany({
      where: { tenantId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => new NavigationLink(row.label, row.href, row.position));
  }

  public async replace(
    tenantId: number,
    input: NavigationInput,
  ): Promise<NavigationLink[]> {
    // Borrar y volver a crear dentro de una transacción: `(tenantId, position)` es único,
    // así que actualizar en el sitio chocaría a la mitad de cualquier reordenamiento.
    await this.prisma.$transaction(async (tx) => {
      await tx.navigationLink.deleteMany({ where: { tenantId } });
      if (input.links.length > 0) {
        await tx.navigationLink.createMany({
          data: input.links.map((link, index) => ({
            tenantId,
            label: link.label,
            href: link.href,
            position: index + 1,
          })),
        });
      }
    });
    return this.findAll(tenantId);
  }
}
