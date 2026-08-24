import type { Request, Response } from 'express';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { SendContactEmailUseCase } from '../application/SendContactEmailUseCase';
import { ContactSchema } from '../domain/ContactSchema';

export class ContactController {
  constructor(private readonly sendContactEmailUseCase: SendContactEmailUseCase) {}

  public readonly send = async (req: Request, res: Response): Promise<void> => {
    const input = ContactSchema.parse(req.body);
    const tenant = getRequestTenant(res);
    await this.sendContactEmailUseCase.execute(input, tenant.id);
    res.status(200).json({
      success: true,
      message: 'Tu mensaje fue enviado correctamente. Te contactaremos pronto.',
    });
  };
}
