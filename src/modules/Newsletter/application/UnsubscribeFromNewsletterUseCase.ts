import { NewsletterRepository } from '../domain/NewsletterRepository';
import { isUnsubscribeToken } from '../domain/unsubscribeToken';

export class UnsubscribeFromNewsletterUseCase {
  constructor(private readonly repository: NewsletterRepository) {}

  /**
   * `false` solo si el token no existe. Darse de baja dos veces responde lo mismo: quien
   * vuelve a pinchar el enlace de un correo viejo no tiene por qué ver un error.
   */
  public async execute(token: string): Promise<boolean> {
    if (!isUnsubscribeToken(token)) {
      return false;
    }
    return this.repository.unsubscribe(token);
  }
}
