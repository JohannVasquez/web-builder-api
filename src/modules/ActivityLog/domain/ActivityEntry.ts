export interface ActivityEntryInput {
  readonly tenantId: string | null;
  readonly actorType: 'admin' | 'apiKey';
  readonly actorId: string | null;
  readonly actorName: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly summary: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

export interface ActivityEntry extends ActivityEntryInput {
  readonly id: string;
  readonly createdAt: string;
}

export interface ActivityQuery {
  readonly tenantId?: string;
  readonly actorType?: 'admin' | 'apiKey';
  readonly actorId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit: number;
  readonly offset: number;
}
