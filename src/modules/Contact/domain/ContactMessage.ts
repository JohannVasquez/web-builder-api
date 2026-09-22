export interface ContactMessagePrimitives {
  readonly id: string;
  readonly tenantId: string;
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
  readonly tenantId: string;
  readonly unreadOnly: boolean;
  readonly limit: number;
  readonly offset: number;
}
