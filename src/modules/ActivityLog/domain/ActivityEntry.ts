export interface ActivityEntryInput {
  readonly tenantId: number | null;
  readonly actorType: 'admin' | 'apiKey';
  readonly actorId: number | null;
  readonly actorName: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly summary: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

export interface ActivityEntry extends ActivityEntryInput {
  readonly id: number;
  readonly createdAt: string;
}

export interface ActivityQuery {
  readonly tenantId?: number;
  readonly actorType?: 'admin' | 'apiKey';
  readonly actorId?: number;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit: number;
  readonly offset: number;
}
