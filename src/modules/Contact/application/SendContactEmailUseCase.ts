import type { GlobalSettingsRepository } from '../../GlobalSettings/domain/GlobalSettingsRepository';
import { ContactRequest } from '../domain/ContactRequest';
import type { ContactMessageRepository } from '../domain/ContactMessageRepository';
import type { ContactInput } from '../domain/ContactSchema';
import type { EmailService } from '../domain/EmailService';

export interface SendContactResult {
  readonly stored: boolean;
  readonly emailed: boolean;
}

export class SendContactEmailUseCase {
  constructor(
    private readonly emailService: EmailService,
    private readonly globalSettingsRepository: GlobalSettingsRepository,
    private readonly contactMessageRepository: ContactMessageRepository,
  ) {}

  public async execute(
    input: ContactInput,
    tenantId: number,
  ): Promise<SendContactResult> {
    const contact = ContactRequest.fromInput(input);

    // Guardar primero: si el SMTP está caído, el negocio no pierde el contacto (SPEC 6.6).
    const stored = await this.contactMessageRepository.save(tenantId, contact);

    const settings = await this.globalSettingsRepository.find(tenantId);
    const recipient = this.normalizeRecipients(settings.get('contactEmail'));

    try {
      await this.emailService.sendContactEmail(contact, recipient);
      await this.contactMessageRepository.markEmailed(stored.id, null);
      return { stored: true, emailed: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[Contact] No se pudo enviar el correo:', reason);
      await this.contactMessageRepository.markEmailed(stored.id, reason);
      return { stored: true, emailed: false };
    }
  }

  // El tenant puede listar varios correos separados por coma; nodemailer los acepta así.
  private normalizeRecipients(value: string): string | undefined {
    const recipients = value
      .split(',')
      .map((address) => address.trim())
      .filter((address) => address !== '');
    return recipients.length === 0 ? undefined : recipients.join(', ');
  }
}
