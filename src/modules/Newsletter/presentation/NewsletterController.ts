import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import type { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import type { SubscribeToNewsletterUseCase } from '../application/SubscribeToNewsletterUseCase';
import type { ListSubscribersUseCase } from '../application/ListSubscribersUseCase';
import type { UnsubscribeFromNewsletterUseCase } from '../application/UnsubscribeFromNewsletterUseCase';
import { SubscribeSchema } from '../domain/NewsletterSchema';
import { TooManyRequestsError } from '@/shared/domain/TooManyRequestsError';
import { idSchema } from '@/shared/domain/identifier';
import { isDemoRequest } from '@/shared/presentation/demoRequest';

const SUBSCRIPTIONS_PER_MINUTE = 5;

const TenantIdSchema = idSchema;
const UnsubscribeParamsSchema = z.object({ token: z.string().max(64) });
const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export class NewsletterController {
  constructor(
    private readonly subscribeUseCase: SubscribeToNewsletterUseCase,
    private readonly listSubscribersUseCase: ListSubscribersUseCase,
    private readonly unsubscribeUseCase: UnsubscribeFromNewsletterUseCase,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public readonly subscribe = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    this.enforceRateLimit(req, tenant.id);

    const { email } = SubscribeSchema.parse(req.body);
    // En una demo nadie se suscribe de verdad: ni se guarda el correo ni su consentimiento,
    // pero quien prueba el formulario ve la misma respuesta.
    if (!isDemoRequest(res)) {
      await this.subscribeUseCase.execute(tenant.id, email);
    }

    res.status(200).json({
      success: true,
      message: 'Listo, te avisaremos de nuestras novedades.',
    });
  };

  /**
   * Sin sesión y sin tenant a propósito: el enlace llega por correo y tiene que funcionar de
   * un clic, que es lo que exige el art. 28 B de la Ley 19.496. El token ya es único en toda
   * la plataforma.
   *
   * Responde 200 aunque el token no exista: decir "ese token no es de nadie" convertiría
   * este endpoint en una forma de comprobar tokens ajenos, y para quien se da de baja el
   * resultado visible es el mismo.
   */
  public readonly unsubscribe = async (req: Request, res: Response): Promise<void> => {
    const { token } = UnsubscribeParamsSchema.parse(req.params);
    await this.unsubscribeUseCase.execute(token);

    res.status(200).json({
      success: true,
      message: 'Listo, no volverás a recibir nuestros correos.',
    });
  };

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const { limit, offset } = ListQuerySchema.parse(req.query);
    res.json(await this.listSubscribersUseCase.execute(tenantId, limit, offset));
  };

  public readonly exportCsv = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const { subscribers } = await this.listSubscribersUseCase.execute(tenantId, 500, 0);

    const rows = [
      ['correo', 'fecha', 'estado'],
      ...subscribers.map((subscriber) => [
        subscriber.email,
        subscriber.createdAt,
        subscriber.unsubscribedAt === null ? 'suscrito' : 'dado de baja',
      ]),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="suscriptores.csv"');
    res.send(rows.map((row) => row.map(escapeCsv).join(',')).join('\n'));
  };

  private enforceRateLimit(req: Request, tenantId: string): void {
    const key = `newsletter:${tenantId}:${req.ip ?? 'desconocida'}`;
    const decision = this.rateLimiter.check(key, SUBSCRIPTIONS_PER_MINUTE);
    if (!decision.allowed) {
      throw new TooManyRequestsError(
        `Recibimos varias suscripciones desde tu conexión. Espera ${decision.retryAfterSeconds} segundos.`,
        decision.retryAfterSeconds,
      );
    }
  }
}

const escapeCsv = (value: string): string => `"${value.replaceAll('"', '""')}"`;
