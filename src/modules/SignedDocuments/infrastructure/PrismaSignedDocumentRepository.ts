import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { SignedDocument } from '../domain/SignedDocument';
import { SignedDocumentRepository } from '../domain/SignedDocumentRepository';

export class PrismaSignedDocumentRepository implements SignedDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async record(tenantId: string, document: string, version: string, signedBy: string): Promise<SignedDocument> {
    const created = await this.prisma.signedDocument.create({
      data: {
        tenantId,
        document,
        version,
        signedBy,
      },
    });
    return new SignedDocument(
      created.id,
      created.tenantId,
      created.document,
      created.version,
      created.signedBy,
      created.createdAt,
    );
  }

  public async findByTenant(tenantId: string): Promise<SignedDocument[]> {
    const records = await this.prisma.signedDocument.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(
      (r: { id: string; tenantId: string; document: string; version: string; signedBy: string; createdAt: Date }) =>
        new SignedDocument(
          r.id,
          r.tenantId,
          r.document,
          r.version,
          r.signedBy,
          r.createdAt,
        ),
    );
  }

  public async findTenantsNotOnVersion(document: string, currentVersion: string): Promise<string[]> {
    // Obtenemos el último registro de cada tenant para el documento dado
    const latest = await this.prisma.signedDocument.findMany({
      where: { document },
      orderBy: { createdAt: 'desc' },
      distinct: ['tenantId'],
      select: {
        tenantId: true,
        version: true,
      },
    });

    // Retornamos aquellos cuya última versión firmada no es la actual
    return latest
      .filter((record: { tenantId: string; version: string }) => record.version !== currentVersion)
      .map((record: { tenantId: string; version: string }) => record.tenantId);
  }
}
