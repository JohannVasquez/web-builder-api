import { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import { SignedDocument } from '../domain/SignedDocument';
import { SignedDocumentRepository } from '../domain/SignedDocumentRepository';

export class RegisterSignatureUseCase {
  constructor(
    private readonly repository: SignedDocumentRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  public async execute(
    tenantId: string,
    document: string,
    version: string,
    signedBy: string,
    adminId: string,
  ): Promise<SignedDocument> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Ese cliente no existe.');
    }

    const signature = await this.repository.record(tenantId, document, version, signedBy);

    await this.recordActivity.execute({
      tenantId,
      actorType: 'admin',
      actorId: adminId,
      actorName: 'Admin', // In real life we'd get this, but adminId is fine for now
      action: 'created',
      entityType: 'signed_document',
      entityId: signature.id,
      summary: `Registró firma de ${document} (${version}) por ${signedBy}`,
      after: { document, version, signedBy },
    });

    return signature;
  }
}
