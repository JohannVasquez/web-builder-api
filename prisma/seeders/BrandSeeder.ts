import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type { BrandUpdate } from '@/modules/Brand/domain/BrandSchema';
import type { Seeder } from './Seeder';

export interface BrandSeedParams {
  readonly tenantId: string;
  readonly brand: BrandUpdate;
}

export class BrandSeeder implements Seeder<BrandSeedParams> {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(params: BrandSeedParams): Promise<void> {
    await this.prisma.tenantBrand.upsert({
      where: { tenantId: params.tenantId },
      update: params.brand,
      create: { tenantId: params.tenantId, ...params.brand },
    });
  }
}
