import type { ClaimStatus, ConsumerClaim } from '../domain/ConsumerClaim';
import type { ConsumerClaimRepository } from '../domain/ConsumerClaimRepository';

export interface ListedClaim {
  readonly claim: ReturnType<ConsumerClaim['toPrimitives']>;
  // El panel ordena por urgencia sin recalcular el plazo.
  readonly isOverdue: boolean;
}

export class ManageConsumerClaimsUseCase {
  constructor(private readonly repository: ConsumerClaimRepository) {}

  public async list(
    tenantId: string,
    status: ClaimStatus | null = null,
    now = new Date(),
  ): Promise<ListedClaim[]> {
    const claims = await this.repository.listByStatus(tenantId, status);
    return claims.map((claim) => ({
      claim: claim.toPrimitives(),
      isOverdue: claim.isOverdue(now),
    }));
  }

  public async resolve(
    tenantId: string,
    id: string,
    status: 'aceptado' | 'rechazado',
    now = new Date(),
  ): Promise<void> {
    await this.repository.resolve(tenantId, id, status, now);
  }
}
