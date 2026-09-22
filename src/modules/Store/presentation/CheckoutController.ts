import type { Request, Response } from 'express';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import { CartSchema, CheckoutSchema } from '../domain/Order';
import { StoreDisabledError } from '../domain/StoreDisabledError';
import type { CheckoutUseCase } from '../application/CheckoutUseCase';
import type { ConfirmPaymentUseCase } from '../application/ConfirmPaymentUseCase';
import type { QuoteCartUseCase } from '../application/QuoteCartUseCase';

export class CheckoutController {
  constructor(
    private readonly quoteCartUseCase: QuoteCartUseCase,
    private readonly checkoutUseCase: CheckoutUseCase,
    private readonly confirmPaymentUseCase: ConfirmPaymentUseCase,
  ) {}

  // Lo que el sitio muestra como configuración de tienda: nunca las credenciales de cobro.
  public readonly settings = async (_req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const settings = await this.quoteCartUseCase.settingsFor(tenant.id);
    if (!settings.isEnabled) {
      throw new StoreDisabledError();
    }
    // El sitio necesita saber si mostrar la casilla de términos y a qué página enlazar; solo
    // se informa si la página está publicada, igual que la regla del checkout.
    const terms = await this.checkoutUseCase.activeTerms(tenant.id, settings);
    res.json({
      store: { ...settings.toPrimitives(), termsPageSlug: terms?.slug ?? null },
    });
  };

  public readonly quote = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const input = CartSchema.parse(req.body);
    const quote = await this.quoteCartUseCase.execute(tenant.id, input);
    // Va con la cotización porque es parte de lo que hace falta para comprar: así el sitio
    // sabe si mostrar la casilla de términos sin otra llamada.
    const settings = await this.quoteCartUseCase.settingsFor(tenant.id);
    const terms = await this.checkoutUseCase.activeTerms(tenant.id, settings);
    res.json({ ...quote, termsPageSlug: terms?.slug ?? null });
  };

  public readonly checkout = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const input = CheckoutSchema.parse(req.body);
    // El proveedor tiene que avisar al dominio del propio cliente: es el único host que
    // enruta hacia la API resolviendo ese tenant.
    const origin = `${req.protocol}://${req.headers.host ?? 'localhost'}`;
    const result = await this.checkoutUseCase.execute(tenant.id, input, {
      returnUrl: `${origin}/tienda/gracias`,
      confirmationUrl: `${origin}/api/store/payment-callback`,
    });
    res.status(201).json({
      order: result.order.toPrimitives(),
      redirectUrl: result.redirectUrl,
      instructions: result.instructions,
    });
  };

  // El proveedor de pago llama acá sin sesión: la confianza viene de volver a
  // preguntarle al proveedor, no de que la petición haya llegado.
  public readonly confirm = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const payload = {
      ...(req.body as Record<string, unknown>),
      ...(req.query as Record<string, unknown>),
    };
    const result = await this.confirmPaymentUseCase.execute(
      tenant.id,
      tenant.name,
      payload,
    );
    res.status(200).json(result);
  };
}
