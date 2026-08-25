export interface AdminUserPrimitives {
  readonly id: number;
  readonly email: string;
  readonly name: string;
}

export class AdminUser {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly name: string,
    /** Nunca sale de este objeto hacia una respuesta HTTP; ver `toPrimitives`. */
    public readonly passwordHash: string,
  ) {}

  public toPrimitives(): AdminUserPrimitives {
    return { id: this.id, email: this.email, name: this.name };
  }
}
