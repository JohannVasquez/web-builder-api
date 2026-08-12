import type { ContactRequest } from './ContactRequest';

export interface EmailService {
  sendContactEmail(contact: ContactRequest): Promise<void>;
}
