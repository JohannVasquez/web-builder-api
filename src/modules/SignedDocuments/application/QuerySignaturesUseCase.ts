import { NotFoundError } from '@/shared/domain/NotFoundError';
import { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import { SignedDocument } from '../domain/SignedDocument';
import { SignedDocumentRepository } from '../domain/SignedDocumentRepository';

export class QuerySignaturesUseCase {
  constructor(
    private readonly repository: SignedDocumentRepository,
    private readonly tenantRepository: TenantRepository,
  ) {}

  public async forTenant(tenantId: string): Promise<SignedDocument[]> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Ese cliente no existe.');
    }
    return this.repository.findByTenant(tenantId);
  }

  public async tenantsNotOnVersion(document: string, currentVersion: string): Promise<string[]> {
    return this.repository.findTenantsNotOnVersion(document, currentVersion);
  }
}
