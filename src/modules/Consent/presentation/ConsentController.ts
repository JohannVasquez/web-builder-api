import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import { TooManyRequestsError } from '@/shared/domain/TooManyRequestsError';
import type { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import { isDemoRequest } from '@/shared/presentation/demoRequest';
import { ConsentInputSchema } from '../domain/Consent';
import type { RecordConsentUseCase } from '../application/RecordConsentUseCase';
import type { GetCurrentConsentUseCase } from '../application/GetCurrentConsentUseCase';

// Alguien podría intentar llenar la tabla desde un navegador. 20 por minuto deja pasar de
// sobra a una persona que cambia de opinión varias veces y corta el abuso.
const CONSENTS_PER_MINUTE = 20;

const CurrentQuerySchema = z.object({
  subject: z.string().trim().min(8).max(128),
  textVersion: z.string().trim().min(1).max(40),
});

export class ConsentController {
  constructor(
    private readonly recordConsentUseCase: RecordConsentUseCase,
    private readonly getCurrentConsentUseCase: GetCurrentConsentUseCase,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public readonly record = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    this.enforceRateLimit(req, tenant.id);

    const input = ConsentInputSchema.parse(req.body);
    const consent = isDemoRequest(res)
      ? this.recordConsentUseCase.simulate(input)
      : await this.recordConsentUseCase.execute(tenant.id, input, {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });

    res.status(201).json({ consent: consent.toPrimitives() });
  };

  public readonly current = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const { subject, textVersion } = CurrentQuerySchema.parse(req.query);

    const { consent, isCurrent } = await this.getCurrentConsentUseCase.execute(
      tenant.id,
      subject,
      textVersion,
    );

    res.json({ consent: consent?.toPrimitives() ?? null, isCurrent });
  };

  private enforceRateLimit(req: Request, tenantId: string): void {
    const key = `consent:${tenantId}:${req.ip ?? 'desconocida'}`;
    const decision = this.rateLimiter.check(key, CONSENTS_PER_MINUTE);
    if (!decision.allowed) {
      throw new TooManyRequestsError(
        `Recibimos demasiadas peticiones desde tu conexión. Espera ${decision.retryAfterSeconds} segundos.`,
        decision.retryAfterSeconds,
      );
    }
  }
}
