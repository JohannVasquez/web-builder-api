import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import { TooManyRequestsError } from '@/shared/domain/TooManyRequestsError';
import { idSchema } from '@/shared/domain/identifier';
import { isDemoRequest } from '@/shared/presentation/demoRequest';
import type { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import { CLAIM_STATUSES, ConsumerClaimSchema } from '../domain/ConsumerClaim';
import type { SubmitConsumerClaimUseCase } from '../application/SubmitConsumerClaimUseCase';
import type { ManageConsumerClaimsUseCase } from '../application/ManageConsumerClaimsUseCase';

const CLAIMS_PER_MINUTE = 5;

const ListQuerySchema = z.object({ status: z.enum(CLAIM_STATUSES).optional() });
const ResolveBodySchema = z.strictObject({
  status: z.enum(['aceptado', 'rechazado']),
});

export class ConsumerClaimController {
  constructor(
    private readonly submitUseCase: SubmitConsumerClaimUseCase,
    private readonly manageUseCase: ManageConsumerClaimsUseCase,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public readonly submit = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    this.enforceRateLimit(req, tenant.id);

    const input = ConsumerClaimSchema.parse(req.body);
    const claim = await this.submitUseCase.execute(
      tenant.id,
      input,
      new Date(),
      !isDemoRequest(res),
    );

    res.status(201).json({
      claim: claim.toPrimitives(),
      message:
        input.kind === 'retracto'
          ? 'Recibimos tu retracto. Te responderemos a este correo.'
          : 'Recibimos tu reclamo. Te responderemos a este correo.',
    });
  };

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = idSchema.parse(req.params.tenantId);
    const { status } = ListQuerySchema.parse(req.query);
    res.json({ claims: await this.manageUseCase.list(tenantId, status ?? null) });
  };

  public readonly resolve = async (req: Request, res: Response): Promise<void> => {
    const tenantId = idSchema.parse(req.params.tenantId);
    const id = idSchema.parse(req.params.claimId);
    const { status } = ResolveBodySchema.parse(req.body);
    await this.manageUseCase.resolve(tenantId, id, status);
    res.status(204).send();
  };

  private enforceRateLimit(req: Request, tenantId: string): void {
    const key = `claims:${tenantId}:${req.ip ?? 'desconocida'}`;
    const decision = this.rateLimiter.check(key, CLAIMS_PER_MINUTE);
    if (!decision.allowed) {
      throw new TooManyRequestsError(
        `Recibimos varias solicitudes desde tu conexión. Espera ${decision.retryAfterSeconds} segundos.`,
        decision.retryAfterSeconds,
      );
    }
  }
}
