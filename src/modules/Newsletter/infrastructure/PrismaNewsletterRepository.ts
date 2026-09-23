import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type { NewsletterRepository } from '../domain/NewsletterRepository';
import type { NewsletterSubscriber } from '../domain/NewsletterSchema';
import { generateUnsubscribeToken } from '../domain/unsubscribeToken';

export class PrismaNewsletterRepository implements NewsletterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async subscribe(tenantId: string, email: string): Promise<string> {
    const normalized = email.trim().toLowerCase();
    // Volver a suscribirse reactiva una baja previa; por eso `unsubscribedAt: null`. El token
    // NO se regenera: los enlaces de baja de correos ya enviados tienen que seguir sirviendo.
    const record = await this.prisma.newsletterSubscriber.upsert({
      where: { tenantId_email: { tenantId, email: normalized } },
      update: { unsubscribedAt: null },
      create: {
        tenantId,
        email: normalized,
        unsubscribeToken: generateUnsubscribeToken(),
      },
      select: { unsubscribeToken: true },
    });
    return record.unsubscribeToken;
  }

  public async unsubscribe(token: string): Promise<boolean> {
    // `updateMany` y no `update` porque un token inexistente no es un error: es alguien
    // volviendo a pinchar un enlace viejo, y eso responde lo mismo que la primera vez.
    const { count } = await this.prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: token, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
    if (count > 0) {
      return true;
    }
    // Ya estaba de baja: sigue siendo un token válido.
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true },
    });
    return existing !== null;
  }

  public async list(
    tenantId: string,
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
