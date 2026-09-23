import type { NewsletterSubscriber } from './NewsletterSchema';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class NewsletterRepository {
  // Idempotente: suscribirse dos veces con el mismo correo no crea dos filas ni falla.
  public abstract subscribe(tenantId: string, email: string): Promise<void>;
  public abstract list(
    tenantId: string,
    limit: number,
    offset: number,
  ): Promise<{ subscribers: NewsletterSubscriber[]; total: number }>;
}
