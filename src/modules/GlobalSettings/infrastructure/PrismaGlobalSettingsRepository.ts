import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { GlobalSettings } from '../domain/GlobalSettings';
import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';

export class PrismaGlobalSettingsRepository implements GlobalSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async find(): Promise<GlobalSettings> {
    const rows = await this.prisma.globalSetting.findMany();
    const record: Record<string, string> = {};
    for (const row of rows) {
      record[row.key] = row.value;
    }
    return GlobalSettings.fromRecord(record);
  }
}
