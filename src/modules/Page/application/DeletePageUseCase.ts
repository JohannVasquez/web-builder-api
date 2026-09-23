import type { PageRepository } from '../domain/PageRepository';

export class DeletePageUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(tenantId: string, id: string): Promise<void> {
    await this.pageRepository.delete(tenantId, id);
  }
}
