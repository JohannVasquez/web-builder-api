// Quien ejecuta una acción de administración: una persona del panel o una clave de agente.
export const PERMISSIONS = ['read', 'write', 'full'] as const;
export type Permission = (typeof PERMISSIONS)[number];

const RANK: Readonly<Record<Permission, number>> = { read: 0, write: 1, full: 2 };

export const permissionAllows = (granted: Permission, required: Permission): boolean =>
  RANK[granted] >= RANK[required];

export interface Actor {
  readonly type: 'admin' | 'apiKey';
  readonly id: number;
  readonly name: string;
  readonly permission: Permission;
  // `null` = todos los clientes. Una lista vacía sería "ninguno", que es distinto.
  readonly tenantScope: readonly number[] | null;
  // Viaja con el actor para no volver a consultar la base en cada petición.
  readonly rateLimitPerMinute: number | null;
}

export const actorReachesTenant = (actor: Actor, tenantId: number): boolean =>
  actor.tenantScope === null || actor.tenantScope.includes(tenantId);
