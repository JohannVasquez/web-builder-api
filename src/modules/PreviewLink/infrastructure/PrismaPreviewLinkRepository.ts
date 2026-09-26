import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { PreviewLink } from '../domain/PreviewLink';
import type { PreviewLinkRepository } from '../domain/PreviewLinkRepository';

export class PrismaPreviewLinkRepository implements PreviewLinkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    tenantId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PreviewLink> {
    const record = await this.prisma.previewLink.create({
      data: { tenantId, tokenHash, expiresAt },
    });
    return this.toDomain(record);
  }

  public async findByTokenHash(tokenHash: string): Promise<PreviewLink | null> {
    const record = await this.prisma.previewLink.findUnique({
      where: { tokenHash },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findById(tenantId: string, id: string): Promise<PreviewLink | null> {
    const record = await this.prisma.previewLink.findFirst({
      where: { id, tenantId },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async revoke(id: string): Promise<void> {
    await this.prisma.previewLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }): PreviewLink {
    return new PreviewLink(
      record.id,
      record.tenantId,
      record.expiresAt,
      record.revokedAt,
      record.createdAt,
    );
  }
}
