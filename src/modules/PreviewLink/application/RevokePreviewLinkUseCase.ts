import type { PreviewLinkRepository } from '../domain/PreviewLinkRepository';
import { PreviewLinkNotFoundError } from '../domain/errors';

export class RevokePreviewLinkUseCase {
  constructor(private readonly repository: PreviewLinkRepository) {}

  public async execute(tenantId: string, id: string): Promise<void> {
    const link = await this.repository.findById(tenantId, id);
    if (link === null) {
      throw new PreviewLinkNotFoundError();
    }
    await this.repository.revoke(id);
  }
}
