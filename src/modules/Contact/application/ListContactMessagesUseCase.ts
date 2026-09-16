import { ContactMessageRepository } from '../domain/ContactMessageRepository';
import type {
  ContactMessagePrimitives,
  ContactMessageQuery,
} from '../domain/ContactMessage';

export class ListContactMessagesUseCase {
  constructor(private readonly repository: ContactMessageRepository) {}

  public async execute(
    query: ContactMessageQuery,
  ): Promise<{ messages: ContactMessagePrimitives[]; total: number }> {
    return this.repository.search(query);
  }
}
