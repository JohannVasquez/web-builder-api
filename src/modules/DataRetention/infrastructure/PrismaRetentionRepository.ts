import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type {
  RetentionCutoffs,
  RetentionRepository,
  RetentionRun,
} from '../domain/RetentionRepository';

/**
 * Valores con los que se reemplazan los datos personales de un pedido vencido. El pedido no
 * se borra —la normativa tributaria y de consumo obliga a conservar el respaldo de la venta—
 * pero deja de decir quién compró.
 */
const ANONYMIZED = {
  customerName: 'Cliente anonimizado',
  customerEmail: 'anonimizado@invalido.local',
  customerPhone: '',
  customerTaxId: null,
  addressLine: null,
  addressCity: null,
  addressRegion: null,
  addressNotes: null,
};

export class PrismaRetentionRepository implements RetentionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async purge(cutoffs: RetentionCutoffs): Promise<RetentionRun> {
    const contactMessages = await this.prisma.contactMessage.deleteMany({
      where: { createdAt: { lt: cutoffs.contactMessages } },
    });

    // Solo los dados de baja: quien sigue suscrito no tiene un plazo que se cumpla.
    const subscribers = await this.prisma.newsletterSubscriber.deleteMany({
      where: {
        unsubscribedAt: { not: null, lt: cutoffs.unsubscribedSubscribers },
      },
    });

    // El filtro por nombre es lo que hace idempotente la anonimización: un pedido ya tratado
    // no vuelve a contarse en la próxima pasada.
    const orders = await this.prisma.order.updateMany({
      where: {
        createdAt: { lt: cutoffs.orders },
        customerName: { not: ANONYMIZED.customerName },
      },
      data: ANONYMIZED,
    });

    return {
      contactMessagesDeleted: contactMessages.count,
      subscribersDeleted: subscribers.count,
      ordersAnonymized: orders.count,
    };
  }
}
