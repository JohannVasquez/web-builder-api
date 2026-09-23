import {
  Prisma,
  type PrismaClient,
} from '@/shared/infrastructure/prisma/generated/client';
import type {
  ClaimResult,
  IdempotencyStore,
  StoredResponse,
} from '../domain/IdempotencyStore';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const TTL_MS = 24 * 60 * 60 * 1000;

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

const asJsonColumn = (value: unknown): object => value as object;

export class PrismaIdempotencyStore implements IdempotencyStore {
  constructor(private readonly prisma: PrismaClient) {}

  public async claim(
    tenantId: string,
    scope: string,
    key: string,
    requestHash: string,
  ): Promise<ClaimResult> {
    const now = new Date();
    // Una clave vencida no protege nada: se libera antes de intentar reservarla.
    await this.prisma.idempotencyKey.deleteMany({
      where: { tenantId, scope, key, expiresAt: { lte: now } },
    });

    try {
      // La restricción única de la base es la que decide quién gana entre dos peticiones
      // simultáneas; consultar antes de insertar dejaría pasar a las dos.
      await this.prisma.idempotencyKey.create({
        data: {
          tenantId,
          scope,
          key,
          requestHash,
          expiresAt: new Date(now.getTime() + TTL_MS),
        },
      });
      return { kind: 'claimed' };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tenantId_scope_key: { tenantId, scope, key } },
    });
    if (existing === null) {
      // Se liberó entre el insert fallido y esta lectura: se trata como en curso.
      return { kind: 'in-progress' };
    }
    if (existing.requestHash !== requestHash) {
      return { kind: 'mismatch' };
    }
    if (existing.status !== 'completed' || existing.responseStatus === null) {
      return { kind: 'in-progress' };
    }
    return {
      kind: 'replay',
      response: { status: existing.responseStatus, body: existing.responseBody },
    };
  }

  public async complete(
    tenantId: string,
    scope: string,
    key: string,
    response: StoredResponse,
  ): Promise<void> {
    await this.prisma.idempotencyKey.updateMany({
      where: { tenantId, scope, key },
      data: {
        status: 'completed',
        responseStatus: response.status,
        responseBody: asJsonColumn(response.body),
      },
    });
  }

  public async release(tenantId: string, scope: string, key: string): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({ where: { tenantId, scope, key } });
  }
}
