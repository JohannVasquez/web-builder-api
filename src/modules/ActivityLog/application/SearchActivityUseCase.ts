import { ActivityLogRepository } from '../domain/ActivityLogRepository';
import type { ActivityEntry, ActivityQuery } from '../domain/ActivityEntry';

export class SearchActivityUseCase {
  constructor(private readonly repository: ActivityLogRepository) {}

  public async execute(
    query: ActivityQuery,
  ): Promise<{ entries: ActivityEntry[]; total: number }> {
    return this.repository.search(query);
  }
}
