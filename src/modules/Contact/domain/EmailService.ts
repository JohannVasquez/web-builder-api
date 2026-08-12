import type { ContactRequest } from './ContactRequest';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class EmailService {
  public abstract sendContactEmail(contact: ContactRequest): Promise<void>;
}
