import { ChangeRoleSchema, InviteAdminUserSchema } from './AdminUserSchema';

describe('AdminUserSchema', () => {
  it('exige al menos un cliente para el rol cliente', () => {
    const invite = InviteAdminUserSchema.safeParse({
      email: 'ana@pasteleria.cl',
      name: 'Ana',
      role: 'client',
      tenantIds: [],
    });

    expect(invite.success).toBe(false);
  });

  it('no exige clientes para los roles de la agencia', () => {
    const invite = InviteAdminUserSchema.safeParse({
      email: 'pau@webbuilder.co',
      name: 'Pau',
      role: 'editor',
    });

    expect(invite.success).toBe(true);
  });

  it('acepta el rol cliente con su alcance', () => {
    const change = ChangeRoleSchema.safeParse({ role: 'client', tenantIds: [40] });

    expect(change.success).toBe(true);
  });
});
