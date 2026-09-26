import { actorReachesTenant, permissionAllows, type Actor } from './Actor';

describe('permissionAllows', () => {
  it('lets full satisfy read, write and full', () => {
    expect(permissionAllows('full', 'read')).toBe(true);
    expect(permissionAllows('full', 'write')).toBe(true);
    expect(permissionAllows('full', 'full')).toBe(true);
  });

  it('lets write satisfy read and write but not full', () => {
    expect(permissionAllows('write', 'read')).toBe(true);
    expect(permissionAllows('write', 'write')).toBe(true);
    expect(permissionAllows('write', 'full')).toBe(false);
  });

  it('lets read satisfy only read', () => {
    expect(permissionAllows('read', 'read')).toBe(true);
    expect(permissionAllows('read', 'write')).toBe(false);
    expect(permissionAllows('read', 'full')).toBe(false);
  });
});

describe('actorReachesTenant', () => {
  const buildActor = (tenantScope: readonly string[] | null): Actor => ({
    type: 'apiKey',
    id: '018f6f1a-0000-7000-8000-000000000001',
    name: 'Agente MCP',
    role: null,
    permission: 'read',
    tenantScope,
    rateLimitPerMinute: 120,
  });

  it('reaches any tenant when the scope is null', () => {
    const actor = buildActor(null);

    expect(actorReachesTenant(actor, '018f6f1a-0000-7000-8000-000000000002')).toBe(true);
    expect(actorReachesTenant(actor, '018f6f1a-0000-7000-8000-000000000009')).toBe(true);
  });

  it('reaches only the tenants listed in the scope', () => {
    const actor = buildActor([
      '018f6f1a-0000-7000-8000-000000000002',
      '018f6f1a-0000-7000-8000-000000000005',
    ]);

    expect(actorReachesTenant(actor, '018f6f1a-0000-7000-8000-000000000002')).toBe(true);
    expect(actorReachesTenant(actor, '018f6f1a-0000-7000-8000-000000000005')).toBe(true);
    expect(actorReachesTenant(actor, '018f6f1a-0000-7000-8000-000000000009')).toBe(false);
  });

  it('reaches nobody with an empty scope', () => {
    const actor = buildActor([]);

    expect(actorReachesTenant(actor, '018f6f1a-0000-7000-8000-000000000001')).toBe(false);
  });
});
