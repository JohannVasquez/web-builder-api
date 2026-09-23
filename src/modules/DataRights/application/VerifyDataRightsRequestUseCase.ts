import type { DataRightsRepository } from '../domain/DataRightsRepository';
import type { DataRightsMailer } from '../domain/DataRightsMailer';
import { hashVerificationToken, isVerificationToken } from '../domain/verificationToken';
import type { DataRightsRequest } from '../domain/DataRightsRequest';

export type VerificationOutcome =
  | { readonly kind: 'invalido' }
  | { readonly kind: 'atendida'; readonly request: DataRightsRequest }
  | { readonly kind: 'pendiente-de-revision'; readonly request: DataRightsRequest };

/**
 * Confirmado el correo, hay derechos que se resuelven solos y otros que necesitan que alguien
 * mire. Acceso y portabilidad se entregan al instante —son una copia de lo que ya hay— y la
 * cancelación borra. Rectificación y oposición dependen de qué pide la persona, así que
 * quedan a la espera del cliente, con su plazo corriendo.
 */
export class VerifyDataRightsRequestUseCase {
  constructor(
    private readonly repository: DataRightsRepository,
    private readonly mailer: DataRightsMailer,
  ) {}

  public async execute(token: string, now = new Date()): Promise<VerificationOutcome> {
    if (!isVerificationToken(token)) {
      return { kind: 'invalido' };
    }

    const found = await this.repository.findVerifiable(hashVerificationToken(token), now);
    if (found === null) {
      return { kind: 'invalido' };
    }

    const { tenantId, request } = found;
    await this.repository.markStatus(request.id, 'verificada', now);

    if (request.right === 'acceso' || request.right === 'portabilidad') {
      const data = await this.repository.exportFor(tenantId, request.email);
      await this.mailer.sendExport(request.email, data);
      await this.repository.markStatus(request.id, 'resuelta', now);
      return { kind: 'atendida', request };
    }

    if (request.right === 'cancelacion') {
      await this.repository.eraseFor(tenantId, request.email);
      await this.mailer.sendErasureDone(request.email);
      await this.repository.markStatus(request.id, 'resuelta', now);
      return { kind: 'atendida', request };
    }

    return { kind: 'pendiente-de-revision', request };
  }
}
