import type { PreviewLink } from './PreviewLink';

export abstract class PreviewLinkRepository {
  public abstract create(
    tenantId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PreviewLink>;

  public abstract findByTokenHash(tokenHash: string): Promise<PreviewLink | null>;

  public abstract revoke(id: string): Promise<void>;
  
  public abstract findById(tenantId: string, id: string): Promise<PreviewLink | null>;
}
