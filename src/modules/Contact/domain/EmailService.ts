import type { ContactRequest } from './ContactRequest';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class EmailService {
  /**
   * Despacha el mensaje de contacto. `recipient` es el buzón del tenant
   * dueño del formulario; sin él, la implementación usa su destinatario
   * por defecto.
   */
  public abstract sendContactEmail(
    contact: ContactRequest,
    recipient?: string,
  ): Promise<void>;
}
