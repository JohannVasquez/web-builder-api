import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import type {
  ActivityEntry,
  ActivityEntryInput,
  ActivityQuery,
} from '../domain/ActivityEntry';
import type { ActivityLogRepository } from '../domain/ActivityLogRepository';

// Redondea por JSON para descartar lo que Postgres no sabe guardar (undefined, funciones, ciclos).
const toJson = (value: unknown): object | undefined => {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as object;
  } catch {
    return undefined;
  }
};

export class PrismaActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async record(entry: ActivityEntryInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        tenantId: entry.tenantId,
        actorType: entry.actorType,
        actorId: entry.actorId,
        actorName: entry.actorName,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        summary: entry.summary,
        before: toJson(entry.before),
        after: toJson(entry.after),
      },
    });
  }

  public async search(
    query: ActivityQuery,
  ): Promise<{ entries: ActivityEntry[]; total: number }> {
    const where = {
      ...(query.tenantId === undefined ? {} : { tenantId: query.tenantId }),
      ...(query.actorType === undefined ? {} : { actorType: query.actorType }),
      ...(query.actorId === undefined ? {} : { actorId: query.actorId }),
      ...(query.from === undefined && query.to === undefined
        ? {}
        : {
            createdAt: {
              ...(query.from === undefined ? {} : { gte: query.from }),
              ...(query.to === undefined ? {} : { lte: query.to }),
            },
          }),
    };

    const [records, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { entries: records.map((record) => this.toDomain(record)), total };
  }

  private toDomain(record: {
    id: number;
    tenantId: number | null;
    actorType: string;
    actorId: number | null;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string | null;
    summary: string;
    before: unknown;
    after: unknown;
    createdAt: Date;
  }): ActivityEntry {
    return {
      id: record.id,
      tenantId: record.tenantId,
      actorType: record.actorType === 'apiKey' ? 'apiKey' : 'admin',
      actorId: record.actorId,
      actorName: record.actorName,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      summary: record.summary,
      before: record.before,
      after: record.after,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
