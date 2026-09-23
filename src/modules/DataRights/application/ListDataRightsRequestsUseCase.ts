import type { DataRightsRequest, RequestStatus } from '../domain/DataRightsRequest';
import type { DataRightsRepository } from '../domain/DataRightsRepository';

export interface ListedRequest {
  readonly request: ReturnType<DataRightsRequest['toPrimitives']>;
  // El panel tiene que poder ordenar por urgencia sin recalcular el plazo.
  readonly isOverdue: boolean;
}

export class ListDataRightsRequestsUseCase {
  constructor(private readonly repository: DataRightsRepository) {}

  public async execute(
    tenantId: string,
    status: RequestStatus | null = null,
    now = new Date(),
  ): Promise<ListedRequest[]> {
    const requests = await this.repository.listByStatus(tenantId, status);
    return requests.map((request) => ({
      request: request.toPrimitives(),
      isOverdue: request.isOverdue(now),
    }));
  }
}
