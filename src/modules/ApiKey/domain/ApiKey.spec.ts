import { ApiKey } from './ApiKey';

describe('ApiKey', () => {
  const buildApiKey = (
    overrides: {
      revokedAt?: Date | null;
      expiresAt?: Date | null;
      scopeAllTenants?: boolean;
      tenantIds?: readonly number[];
    } = {},
  ): ApiKey =>
    new ApiKey(
      1,
      'Agente MCP',
      'abcdef',
      'write',
      overrides.scopeAllTenants ?? true,
      overrides.tenantIds ?? [],
      120,
      1,
      overrides.expiresAt ?? null,
      null,
      overrides.revokedAt ?? null,
      new Date('2024-01-01T00:00:00.000Z'),
    );

  describe('status', () => {
    it('is active without revokedAt nor expiresAt', () => {
      expect(buildApiKey().status()).toBe('active');
    });

    it('is revoked when revokedAt is set, even if also expired', () => {
      const apiKey = buildApiKey({
        revokedAt: new Date('2024-01-02T00:00:00.000Z'),
        expiresAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      expect(apiKey.status(new Date('2024-06-01T00:00:00.000Z'))).toBe('revoked');
    });

    it('is expired once expiresAt is in the past', () => {
      const apiKey = buildApiKey({ expiresAt: new Date('2024-01-01T00:00:00.000Z') });

      expect(apiKey.status(new Date('2024-06-01T00:00:00.000Z'))).toBe('expired');
    });

    it('treats a key expiring exactly now as expired', () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      const apiKey = buildApiKey({ expiresAt: now });

      expect(apiKey.status(now)).toBe('expired');
    });
  });

  describe('scope', () => {
    it('returns null when it reaches every tenant', () => {
      const apiKey = buildApiKey({ scopeAllTenants: true, tenantIds: [1, 2] });

      expect(apiKey.scope()).toBeNull();
    });

    it('returns the tenant list when limited', () => {
      const apiKey = buildApiKey({ scopeAllTenants: false, tenantIds: [1, 2] });

      expect(apiKey.scope()).toEqual([1, 2]);
    });
  });

  describe('toPrimitives', () => {
    it('never exposes a hash or the raw token', () => {
      const result = buildApiKey().toPrimitives();
      const keys = Object.keys(result);

      expect(keys).not.toContain('keyHash');
      expect(keys).not.toContain('hash');
      expect(keys).not.toContain('token');
    });
  });
});
