import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { GlobalSettings } from '../domain/GlobalSettings';
import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';

export class PrismaGlobalSettingsRepository implements GlobalSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async find(tenantId: string): Promise<GlobalSettings> {
    const rows = await this.prisma.globalSetting.findMany({ where: { tenantId } });
    const record: Record<string, string> = {};
    for (const row of rows) {
      record[row.key] = row.value;
    }
    return GlobalSettings.fromRecord(record);
  }

  public async upsert(tenantId: string, payload: Record<string, string>): Promise<void> {
    const upserts = Object.entries(payload).map(([key, value]) => {
      return this.prisma.globalSetting.upsert({
        where: {
          tenantId_key: { tenantId, key },
        },
        update: { value },
        create: { tenantId, key, value },
      });
    });
    if (upserts.length > 0) {
      await this.prisma.$transaction(upserts);
    }
  }
}
