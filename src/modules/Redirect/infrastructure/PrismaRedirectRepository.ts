import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { Redirect, type RedirectStatusCode } from '../domain/Redirect';
import type { RedirectRepository } from '../domain/RedirectRepository';

interface RedirectRow {
  readonly id: string;
  readonly fromPath: string;
  readonly toPath: string;
  readonly statusCode: number;
  readonly createdAt: Date;
}

// Un código raro en la base se sirve como permanente, que es el caso normal de esta tabla.
const toStatusCode = (value: number): RedirectStatusCode => (value === 302 ? 302 : 301);

const toDomain = (row: RedirectRow): Redirect =>
  new Redirect(
    row.id,
    row.fromPath,
    row.toPath,
    toStatusCode(row.statusCode),
    row.createdAt,
  );

export class PrismaRedirectRepository implements RedirectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async listByTenant(tenantId: string): Promise<Redirect[]> {
    const rows = await this.prisma.redirect.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  public async findByFrom(tenantId: string, fromPath: string): Promise<Redirect | null> {
    const row = await this.prisma.redirect.findUnique({
      where: { tenantId_fromPath: { tenantId, fromPath } },
    });
    return row === null ? null : toDomain(row);
  }

  public async upsert(
    tenantId: string,
    fromPath: string,
    toPath: string,
    statusCode: RedirectStatusCode,
  ): Promise<Redirect> {
    const row = await this.prisma.redirect.upsert({
      where: { tenantId_fromPath: { tenantId, fromPath } },
      update: { toPath, statusCode },
      create: { tenantId, fromPath, toPath, statusCode },
    });
    return toDomain(row);
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.redirect.deleteMany({ where: { tenantId, id } });
  }
}
