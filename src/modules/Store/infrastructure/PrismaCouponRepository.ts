import { NotFoundError } from '@/shared/domain/NotFoundError';
import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  Coupon,
  DISCOUNT_TYPES,
  type CouponInput,
  type CouponUpdate,
  type DiscountType,
} from '../domain/Coupon';
import type { CouponRepository } from '../domain/CouponRepository';

interface CouponRecord {
  readonly id: string;
  readonly code: string;
  readonly discountType: string;
  readonly value: number;
  readonly minimumCents: number | null;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
  readonly maxUses: number | null;
  readonly usedCount: number;
  readonly isActive: boolean;
}

const toDate = (value: string | null | undefined): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(value);

export class PrismaCouponRepository implements CouponRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByCode(tenantId: string, code: string): Promise<Coupon | null> {
    const record = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findAllByTenant(tenantId: string): Promise<Coupon[]> {
    const records = await this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  public async create(tenantId: string, input: CouponInput): Promise<Coupon> {
    const record = await this.prisma.coupon.create({
      data: {
        tenantId,
        code: input.code,
        discountType: input.discountType,
        value: input.value,
        minimumCents: input.minimumCents,
        startsAt: input.startsAt === null ? null : new Date(input.startsAt),
        endsAt: input.endsAt === null ? null : new Date(input.endsAt),
        maxUses: input.maxUses,
        isActive: input.isActive,
      },
    });
    return this.toDomain(record);
  }

  public async update(
    tenantId: string,
    id: string,
    input: CouponUpdate,
  ): Promise<Coupon> {
    await this.requireOwnership(tenantId, id);
    const record = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(input.code === undefined ? {} : { code: input.code }),
        ...(input.discountType === undefined ? {} : { discountType: input.discountType }),
        ...(input.value === undefined ? {} : { value: input.value }),
        ...(input.minimumCents === undefined ? {} : { minimumCents: input.minimumCents }),
        ...(input.startsAt === undefined ? {} : { startsAt: toDate(input.startsAt) }),
        ...(input.endsAt === undefined ? {} : { endsAt: toDate(input.endsAt) }),
        ...(input.maxUses === undefined ? {} : { maxUses: input.maxUses }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
    return this.toDomain(record);
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.requireOwnership(tenantId, id);
    await this.prisma.coupon.delete({ where: { id } });
  }

  public async registerUse(tenantId: string, code: string): Promise<void> {
    await this.prisma.coupon.updateMany({
      where: { tenantId, code: code.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });
  }

  // Un id adivinado no puede alcanzar el cupón de otro cliente.
  private async requireOwnership(tenantId: string, id: string): Promise<void> {
    const found = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (found === null) {
      throw new NotFoundError('Ese cupón no existe.');
    }
  }

  private toDomain(record: CouponRecord): Coupon {
    const discountType: DiscountType = (DISCOUNT_TYPES as readonly string[]).includes(
      record.discountType,
    )
      ? (record.discountType as DiscountType)
      : 'amount';

    return new Coupon(
      record.id,
      record.code,
      discountType,
      record.value,
      record.minimumCents,
      record.startsAt,
      record.endsAt,
      record.maxUses,
      record.usedCount,
      record.isActive,
    );
  }
}
