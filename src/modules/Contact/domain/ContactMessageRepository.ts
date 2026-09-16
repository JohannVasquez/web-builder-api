import type { ContactMessagePrimitives, ContactMessageQuery } from './ContactMessage';
import type { ContactRequest } from './ContactRequest';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ContactMessageRepository {
  public abstract save(
    tenantId: number,
    request: ContactRequest,
  ): Promise<ContactMessagePrimitives>;
  public abstract markEmailed(id: number, error: string | null): Promise<void>;
  public abstract markRead(
    tenantId: number,
    id: number,
    read: boolean,
  ): Promise<ContactMessagePrimitives | null>;
  public abstract search(
    query: ContactMessageQuery,
  ): Promise<{ messages: ContactMessagePrimitives[]; total: number }>;
}
