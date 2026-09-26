import type { NextFunction, Request, Response } from 'express';
import { GetSubscriptionsOverviewUseCase } from '../application/GetSubscriptionsOverviewUseCase';
import { GetSubscriptionStatusUseCase } from '../application/GetSubscriptionStatusUseCase';
import { RegisterSubscriptionPaymentUseCase } from '../application/RegisterSubscriptionPaymentUseCase';
import { UpdateSubscriptionUseCase } from '../application/UpdateSubscriptionUseCase';
import { ExportBillingCsvUseCase } from '../application/ExportBillingCsvUseCase';
import { SubscriptionPaymentSchema, SubscriptionSchema } from '../domain/Subscription';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import { ForbiddenError } from '@/shared/domain/ForbiddenError';
import { idSchema } from '@/shared/domain/identifier';

const TenantIdSchema = idSchema;

export class AdminSubscriptionController {
  constructor(
    private readonly overview: GetSubscriptionsOverviewUseCase,
    private readonly status: GetSubscriptionStatusUseCase,
    private readonly registerPayment: RegisterSubscriptionPaymentUseCase,
    private readonly updateSub: UpdateSubscriptionUseCase,
    private readonly exportCsv: ExportBillingCsvUseCase,
  ) {}

  public overviewAction = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.overview.execute();
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  public exportAction = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const csv = await this.exportCsv.execute();
      res.header('Content-Type', 'text/csv');
      res.attachment('subscriptions.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };

  public statusAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = TenantIdSchema.parse(req.params.tenantId);
      const result = await this.status.execute(tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  public registerPaymentAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getRequestActor(res);
      if (actor.permission !== 'full' && actor.role !== 'owner') {
        throw new ForbiddenError('Registrar un pago requiere permisos elevados (full u owner).');
      }

      const tenantId = TenantIdSchema.parse(req.params.tenantId);
      const input = SubscriptionPaymentSchema.parse(req.body);
      
      await this.registerPayment.execute(tenantId, {
        amountCents: input.amountCents,
        paidAt: new Date(input.paidAt),
        paymentMethod: input.paymentMethod,
      });

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  public updateAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = TenantIdSchema.parse(req.params.tenantId);
      const input = SubscriptionSchema.parse(req.body);
      
      const sub = await this.updateSub.execute(tenantId, {
        planName: input.planName,
        priceCents: input.priceCents,
        startsAt: new Date(input.startsAt),
        billingDay: input.billingDay,
      });

      res.json(sub.toPrimitives());
    } catch (error) {
      next(error);
    }
  };
}
