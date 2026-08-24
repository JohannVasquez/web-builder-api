import type { PrismaClient } from '../../src/shared/infrastructure/prisma/generated/client';
import type { Seeder } from './Seeder';

export interface GlobalSettingsSeedParams {
  readonly tenantId: number;
  readonly settings: Readonly<Record<string, string>>;
}

export class GlobalSettingsSeeder implements Seeder<GlobalSettingsSeedParams> {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(params: GlobalSettingsSeedParams): Promise<void> {
    for (const [key, value] of Object.entries(params.settings)) {
      await this.prisma.globalSetting.upsert({
        where: { tenantId_key: { tenantId: params.tenantId, key } },
        update: { value },
        create: { tenantId: params.tenantId, key, value },
      });
    }
  }
}
