import type { Coupon, CouponInput, CouponUpdate } from './Coupon';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class CouponRepository {
  public abstract findByCode(tenantId: number, code: string): Promise<Coupon | null>;
  public abstract findAllByTenant(tenantId: number): Promise<Coupon[]>;
  public abstract create(tenantId: number, input: CouponInput): Promise<Coupon>;
  public abstract update(
    tenantId: number,
    id: number,
    input: CouponUpdate,
  ): Promise<Coupon>;
  public abstract delete(tenantId: number, id: number): Promise<void>;
  // Se llama al confirmar el pago, no al crear el pedido: un carrito abandonado no
  // debería gastar un cupón de uso limitado.
  public abstract registerUse(tenantId: number, code: string): Promise<void>;
}
