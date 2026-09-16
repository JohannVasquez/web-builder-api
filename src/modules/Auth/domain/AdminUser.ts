export const ADMIN_ROLES = ['owner', 'editor'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AdminUserPrimitives {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly role: AdminRole;
  readonly disabled: boolean;
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
  ) {}

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
    };
  }
}
