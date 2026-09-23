import type { ClaimStatus, ConsumerClaim, ConsumerClaimInput } from './ConsumerClaim';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ConsumerClaimRepository {
  public abstract create(
    tenantId: string,
    input: ConsumerClaimInput,
  ): Promise<ConsumerClaim>;
  public abstract listByStatus(
    tenantId: string,
    status: ClaimStatus | null,
  ): Promise<ConsumerClaim[]>;
  public abstract resolve(
    tenantId: string,
    id: string,
    status: ClaimStatus,
    at: Date,
  ): Promise<void>;
}
