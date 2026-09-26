import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  DEMO_OUTCOMES,
  STORED_DISCARD_REASONS,
  type DemoOutcome,
  type StoredDiscardReason,
} from '../domain/Demo';
import type { DemoMetricsRow } from '../domain/DemoMetrics';
import type { DemoMetricsRepository } from '../domain/DemoMetricsRepository';

const toOutcome = (value: string | null): DemoOutcome | null =>
  (DEMO_OUTCOMES as readonly string[]).includes(value ?? '')
    ? (value as DemoOutcome)
    : null;

const toDiscardReason = (value: string | null): StoredDiscardReason | null =>
  (STORED_DISCARD_REASONS as readonly string[]).includes(value ?? '')
    ? (value as StoredDiscardReason)
    : null;

export class PrismaDemoMetricsRepository implements DemoMetricsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Solo columnas de la propia fila: ni el sitio ni el prospecto, que una borrada ya no tiene.
  public async findCreatedBetween(start: Date, end: Date): Promise<DemoMetricsRow[]> {
    const records = await this.prisma.demo.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        industry: true,
        templateId: true,
        actorType: true,
        actorName: true,
        createdAt: true,
        expiresAt: true,
        outcome: true,
        outcomeAt: true,
        discardReason: true,
        extensionCount: true,
        visitCount: true,
        firstVisitAt: true,
        purgedAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => ({
      industry: record.industry,
      templateId: record.templateId,
      creator: {
        type: record.actorType === 'apiKey' ? 'apiKey' : 'admin',
        name: record.actorName,
      },
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      outcome: toOutcome(record.outcome),
      outcomeAt: record.outcomeAt,
      discardReason: toDiscardReason(record.discardReason),
      extensionCount: record.extensionCount,
      visitCount: record.visitCount,
      firstVisitAt: record.firstVisitAt,
      purgedAt: record.purgedAt,
    }));
  }
}
