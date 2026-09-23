import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { BrandSchema, type Brand, type BrandUpdate } from '../domain/BrandSchema';
import type { BrandRepository } from '../domain/BrandRepository';

export class PrismaBrandRepository implements BrandRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async find(tenantId: string): Promise<Brand> {
    const record = await this.prisma.tenantBrand.findUnique({ where: { tenantId } });
    return this.toDomain(record);
  }

  public async update(tenantId: string, changes: BrandUpdate): Promise<Brand> {
    const current = await this.find(tenantId);
    // Merge por sección: mandar `palette` la reemplaza entera; no mandarla la deja intacta.
    const next: Brand = {
      palette: changes.palette ?? current.palette,
      typography: changes.typography ?? current.typography,
      assets: changes.assets ?? current.assets,
      colorMode: changes.colorMode ?? current.colorMode,
      visualStyle: changes.visualStyle ?? current.visualStyle,
    };

    const record = await this.prisma.tenantBrand.upsert({
      where: { tenantId },
      create: { tenantId, ...next },
      update: next,
    });
    return this.toDomain(record);
  }

  // Una fila inválida cae en la marca por defecto: un dato de marca roto nunca rompe la página.
  private toDomain(record: unknown): Brand {
    if (record === null || record === undefined) {
      return BrandSchema.parse({});
    }
    const { palette, typography, assets, colorMode, visualStyle } = record as Record<
      string,
      unknown
    >;
    const parsed = BrandSchema.safeParse({
      palette,
      typography,
      assets,
      colorMode,
      visualStyle,
    });
    return parsed.success ? parsed.data : BrandSchema.parse({});
  }
}
