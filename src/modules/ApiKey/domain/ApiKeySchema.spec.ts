import { CreateApiKeySchema, expiryFromDays } from './ApiKeySchema';

describe('CreateApiKeySchema', () => {
  it('applies the documented defaults', () => {
    const result = CreateApiKeySchema.parse({ name: 'Agente MCP' });

    expect(result).toMatchObject({
      name: 'Agente MCP',
      permission: 'write',
      tenantIds: null,
      rateLimitPerMinute: 120,
      expiresInDays: 90,
    });
  });

  it('rejects an empty tenantIds list as a scope that reaches nobody', () => {
    expect(() => CreateApiKeySchema.parse({ name: 'x', tenantIds: [] })).toThrow();
  });

  it('accepts a null tenantIds as every tenant', () => {
    const result = CreateApiKeySchema.parse({ name: 'x', tenantIds: null });

    expect(result.tenantIds).toBeNull();
  });

  it('rejects an unknown permission', () => {
    expect(() => CreateApiKeySchema.parse({ name: 'x', permission: 'super' })).toThrow();
  });

  it('rejects an unknown field, being a strict object', () => {
    expect(() => CreateApiKeySchema.parse({ name: 'x', extra: true })).toThrow();
  });
});

describe('expiryFromDays', () => {
  it('returns null for a key that never expires', () => {
    expect(expiryFromDays(null)).toBeNull();
  });

  it('returns the date N days after now', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const expected = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    expect(expiryFromDays(90, now)).toEqual(expected);
  });
});
