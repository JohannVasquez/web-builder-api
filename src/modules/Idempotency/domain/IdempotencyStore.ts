export interface StoredResponse {
  readonly status: number;
  readonly body: unknown;
}

export type ClaimResult =
  | { readonly kind: 'claimed' }
  | { readonly kind: 'replay'; readonly response: StoredResponse }
  | { readonly kind: 'in-progress' }
  | { readonly kind: 'mismatch' };

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class IdempotencyStore {
  // Reserva la clave de forma atómica: si dos peticiones llegan a la vez, solo una la gana.
  public abstract claim(
    tenantId: string,
    scope: string,
    key: string,
    requestHash: string,
  ): Promise<ClaimResult>;
  public abstract complete(
    tenantId: string,
    scope: string,
    key: string,
    response: StoredResponse,
  ): Promise<void>;
  // Una operación que falló no dejó nada hecho: se suelta la clave para poder reintentar.
  public abstract release(tenantId: string, scope: string, key: string): Promise<void>;
}
