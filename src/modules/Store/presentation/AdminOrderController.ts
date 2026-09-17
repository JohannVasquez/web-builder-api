import type { Request, Response } from 'express';
import { z } from 'zod';
import { BadRequestError } from '../../../shared/domain/BadRequestError';
import { ORDER_STATUSES } from '../domain/Order';
import { CouponInputSchema, CouponUpdateSchema } from '../domain/Coupon';
import { StoreSettingsUpdateSchema } from '../domain/StoreSettings';
import type { ManageCouponsUseCase } from '../application/ManageCouponsUseCase';
import type { ManageOrdersUseCase } from '../application/ManageOrdersUseCase';
import type { ManageStoreSettingsUseCase } from '../application/ManageStoreSettingsUseCase';
import type { TenantRepository } from '../../Tenant/domain/TenantRepository';

const OrderQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

const StatusSchema = z.strictObject({ status: z.enum(ORDER_STATUSES) });

const ReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class AdminOrderController {
  constructor(
    private readonly orders: ManageOrdersUseCase,
    private readonly coupons: ManageCouponsUseCase,
    private readonly settings: ManageStoreSettingsUseCase,
    private readonly tenants: TenantRepository,
  ) {}

  public readonly listOrders = async (req: Request, res: Response): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const query = OrderQuerySchema.parse(req.query);
    const { orders, total } = await this.orders.list(tenantId, query);
    res.json({
      orders: orders.map((order) => order.toPrimitives()),
      total,
      page: query.page,
      perPage: query.perPage,
    });
  };

  public readonly getOrder = async (req: Request, res: Response): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const order = await this.orders.find(tenantId, this.idOf(req, 'orderId'));
    res.json({ order: order.toPrimitives() });
  };

  public readonly changeOrderStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const { status } = StatusSchema.parse(req.body);
    const tenant = await this.tenants.findById(tenantId);
    const order = await this.orders.changeStatus(
      tenantId,
      this.idOf(req, 'orderId'),
      status,
      tenant?.name ?? 'la tienda',
    );
    res.json({ order: order.toPrimitives() });
  };

  public readonly report = async (req: Request, res: Response): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const { from, to } = ReportQuerySchema.parse(req.query);
    const until = to ?? new Date();
    const since = from ?? new Date(until.getTime() - THIRTY_DAYS_MS);
    res.json({ report: await this.orders.report(tenantId, since, until) });
  };

  public readonly getSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.settings.find(this.tenantIdOf(req));
    res.json({ store: settings.toPrimitives() });
  };

  public readonly saveSettings = async (req: Request, res: Response): Promise<void> => {
    const update = StoreSettingsUpdateSchema.parse(req.body);
    const settings = await this.settings.save(this.tenantIdOf(req), update);
    res.json({ store: settings.toPrimitives() });
  };

  public readonly listCoupons = async (req: Request, res: Response): Promise<void> => {
    const coupons = await this.coupons.list(this.tenantIdOf(req));
    res.json({ coupons: coupons.map((coupon) => coupon.toPrimitives()) });
  };

  public readonly createCoupon = async (req: Request, res: Response): Promise<void> => {
    const input = CouponInputSchema.parse(req.body);
    const coupon = await this.coupons.create(this.tenantIdOf(req), input);
    res.status(201).json({ coupon: coupon.toPrimitives() });
  };

  public readonly updateCoupon = async (req: Request, res: Response): Promise<void> => {
    const input = CouponUpdateSchema.parse(req.body);
    const coupon = await this.coupons.update(
      this.tenantIdOf(req),
      this.idOf(req, 'couponId'),
      input,
    );
    res.json({ coupon: coupon.toPrimitives() });
  };

  public readonly removeCoupon = async (req: Request, res: Response): Promise<void> => {
    await this.coupons.delete(this.tenantIdOf(req), this.idOf(req, 'couponId'));
    res.status(204).send();
  };

  private tenantIdOf(req: Request): number {
    return this.idOf(req, 'tenantId');
  }

  private idOf(req: Request, param: string): number {
    const value = Number(req.params[param]);
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestError(`El identificador "${param}" no es válido.`);
    }
    return value;
  }
}
