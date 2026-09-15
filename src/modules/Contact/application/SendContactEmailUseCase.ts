import type { GlobalSettingsRepository } from '../../GlobalSettings/domain/GlobalSettingsRepository';
import { ContactRequest } from '../domain/ContactRequest';
import type { ContactInput } from '../domain/ContactSchema';
import type { EmailService } from '../domain/EmailService';

export class SendContactEmailUseCase {
  constructor(
    private readonly emailService: EmailService,
    private readonly globalSettingsRepository: GlobalSettingsRepository,
  ) {}

  public async execute(input: ContactInput, tenantId: number): Promise<void> {
    const contact = ContactRequest.fromInput(input);
    // Cada tenant recibe los mensajes de SU formulario en SU correo
    // (`contactEmail` de GlobalSettings); sin él, decide el EmailService.
    const settings = await this.globalSettingsRepository.find(tenantId);
    const recipient =
      settings.get('contactEmail') === '' ? undefined : settings.get('contactEmail');
    await this.emailService.sendContactEmail(contact, recipient);
  }
}
