import type { Request, Response } from 'express';
import type { IsDomainAllowedUseCase } from '../application/IsDomainAllowedUseCase';

export class TenantController {
  constructor(private readonly isDomainAllowedUseCase: IsDomainAllowedUseCase) {}

  /**
   * Contrato del `ask` de Caddy: recibe `?domain=` y solo el código de estado
   * importa — 2xx autoriza emitir el certificado, cualquier otro lo deniega.
   * El cuerpo es para depurar a mano.
   */
  public readonly checkDomainAllowed = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query: unknown = req.query.domain;
    const domain = typeof query === 'string' ? query : undefined;
    const allowed = await this.isDomainAllowedUseCase.execute(domain);

    res.status(allowed ? 200 : 404).json({ domain: domain ?? null, allowed });
  };
}
