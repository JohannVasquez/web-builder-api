import type { Coupon, CouponInput, CouponUpdate } from './Coupon';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class CouponRepository {
  public abstract findByCode(tenantId: string, code: string): Promise<Coupon | null>;
  public abstract findAllByTenant(tenantId: string): Promise<Coupon[]>;
  public abstract create(tenantId: string, input: CouponInput): Promise<Coupon>;
  public abstract update(
    tenantId: string,
    id: string,
    input: CouponUpdate,
  ): Promise<Coupon>;
  public abstract delete(tenantId: string, id: string): Promise<void>;
  // Se llama al confirmar el pago, no al crear el pedido: un carrito abandonado no
  // debería gastar un cupón de uso limitado.
  public abstract registerUse(tenantId: string, code: string): Promise<void>;
}
