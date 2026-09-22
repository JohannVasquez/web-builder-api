import type { ConsentInput, ConsentRecord } from './Consent';

export interface ConsentOrigin {
  // Huella de la IP, no la IP: acredita el origen sin conservar el dato completo.
  readonly ipHash: string | null;
  readonly userAgent: string | null;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ConsentRepository {
  // Siempre inserta: un cambio de opinión es una fila nueva, nunca una edición.
  public abstract record(
    tenantId: string,
    input: ConsentInput,
    origin: ConsentOrigin,
  ): Promise<ConsentRecord>;

  // El último que dio ese visitante, sin importar la versión del texto: quien pregunta decide
  // si todavía sirve (ver `ConsentRecord.appliesTo`).
  public abstract findLatest(
    tenantId: string,
    subject: string,
  ): Promise<ConsentRecord | null>;
}
