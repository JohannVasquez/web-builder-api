import type { Request, Response } from 'express';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import type { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import type { SendContactEmailUseCase } from '../application/SendContactEmailUseCase';
import { ContactSchema } from '../domain/ContactSchema';
import { TooManyRequestsError } from '@/shared/domain/TooManyRequestsError';

import { isRequestPreview } from '@/modules/PreviewLink/presentation/previewMiddleware';
import { isDemoRequest } from '@/shared/presentation/demoRequest';

const SUBMISSIONS_PER_MINUTE = 5;

export class ContactController {
  constructor(
    private readonly sendContactEmailUseCase: SendContactEmailUseCase,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public readonly send = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    this.enforceRateLimit(req, tenant.id);
    const isPreview = isRequestPreview(res);

    const input = ContactSchema.parse(req.body);
    await this.sendContactEmailUseCase.execute(
      input,
      tenant.id,
      isPreview,
      isDemoRequest(res),
    );

    // Siempre 200 si el mensaje quedó guardado: que el correo falle es problema nuestro,
    // no del visitante, y volver a enviarlo solo duplicaría el contacto.
    res.status(200).json({
      success: true,
      message: 'Tu mensaje fue enviado correctamente. Te contactaremos pronto.',
    });
  };

  private enforceRateLimit(req: Request, tenantId: string): void {
    const key = `contact:${tenantId}:${req.ip ?? 'desconocida'}`;
    const decision = this.rateLimiter.check(key, SUBMISSIONS_PER_MINUTE);
    if (!decision.allowed) {
      throw new TooManyRequestsError(
        `Recibimos varios mensajes desde tu conexión. Espera ${decision.retryAfterSeconds} segundos antes de volver a enviar.`,
        decision.retryAfterSeconds,
      );
    }
  }
}
