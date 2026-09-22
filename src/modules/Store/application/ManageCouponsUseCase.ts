import { BadRequestError } from '@/shared/domain/BadRequestError';
import type { Coupon, CouponInput, CouponUpdate } from '../domain/Coupon';
import type { CouponRepository } from '../domain/CouponRepository';

export class ManageCouponsUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  public async list(tenantId: string): Promise<Coupon[]> {
    return this.couponRepository.findAllByTenant(tenantId);
  }

  public async create(tenantId: string, input: CouponInput): Promise<Coupon> {
    const existing = await this.couponRepository.findByCode(tenantId, input.code);
    if (existing !== null) {
      throw new BadRequestError(`Ya existe un cupón con el código "${input.code}".`);
    }
    return this.couponRepository.create(tenantId, input);
  }

  public async update(
    tenantId: string,
    id: string,
    input: CouponUpdate,
  ): Promise<Coupon> {
    return this.couponRepository.update(tenantId, id, input);
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.couponRepository.delete(tenantId, id);
  }
}
