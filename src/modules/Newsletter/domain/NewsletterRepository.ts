import type { NewsletterSubscriber } from './NewsletterSchema';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class NewsletterRepository {
  // Idempotente: suscribirse dos veces con el mismo correo no crea dos filas ni falla.
  // Devuelve el token de baja, que es lo que el correo comercial tiene que enlazar.
  public abstract subscribe(tenantId: string, email: string): Promise<string>;
  /**
   * También idempotente: darse de baja dos veces responde lo mismo. Devuelve `false` solo si
   * el token no existe.
   *
   * No lleva `tenantId`: el enlace que llega por correo no sabe de tenants, y el token ya es
   * único en toda la plataforma.
   */
  public abstract unsubscribe(token: string): Promise<boolean>;
  public abstract list(
    tenantId: string,
    limit: number,
    offset: number,
  ): Promise<{ subscribers: NewsletterSubscriber[]; total: number }>;
}
