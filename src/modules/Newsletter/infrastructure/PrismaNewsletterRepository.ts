import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import type { NewsletterRepository } from '../domain/NewsletterRepository';
import type { NewsletterSubscriber } from '../domain/NewsletterSchema';

export class PrismaNewsletterRepository implements NewsletterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async subscribe(tenantId: number, email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    // Volver a suscribirse reactiva una baja previa; por eso `unsubscribedAt: null`.
    await this.prisma.newsletterSubscriber.upsert({
      where: { tenantId_email: { tenantId, email: normalized } },
      update: { unsubscribedAt: null },
      create: { tenantId, email: normalized },
    });
  }

  public async list(
    tenantId: number,
    limit: number,
    offset: number,
  ): Promise<{ subscribers: NewsletterSubscriber[]; total: number }> {
    const [records, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.newsletterSubscriber.count({ where: { tenantId } }),
    ]);

    return {
      subscribers: records.map((record) => ({
        id: record.id,
        email: record.email,
        unsubscribedAt: record.unsubscribedAt?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
      })),
      total,
    };
  }
}
