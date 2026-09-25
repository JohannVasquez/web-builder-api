import type { PreviewLinkRepository } from '../domain/PreviewLinkRepository';
import { hashPreviewToken, looksLikePreviewToken } from '../domain/previewToken';
import {
  PreviewLinkExpiredError,
  PreviewLinkNotFoundError,
  PreviewLinkRevokedError,
} from '../domain/errors';

export interface ValidPreviewLink {
  readonly tenantId: string;
}

export class ValidatePreviewTokenUseCase {
  constructor(private readonly repository: PreviewLinkRepository) {}

  public async execute(token: string): Promise<ValidPreviewLink> {
    if (!looksLikePreviewToken(token)) {
      throw new PreviewLinkNotFoundError();
    }

    const hash = hashPreviewToken(token);
    const link = await this.repository.findByTokenHash(hash);

    if (link === null) {
      throw new PreviewLinkNotFoundError();
    }

    if (link.isRevoked()) {
      throw new PreviewLinkRevokedError();
    }

    if (link.isExpired()) {
      throw new PreviewLinkExpiredError();
    }

    return { tenantId: link.tenantId };
  }
}
