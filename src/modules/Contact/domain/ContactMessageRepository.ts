import type { ContactMessagePrimitives, ContactMessageQuery } from './ContactMessage';
import type { ContactRequest } from './ContactRequest';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ContactMessageRepository {
  public abstract save(
    tenantId: string,
    request: ContactRequest,
  ): Promise<ContactMessagePrimitives>;
  public abstract markEmailed(id: string, error: string | null): Promise<void>;
  public abstract markRead(
    tenantId: string,
    id: string,
    read: boolean,
  ): Promise<ContactMessagePrimitives | null>;
  public abstract search(
    query: ContactMessageQuery,
  ): Promise<{ messages: ContactMessagePrimitives[]; total: number }>;
}
