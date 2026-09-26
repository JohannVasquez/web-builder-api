export class PreviewLink {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  public isExpired(): boolean {
    return this.expiresAt.getTime() <= Date.now();
  }

  public isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  public isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }
}
