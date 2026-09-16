export interface ContactMessagePrimitives {
  readonly id: number;
  readonly tenantId: number;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly message: string;
  readonly emailedAt: string | null;
  readonly emailError: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export interface ContactMessageQuery {
  readonly tenantId: number;
  readonly unreadOnly: boolean;
  readonly limit: number;
  readonly offset: number;
}
