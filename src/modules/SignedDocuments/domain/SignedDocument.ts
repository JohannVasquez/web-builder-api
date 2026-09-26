export class SignedDocument {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly document: string,
    public readonly version: string,
    public readonly signedBy: string,
    public readonly createdAt: Date,
  ) {}
}
