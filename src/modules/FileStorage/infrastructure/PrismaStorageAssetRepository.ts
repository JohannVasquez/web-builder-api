import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type {
  AssetUsage,
  MediaAsset,
  StorageAssetPrimitives,
  StorageAssetRepository,
} from '../domain/StorageAssetRepository';

interface AssetRecord {
  readonly key: string;
  readonly mimeType: string;
  readonly size: number;
  readonly originalName: string | null;
  readonly alt: string | null;
  readonly createdAt: Date;
}

export class PrismaStorageAssetRepository implements StorageAssetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async register(asset: StorageAssetPrimitives): Promise<void> {
    await this.prisma.storageAsset.upsert({
      where: { key: asset.key },
      update: {
        mimeType: asset.mimeType,
        size: asset.size,
        tenantId: asset.tenantId ?? null,
        originalName: asset.originalName ?? null,
        alt: asset.alt ?? null,
      },
      create: {
        key: asset.key,
        mimeType: asset.mimeType,
        size: asset.size,
        tenantId: asset.tenantId ?? null,
        originalName: asset.originalName ?? null,
        alt: asset.alt ?? null,
      },
    });
  }

  public async remove(key: string): Promise<void> {
    await this.prisma.storageAsset.deleteMany({ where: { key } });
  }

  public async findByTenant(tenantId: string, search: string): Promise<MediaAsset[]> {
    const term = search.trim();
    const records = await this.prisma.storageAsset.findMany({
      where: {
        tenantId,
        ...(term === ''
          ? {}
          : {
              OR: [
                { originalName: { contains: term, mode: 'insensitive' } },
                { alt: { contains: term, mode: 'insensitive' } },
              ],
            }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toMediaAsset(record));
  }

  // Siempre con `tenantId`: una key adivinada no puede alcanzar la biblioteca de otro.
  public async findKey(tenantId: string, key: string): Promise<MediaAsset | null> {
    const record = await this.prisma.storageAsset.findFirst({ where: { tenantId, key } });
    return record === null ? null : this.toMediaAsset(record);
  }

  public async updateAlt(
    tenantId: string,
    key: string,
    alt: string,
  ): Promise<MediaAsset | null> {
    const existing = await this.findKey(tenantId, key);
    if (existing === null) {
      return null;
    }
    const record = await this.prisma.storageAsset.update({
      where: { key },
      data: { alt },
    });
    return this.toMediaAsset(record);
  }

  // Busca la `key` en el JSON de los bloques, en la marca y en los ajustes del cliente.
  // Es una búsqueda textual a propósito: la key es un UUID, así que un falso positivo es
  // prácticamente imposible, y recorrer cada schema de bloque sería frágil y más lento.
  public async findUsage(tenantId: string, key: string): Promise<AssetUsage[]> {
    const [pages, brand, settings] = await Promise.all([
      this.prisma.page.findMany({
        where: { tenantId, sections: { some: { props: { string_contains: key } } } },
        select: { title: true, slug: true },
      }),
      this.prisma.tenantBrand.findFirst({
        where: { tenantId, assets: { string_contains: key } },
        select: { id: true },
      }),
      this.prisma.globalSetting.findMany({
        where: { tenantId, value: { contains: key } },
        select: { key: true },
      }),
    ]);

    return [
      ...pages.map((page) => ({
        kind: 'page' as const,
        label: `Página "${page.title}" (/${page.slug})`,
      })),
      ...(brand === null
        ? []
        : [{ kind: 'brand' as const, label: 'Identidad de marca del cliente' }]),
      ...settings.map((setting) => ({
        kind: 'settings' as const,
        label: `Ajuste "${setting.key}"`,
      })),
    ];
  }

  private toMediaAsset(record: AssetRecord): MediaAsset {
    return {
      key: record.key,
      mimeType: record.mimeType,
      size: record.size,
      originalName: record.originalName,
      alt: record.alt,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
