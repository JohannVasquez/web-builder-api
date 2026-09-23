import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  CLAIM_KINDS,
  CLAIM_STATUSES,
  ConsumerClaim,
  type ClaimKind,
  type ClaimStatus,
  type ConsumerClaimInput,
} from '../domain/ConsumerClaim';
import type { ConsumerClaimRepository } from '../domain/ConsumerClaimRepository';

interface ClaimRow {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly orderNumber: string | null;
  readonly email: string;
  readonly message: string;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
}

const toKind = (value: string): ClaimKind =>
  (CLAIM_KINDS as readonly string[]).includes(value) ? (value as ClaimKind) : 'reclamo';

const toStatus = (value: string): ClaimStatus =>
  (CLAIM_STATUSES as readonly string[]).includes(value)
    ? (value as ClaimStatus)
    : 'pendiente';

const toDomain = (row: ClaimRow): ConsumerClaim =>
  new ConsumerClaim(
    row.id,
    toKind(row.kind),
    toStatus(row.status),
    row.orderNumber,
    row.email,
    row.message,
    row.createdAt,
    row.resolvedAt,
  );

export class PrismaConsumerClaimRepository implements ConsumerClaimRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    tenantId: string,
    input: ConsumerClaimInput,
  ): Promise<ConsumerClaim> {
    const row = await this.prisma.consumerClaim.create({
      data: {
        tenantId,
        kind: input.kind,
        orderNumber: input.orderNumber,
        email: input.email.trim().toLowerCase(),
        message: input.message,
      },
    });
    return toDomain(row);
  }

  public async listByStatus(
    tenantId: string,
    status: ClaimStatus | null,
  ): Promise<ConsumerClaim[]> {
    const rows = await this.prisma.consumerClaim.findMany({
      where: { tenantId, ...(status === null ? {} : { status }) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }

  public async resolve(
    tenantId: string,
    id: string,
    status: ClaimStatus,
    at: Date,
  ): Promise<void> {
    await this.prisma.consumerClaim.updateMany({
      where: { tenantId, id },
      data: { status, resolvedAt: at },
    });
  }
}
