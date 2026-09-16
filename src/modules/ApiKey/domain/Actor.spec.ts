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
  const buildActor = (tenantScope: readonly number[] | null): Actor => ({
    type: 'apiKey',
    id: 1,
    name: 'Agente MCP',
    role: null,
    permission: 'read',
    tenantScope,
    rateLimitPerMinute: 120,
  });

  it('reaches any tenant when the scope is null', () => {
    const actor = buildActor(null);

    expect(actorReachesTenant(actor, 2)).toBe(true);
    expect(actorReachesTenant(actor, 9)).toBe(true);
  });

  it('reaches only the tenants listed in the scope', () => {
    const actor = buildActor([2, 5]);

    expect(actorReachesTenant(actor, 2)).toBe(true);
    expect(actorReachesTenant(actor, 5)).toBe(true);
    expect(actorReachesTenant(actor, 9)).toBe(false);
  });

  it('reaches nobody with an empty scope', () => {
    const actor = buildActor([]);

    expect(actorReachesTenant(actor, 1)).toBe(false);
  });
});
