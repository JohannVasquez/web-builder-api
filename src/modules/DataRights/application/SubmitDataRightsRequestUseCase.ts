import {
  VERIFICATION_HOURS,
  type DataRightsRequestInput,
} from '../domain/DataRightsRequest';
import type { DataRightsRepository } from '../domain/DataRightsRepository';
import type { DataRightsMailer } from '../domain/DataRightsMailer';
import {
  generateVerificationToken,
  hashVerificationToken,
} from '../domain/verificationToken';

export class SubmitDataRightsRequestUseCase {
  constructor(
    private readonly repository: DataRightsRepository,
    private readonly mailer: DataRightsMailer,
  ) {}

  /**
   * No devuelve nada que permita saber si el correo existe en la base. Quien pide ejercer un
   * derecho sobre un correo ajeno no puede enterarse, por la respuesta, de si esa persona es
   * cliente del sitio.
   */
  public async execute(
    tenantId: string,
    input: DataRightsRequestInput,
    verifyUrlFor: (token: string) => string,
    now = new Date(),
  ): Promise<void> {
    const token = generateVerificationToken();
    const expiresAt = new Date(now.getTime() + VERIFICATION_HOURS * 60 * 60 * 1000);

    await this.repository.create(tenantId, {
      right: input.right,
      email: input.email,
      details: input.details,
      verificationTokenHash: hashVerificationToken(token),
      verificationExpiresAt: expiresAt,
    });

    await this.mailer.sendVerification(input.email, input.right, verifyUrlFor(token));
  }
}
