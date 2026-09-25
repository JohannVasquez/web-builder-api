import { SignedDocument } from './SignedDocument';

export abstract class SignedDocumentRepository {
  public abstract record(tenantId: string, document: string, version: string, signedBy: string): Promise<SignedDocument>;
  public abstract findByTenant(tenantId: string): Promise<SignedDocument[]>;
  public abstract findTenantsNotOnVersion(document: string, currentVersion: string): Promise<string[]>;
}
