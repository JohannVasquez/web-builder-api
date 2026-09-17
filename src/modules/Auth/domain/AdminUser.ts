export const ADMIN_ROLES = ['owner', 'editor', 'client'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// `owner` y `editor` son de la agencia: alcanzan a todos los clientes y pueden borrar.
// `client` es la persona dueña de un sitio: alcanza solo el suyo y no borra nada.
export const isStaffRole = (role: AdminRole): boolean => role !== 'client';

export interface AdminUserPrimitives {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly role: AdminRole;
  readonly disabled: boolean;
  // `null` = todos los clientes. Una lista vacía sería "ninguno", que es distinto.
  readonly tenantScope: readonly number[] | null;
}

export class AdminUser {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly name: string,
    // Nunca sale de este objeto hacia una respuesta HTTP; ver `toPrimitives`.
    public readonly passwordHash: string,
    public readonly role: AdminRole = 'owner',
    public readonly disabledAt: Date | null = null,
    private readonly tenantIds: readonly number[] = [],
  ) {}

  // Una persona de la agencia alcanza todo; una de un cliente, solo lo suyo.
  public tenantScope(): readonly number[] | null {
    return isStaffRole(this.role) ? null : this.tenantIds;
  }

  public isStaff(): boolean {
    return isStaffRole(this.role);
  }

  public isDisabled(): boolean {
    return this.disabledAt !== null;
  }

  public toPrimitives(): AdminUserPrimitives {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      disabled: this.isDisabled(),
      tenantScope: this.tenantScope(),
    };
  }
}
