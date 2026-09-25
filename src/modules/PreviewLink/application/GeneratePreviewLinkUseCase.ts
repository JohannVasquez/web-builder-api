import type { PreviewLinkRepository } from '../domain/PreviewLinkRepository';
import { generatePreviewToken } from '../domain/previewToken';

export interface GeneratePreviewLinkInput {
  // Plazo opcional. Por omisión: 7 días (suficiente para que un cliente revise sin apuro, pero no quede abierto para siempre).
  readonly expiresInDays?: number;
}

export interface GeneratedPreviewLinkSummary {
  readonly id: string;
  readonly token: string;
  readonly expiresAt: string;
}

export class GeneratePreviewLinkUseCase {
  constructor(private readonly repository: PreviewLinkRepository) {}

  public async execute(
    tenantId: string,
    input: GeneratePreviewLinkInput,
  ): Promise<GeneratedPreviewLinkSummary> {
    const days = input.expiresInDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { token, hash } = generatePreviewToken();

    const link = await this.repository.create(tenantId, hash, expiresAt);

    return {
      id: link.id,
      token, // Solo se devuelve al generarlo.
      expiresAt: link.expiresAt.toISOString(),
    };
  }
}
