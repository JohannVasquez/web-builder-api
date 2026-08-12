import { ContactRequest } from '../domain/ContactRequest';
import type { ContactInput } from '../domain/ContactSchema';
import type { EmailService } from '../domain/EmailService';

export class SendContactEmailUseCase {
  constructor(private readonly emailService: EmailService) {}

  public async execute(input: ContactInput): Promise<void> {
    const contact = ContactRequest.fromInput(input);
    await this.emailService.sendContactEmail(contact);
  }
}
