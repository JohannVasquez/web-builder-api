import { ContactMessageRepository } from '../domain/ContactMessageRepository';
import type { ContactMessagePrimitives } from '../domain/ContactMessage';
import { NotFoundError } from '../../../shared/domain/NotFoundError';

export class MarkContactMessageReadUseCase {
  constructor(private readonly repository: ContactMessageRepository) {}

  public async execute(
    tenantId: number,
    id: number,
    read: boolean,
  ): Promise<ContactMessagePrimitives> {
    const updated = await this.repository.markRead(tenantId, id, read);
    if (updated === null) {
      throw new NotFoundError(`No existe el mensaje ${id} en este cliente.`);
    }
    return updated;
  }
}
