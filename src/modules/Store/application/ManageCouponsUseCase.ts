import { BadRequestError } from '../../../shared/domain/BadRequestError';
import type { Coupon, CouponInput, CouponUpdate } from '../domain/Coupon';
import type { CouponRepository } from '../domain/CouponRepository';

export class ManageCouponsUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  public async list(tenantId: number): Promise<Coupon[]> {
    return this.couponRepository.findAllByTenant(tenantId);
  }

  public async create(tenantId: number, input: CouponInput): Promise<Coupon> {
    const existing = await this.couponRepository.findByCode(tenantId, input.code);
    if (existing !== null) {
      throw new BadRequestError(`Ya existe un cupón con el código "${input.code}".`);
    }
    return this.couponRepository.create(tenantId, input);
  }

  public async update(
    tenantId: number,
    id: number,
    input: CouponUpdate,
  ): Promise<Coupon> {
    return this.couponRepository.update(tenantId, id, input);
  }

  public async delete(tenantId: number, id: number): Promise<void> {
    await this.couponRepository.delete(tenantId, id);
  }
}
